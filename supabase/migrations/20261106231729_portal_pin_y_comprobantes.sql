begin;

create schema if not exists kaupaloki_private;

create table kaupaloki_private.portal_links (
  token uuid primary key default gen_random_uuid(),
  client_id text not null,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  blocked_until timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);

alter table kaupaloki_private.portal_links enable row level security;
revoke all on kaupaloki_private.portal_links from public, anon, authenticated;

create function kaupaloki_private.staff_role() returns text
language sql stable security definer set search_path = ''
as $$
  select p.role::text from public.profiles p where p.id = (select auth.uid())
    and p.role in ('administrador', 'super_admin', 'operador', 'dispersor')
    and coalesce(lower(p.status::text), '') not in ('inactivo', 'inactive', 'invitado', 'invited');
$$;

grant usage on schema kaupaloki_private to authenticated;
revoke all on function kaupaloki_private.staff_role() from public;
grant execute on function kaupaloki_private.staff_role() to authenticated;

-- Public clients use the PIN-checked endpoint instead of reading raw dashboard tables.
do $$
declare
  t text;
  write_roles text;
begin
  foreach t in array array['clientes','negocios','dispersiones','efectivo'] loop
    execute format('revoke select on public.%I from public, anon', t);
    if not (select relrowsecurity from pg_class where oid = to_regclass('public.' || t)) then
      write_roles := case t
        when 'clientes' then '(''administrador'',''super_admin'',''operador'',''dispersor'')'
        when 'negocios' then '(''administrador'',''super_admin'',''operador'')'
        when 'dispersiones' then '(''administrador'',''super_admin'',''dispersor'')'
        else '(''administrador'',''super_admin'')'
      end;
      execute format('create policy portal_staff_insert on public.%I for insert to authenticated with check ((select kaupaloki_private.staff_role()) in %s)', t, write_roles);
      if t = 'negocios' then
        execute format('create policy portal_staff_update on public.negocios for update to authenticated using ((select kaupaloki_private.staff_role()) in %s) with check ((select kaupaloki_private.staff_role()) in %s)', write_roles, write_roles);
      end if;
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy portal_staff_read on public.%I for select to authenticated using ((select kaupaloki_private.staff_role()) is not null)', t);
    execute format('create policy portal_staff_read_only on public.%I as restrictive for select to authenticated using ((select kaupaloki_private.staff_role()) is not null)', t);
    execute format('create policy portal_no_anon_read on public.%I as restrictive for select to anon using (false)', t);
  end loop;
  if to_regclass('public.client_shared_links') is not null then
    execute 'revoke select on public.client_shared_links from public, anon, authenticated';
  end if;
end;
$$;

create function public.crear_enlace_cliente(p_client_id text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  share_token uuid := gen_random_uuid();
  share_pin text;
  random_hex text := replace(gen_random_uuid()::text, '-', '');
begin
  if kaupaloki_private.staff_role() is null then raise insufficient_privilege; end if;
  if not exists (select 1 from public.clientes c where c.id::text = p_client_id) then
    raise foreign_key_violation;
  end if;
  share_pin := lpad(((('x' || substr(random_hex, 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0');
  insert into kaupaloki_private.portal_links(token, client_id, pin_hash)
  values (share_token, p_client_id, encode(sha256(convert_to(share_token::text || ':' || share_pin, 'UTF8')), 'hex'));
  return jsonb_build_object('token', share_token, 'pin', share_pin);
end;
$$;

create function public.abrir_portal_cliente(p_token uuid, p_pin text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  link kaupaloki_private.portal_links%rowtype;
  cliente public.clientes%rowtype;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then return null; end if;
  select * into link from kaupaloki_private.portal_links where token = p_token for update;
  if not found or link.expires_at <= now() or link.blocked_until > now() then return null; end if;
  if link.pin_hash <> encode(sha256(convert_to(p_token::text || ':' || p_pin, 'UTF8')), 'hex') then
    update kaupaloki_private.portal_links
    set failed_attempts = link.failed_attempts + 1,
        blocked_until = case when (link.failed_attempts + 1) % 5 = 0 then now() + interval '15 minutes' else null end,
        expires_at = case when link.failed_attempts >= 19 then now() else link.expires_at end
    where token = p_token;
    return null;
  end if;

  if link.failed_attempts > 0 or link.blocked_until is not null then
    update kaupaloki_private.portal_links set failed_attempts = 0, blocked_until = null where token = p_token;
  end if;
  select * into cliente from public.clientes c where c.id::text = link.client_id;
  if not found then return null; end if;

  return jsonb_build_object(
    'client', jsonb_build_object('codigo', cliente.codigo, 'nombre', cliente.nombre, 'pais', cliente.pais,
      'saldoPendienteCOP', cliente.saldo_cop, 'totalIngresosCOP', cliente.ingresos_cop,
      'totalDispersadoCOP', cliente.pagado_cop, 'estado', cliente.estado),
    'negocios', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'codigo', n.codigo, 'fecha', n.fecha,
        'divisaCodigo', n.divisa_codigo, 'montoDivisa', n.monto_divisa, 'tasaCambio', coalesce(n.tasa_cliente_cop, n.tasa),
        'ingresoCOP', n.ingreso_cop, 'estado', n.estado) order by n.fecha desc)
      from public.negocios n where n.cliente_id::text = link.client_id or (n.cliente_id is null and n.cliente_codigo = cliente.codigo)
    ), '[]'::jsonb),
    'dispersiones', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'codigo', d.codigo, 'fecha', d.fecha,
        'origenFondos', d.origen_fondos, 'monto', coalesce(d.monto_cop, d.monto), 'referencia', d.referencia,
        'comprobanteUrl', case when d.comprobante_url ~ '^https?://' then d.comprobante_url end))
      from public.dispersiones d where d.cliente_id::text = link.client_id or (d.cliente_id is null and d.cliente_codigo = cliente.codigo)
    ), '[]'::jsonb),
    'efectivo', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'codigo', e.codigo, 'fecha', e.fecha,
        'tipo', case when upper(e.tipo::text) = 'INGRESO' then 'Ingreso' else 'Pago' end,
        'origenFondos', e.origen_fondos, 'monto', e.monto, 'referencia', e.referencia))
      from public.efectivo e where e.cliente_id::text = link.client_id or (e.cliente_id is null and e.cliente_codigo = cliente.codigo)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.crear_enlace_cliente(text) from public, anon, authenticated;
