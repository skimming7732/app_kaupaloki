begin;

-- The aggregate trigger reads and updates several tables as part of one write.
alter function public.fn_recalculate_financial_aggregates() security definer set search_path = '';
revoke all on function public.fn_recalculate_financial_aggregates() from public, anon, authenticated;

do $$
declare
  t text;
  can_read text;
begin
  foreach t in array array['divisas','compras_usdt','ventas_usdt','activos_liquidos','activos_digitales','gastos','resumen_liquidacion'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon',t);
    can_read := case when t='divisas' then '(select kaupaloki_private.staff_role()) is not null'
      else '(select kaupaloki_private.staff_role()) in (''administrador'',''super_admin'')' end;
    execute format('create policy dashboard_staff_read on public.%I for select to authenticated using (%s)',t,can_read);
    execute format('create policy dashboard_staff_only on public.%I as restrictive for select to authenticated using (%s)',t,can_read);
  end loop;
end;
$$;

create policy gastos_admin_insert on public.gastos for insert to authenticated
  with check ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'));
create policy comisionistas_admin_only on public.comisionistas as restrictive for all to authenticated
  using ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'))
  with check ((select kaupaloki_private.staff_role()) in ('administrador','super_admin'));
alter table public._nc_m2m_negocios_divisas enable row level security;
revoke all on public._nc_m2m_negocios_divisas from public, anon, authenticated;
revoke all on public.client_shared_links from public, anon, authenticated;

-- Staff may read their own authentication settings. The directory omits MFA secrets.
revoke all on public.profiles from public, anon;
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, pais, updated_at, two_factor_secret, two_factor_enabled, two_factor_backup_codes) on public.profiles to authenticated;
create policy profiles_own_access_only on public.profiles as restrictive for select to authenticated using (id = (select auth.uid()));
create policy profiles_own_update_only on public.profiles as restrictive for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function kaupaloki_private.puede_operar_divisa(p_code text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(kaupaloki_private.staff_role(), '') <> 'operador' or exists (
    select 1 from public.profiles p where p.id=(select auth.uid())
      and (coalesce(to_jsonb(p.authorized_currencies), '[]'::jsonb) = '[]'::jsonb
           or to_jsonb(p.authorized_currencies) ? p_code)
  );
$$;
revoke all on function kaupaloki_private.puede_operar_divisa(text) from public, anon;
grant execute on function kaupaloki_private.puede_operar_divisa(text) to authenticated;
create policy negocios_divisa_select on public.negocios as restrictive for select to authenticated
  using (kaupaloki_private.puede_operar_divisa(divisa_codigo));
create policy negocios_divisa_insert on public.negocios as restrictive for insert to authenticated
  with check (kaupaloki_private.puede_operar_divisa(divisa_codigo));
create policy negocios_divisa_update on public.negocios as restrictive for update to authenticated
  using (kaupaloki_private.puede_operar_divisa(divisa_codigo))
  with check (kaupaloki_private.puede_operar_divisa(divisa_codigo));

create function public.listar_perfiles_dashboard() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(d) order by d.full_name), '[]'::jsonb)
  from (select id,email,full_name,role,pais,operator_code,status,authorized_currencies,created_by,created_by_name,created_at_audit
        from public.profiles
        where (select kaupaloki_private.staff_role()) in ('administrador','super_admin')) d;
$$;

create function public.actualizar_perfil_dashboard(p_id uuid, p_changes jsonb) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare actor text := kaupaloki_private.staff_role();
  changes public.profiles%rowtype;
begin
  if coalesce(actor,'') not in ('administrador','super_admin') then raise insufficient_privilege; end if;
  changes := jsonb_populate_record(null::public.profiles,p_changes);
  if changes.role is not null and changes.role not in ('administrador','super_admin','operador','dispersor') then
    raise invalid_parameter_value;
  end if;
  if changes.status is not null and changes.status not in ('activo','invitado','inactivo') then raise invalid_parameter_value; end if;
  if actor <> 'super_admin' and changes.role = 'super_admin' then raise insufficient_privilege; end if;
  update public.profiles
  set full_name=coalesce(changes.full_name,full_name), pais=coalesce(changes.pais,pais),
      role=coalesce(changes.role,role), status=coalesce(changes.status,status),
      authorized_currencies=coalesce(changes.authorized_currencies,authorized_currencies)
  where id=p_id and (actor='super_admin' or (role <> 'super_admin' and not coalesce(is_super_admin,false)));
  return found;
end;
$$;

