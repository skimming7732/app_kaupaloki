begin;

create index if not exists portal_links_client_expiry_idx
on kaupaloki_private.portal_links(client_id, expires_at desc);

-- Existing PINs are stored as hashes. Recovery is limited to staff and the latest active link.
create function public.obtener_enlace_cliente(p_client_id text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  link kaupaloki_private.portal_links%rowtype;
  pin text;
begin
  if kaupaloki_private.staff_role() is null then raise insufficient_privilege; end if;
  select * into link from kaupaloki_private.portal_links
  where client_id=p_client_id and expires_at>now()
  order by expires_at desc, token desc limit 1;
  if not found then return null; end if;
  select lpad(candidate::text,4,'0') into pin
  from generate_series(0,9999) as candidate
  where encode(sha256(convert_to(link.token::text || ':' || lpad(candidate::text,4,'0'),'UTF8')),'hex')=link.pin_hash
  limit 1;
  if pin is null then return null; end if;
  return jsonb_build_object('token',link.token,'pin',pin,'expiresAt',link.expires_at);
end;
$$;

create or replace function public.crear_enlace_cliente(p_client_id text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  share_token uuid := gen_random_uuid();
  share_pin text;
  random_hex text := replace(gen_random_uuid()::text, '-', '');
  existing jsonb;
  expiry timestamptz;
begin
  if kaupaloki_private.staff_role() is null then raise insufficient_privilege; end if;
  if not exists (select 1 from public.clientes c where c.id::text = p_client_id) then
    raise foreign_key_violation;
  end if;
  perform pg_advisory_xact_lock(814637, hashtext(p_client_id));
  existing := public.obtener_enlace_cliente(p_client_id);
  if existing is not null then return existing; end if;
  share_pin := lpad(((('x' || substr(random_hex, 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0');
  insert into kaupaloki_private.portal_links(token, client_id, pin_hash)
  values (share_token, p_client_id, encode(sha256(convert_to(share_token::text || ':' || share_pin, 'UTF8')), 'hex'))
  returning expires_at into expiry;
  return jsonb_build_object('token', share_token, 'pin', share_pin, 'expiresAt', expiry);
end;
$$;

create function public.listar_comisionistas_dashboard() returns setof public.comisionistas
language sql stable security invoker set search_path = ''
as $$
  select * from public.comisionistas
  where (select kaupaloki_private.staff_role()) in ('administrador','super_admin')
  order by fecha_creacion desc nulls last, id;
$$;

revoke all on function public.obtener_enlace_cliente(text), public.listar_comisionistas_dashboard() from public, anon, authenticated;
grant execute on function public.obtener_enlace_cliente(text), public.listar_comisionistas_dashboard() to authenticated;


revoke update on public.gastos, public.dispersiones from authenticated;
grant update (concepto, categoria, divisa, monto, origen_fondos, origen_fondos_id, fecha) on public.gastos to authenticated;
grant update (cliente_id, cliente_codigo, cliente_nombre, monto, monto_cop, origen_fondos, origen_fondos_id, fecha, referencia)
  on public.dispersiones to authenticated;
create policy gastos_admin_update on public.gastos for update to authenticated
  using ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'))
  with check ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'));
create policy dispersiones_staff_update on public.dispersiones for update to authenticated
  using ((select kaupaloki_private.staff_role()) in ('administrador','super_admin','dispersor'))
  with check ((select kaupaloki_private.staff_role()) in ('administrador','super_admin','dispersor'));

create function public.guardar_comprobante_dashboard(p_table text,p_id uuid,p_receipt text,p_previous text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor text := coalesce(kaupaloki_private.staff_role(),'');
  changed integer;
begin
  if p_table is null or p_table not in ('gastos','dispersiones') then raise invalid_parameter_value; end if;
  if actor not in ('administrador','super_admin') and not (p_table='dispersiones' and actor='dispersor') then
    raise insufficient_privilege;
  end if;
  if p_receipt is null or split_part(p_receipt,'/',1) <> 'storage:' || p_table
    or split_part(p_receipt,'/',2) <> auth.uid()::text
    or not exists (select 1 from storage.objects where bucket_id='comprobantes' and name=substr(p_receipt,9))
  then raise exception 'Archivo no disponible' using errcode='22023'; end if;
  execute format('update public.%I set comprobante_url=$1%s where id=$2 and (nullif(btrim(comprobante_url),'''' ) is not distinct from nullif(btrim($3),'''') or comprobante_url=$1)',
    p_table, case when p_table='dispersiones' then ', tiene_comprobante=true' else '' end)
    using p_receipt,p_id,p_previous;
  get diagnostics changed = row_count;
  if changed = 0 then raise exception 'El comprobante cambió' using errcode='40001'; end if;
end;
$$;
revoke all on function public.guardar_comprobante_dashboard(text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.guardar_comprobante_dashboard(text,uuid,text,text) to authenticated;

commit;