grant execute on function public.crear_enlace_cliente(text) to authenticated;
revoke all on function public.abrir_portal_cliente(uuid, text) from public, anon, authenticated;
grant execute on function public.abrir_portal_cliente(uuid, text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy comprobantes_staff_read on storage.objects for select to authenticated using (
  bucket_id = 'comprobantes' and (
    (select kaupaloki_private.staff_role()) in ('administrador', 'super_admin')
    or ((select kaupaloki_private.staff_role()) = 'dispersor' and split_part(name, '/', 1) = 'dispersiones')
  )
);

create policy comprobantes_staff_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'comprobantes' and split_part(name, '/', 2) = (select auth.uid())::text and (
    (split_part(name, '/', 1) in ('gastos','dispersiones') and (select kaupaloki_private.staff_role()) in ('administrador','super_admin'))
    or (split_part(name, '/', 1) = 'dispersiones' and (select kaupaloki_private.staff_role()) = 'dispersor')
  )
);

create policy comprobantes_no_anon_read on storage.objects as restrictive for select to anon using (bucket_id <> 'comprobantes');
create policy comprobantes_only_staff_read on storage.objects as restrictive for select to authenticated using (
  bucket_id <> 'comprobantes' or (
    (select kaupaloki_private.staff_role()) in ('administrador', 'super_admin')
    or ((select kaupaloki_private.staff_role()) = 'dispersor' and split_part(name, '/', 1) = 'dispersiones')
  )
);

create policy comprobantes_only_staff_upload on storage.objects as restrictive for insert to authenticated with check (
  bucket_id <> 'comprobantes' or (
    split_part(name, '/', 2) = (select auth.uid())::text and (
      (split_part(name, '/', 1) in ('gastos','dispersiones') and (select kaupaloki_private.staff_role()) in ('administrador','super_admin'))
      or (split_part(name, '/', 1) = 'dispersiones' and (select kaupaloki_private.staff_role()) = 'dispersor')
    )
  )
);

create function public.adjuntar_comprobante_gasto(p_id text, p_receipt text) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(kaupaloki_private.staff_role(), '') not in ('administrador', 'super_admin') then
    raise insufficient_privilege;
  end if;
  if p_receipt is null or split_part(p_receipt, '/', 1) <> 'storage:gastos'
     or split_part(p_receipt, '/', 2) <> auth.uid()::text
     or not exists (
       select 1 from storage.objects where bucket_id = 'comprobantes' and name = substr(p_receipt, 9)
     ) then
    return false;
  end if;
  update public.gastos set comprobante_url = p_receipt
  where id::text = p_id and nullif(btrim(comprobante_url), '') is null;
  return found;
end;
$$;

revoke all on function public.adjuntar_comprobante_gasto(text, text) from public, anon, authenticated;
grant execute on function public.adjuntar_comprobante_gasto(text, text) to authenticated;

drop function public.cuentas_para_dispersion();
create function public.cuentas_para_dispersion()
returns table (id text, activo text, institucion text, divisa text, "saldoReal" numeric)
language sql stable security definer set search_path = ''
as $$
  select a.id::text, a.activo::text, a.institucion::text, a.divisa::text, coalesce(a.saldo_real, a.saldo_cop)::numeric
  from public.activos_liquidos a
  where (select kaupaloki_private.staff_role()) in ('administrador', 'super_admin', 'dispersor')
  order by a.activo;
$$;
revoke all on function public.cuentas_para_dispersion() from public, anon, authenticated;
grant execute on function public.cuentas_para_dispersion() to authenticated;

commit;