create function public.eliminar_perfil_dashboard(p_id uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(kaupaloki_private.staff_role(),'') not in ('administrador','super_admin') then raise insufficient_privilege; end if;
  delete from public.profiles where id=p_id and id <> auth.uid() and role <> 'super_admin' and not coalesce(is_super_admin,false);
  return found;
end;
$$;

create function public.guardar_comprobante_dispersion(p_id text,p_receipt text,p_previous text) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if coalesce(kaupaloki_private.staff_role(),'') not in ('administrador','super_admin','dispersor') then raise insufficient_privilege; end if;
  if p_receipt is null or split_part(p_receipt,'/',1) <> 'storage:dispersiones'
    or split_part(p_receipt,'/',2) <> auth.uid()::text
    or not exists (select 1 from storage.objects where bucket_id='comprobantes' and name=substr(p_receipt,9))
  then return false; end if;
  update public.dispersiones set comprobante_url=p_receipt,tiene_comprobante=true
  where id::text=p_id and nullif(btrim(comprobante_url),'') is not distinct from nullif(btrim(p_previous),'');
  return found;
end;
$$;

revoke all on function public.listar_perfiles_dashboard(), public.actualizar_perfil_dashboard(uuid,jsonb), public.eliminar_perfil_dashboard(uuid), public.guardar_comprobante_dispersion(text,text,text) from public, anon;
grant execute on function public.listar_perfiles_dashboard(), public.actualizar_perfil_dashboard(uuid,jsonb), public.eliminar_perfil_dashboard(uuid), public.guardar_comprobante_dispersion(text,text,text) to authenticated;

-- The current negocios schema uses divisa_codigo. Its former trigger referenced a removed column.
create or replace function public.trg_negocios_auto_fill() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.id := coalesce(new.id, gen_random_uuid());
  new.fecha := coalesce(new.fecha, current_date);
  if new.numero is null or new.numero <= 0 then
    perform pg_advisory_xact_lock(814636, 1);
    select coalesce(max(numero),40)+1 into new.numero from public.negocios;
  end if;
  if new.codigo is null or new.codigo in ('','AUTO') then
    new.codigo := 'N' || lpad(new.numero::text, 4, '0') || '-' || coalesce(new.divisa_codigo,'COP');
  end if;
  if new.cliente_id is not null and (new.cliente_nombre is null or new.cliente_codigo is null) then
    select codigo,nombre into new.cliente_codigo,new.cliente_nombre from public.clientes where id=new.cliente_id;
  end if;
  return new;
end;
$$;

alter table public.compras_usdt add column origen_fondos_id text;

create function kaupaloki_private.bloquear_operacion_usdt() returns trigger
language plpgsql set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(814636, 2);
  return new;
end;
$$;
revoke all on function kaupaloki_private.bloquear_operacion_usdt() from public, anon, authenticated;
create trigger bloquear_operacion_usdt before insert on public.compras_usdt for each row execute function kaupaloki_private.bloquear_operacion_usdt();
create trigger bloquear_operacion_usdt before insert on public.ventas_usdt for each row execute function kaupaloki_private.bloquear_operacion_usdt();

create function kaupaloki_private.registrar_saldos_usdt() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare source_id text;
  destination_id text;
  currency text;
  debit numeric;
  credit numeric;
begin
  if tg_table_name = 'compras_usdt' then
    source_id := new.origen_fondos_id;
    destination_id := new.wallet_destino_id::text;
    currency := new.divisa_codigo;
    debit := new.valor_comprado;
    credit := new.usdt_comprado;
  else
    source_id := new.wallet_origen_id::text;
    destination_id := new.destino_fondos_id::text;
    currency := 'USDT';
    debit := new.usdt_vendido;
    credit := new.total_cop;
  end if;
  if source_id is null or destination_id is null or source_id = destination_id
     or currency is null or debit is null or debit <= 0 or credit is null or credit <= 0 then
    raise exception 'Selecciona un origen y destino válidos e ingresa montos positivos.';
  end if;

  if currency = 'USDT' then
    update public.activos_digitales set saldo_real=coalesce(saldo_real,saldo_usdt,0)-debit, saldo_usdt=coalesce(saldo_usdt,0)-debit
    where id::text=source_id and coalesce(saldo_real,saldo_usdt,0)>=debit;
  else
    update public.activos_liquidos set saldo_real=coalesce(saldo_real,saldo_cop,0)-debit, saldo_cop=coalesce(saldo_cop,0)-debit
    where id::text=source_id and coalesce(divisa,'COP')=currency and coalesce(saldo_real,saldo_cop,0)>=debit;
  end if;
  if not found then raise exception 'El monto supera el saldo disponible o el origen ya no está disponible.'; end if;

  if tg_table_name = 'compras_usdt' then
    update public.activos_digitales set saldo_real=coalesce(saldo_real,saldo_usdt,0)+credit, saldo_usdt=coalesce(saldo_usdt,0)+credit
    where id::text=destination_id;
  else
    update public.activos_liquidos set saldo_real=coalesce(saldo_real,saldo_cop,0)+credit, saldo_cop=coalesce(saldo_cop,0)+credit
    where id::text=destination_id and coalesce(divisa,'COP')='COP';
  end if;
  if not found then raise exception 'La cuenta de destino ya no está disponible.'; end if;
  return new;
end;
$$;

revoke all on function kaupaloki_private.registrar_saldos_usdt() from public, anon, authenticated;
create trigger aplicar_saldos_usdt after insert on public.compras_usdt for each row execute function kaupaloki_private.registrar_saldos_usdt();
create trigger aplicar_saldos_usdt after insert on public.ventas_usdt for each row execute function kaupaloki_private.registrar_saldos_usdt();

create or replace function public.abrir_portal_cliente(p_token uuid, p_pin text) returns jsonb
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
        'origenFondos', d.origen_fondos, 'monto', coalesce(d.monto_cop, d.monto), 'referencia', d.referencia))
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


commit;
