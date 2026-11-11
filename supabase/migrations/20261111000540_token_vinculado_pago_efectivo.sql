alter table public.cash_tokens
  add column efectivo_id uuid references public.efectivo(id) on delete set null,
  add column pago_codigo text;

create index cash_tokens_efectivo_idx on public.cash_tokens (efectivo_id);
create unique index cash_tokens_entrega_por_pago_idx on public.cash_tokens (efectivo_id)
  where efectivo_id is not null and estado in ('activo', 'entregado');

create function kaupaloki_private.validar_token_pago()
returns trigger language plpgsql set search_path = '' as $$
declare
  pago public.efectivo;
begin
  if tg_op = 'DELETE' then
    if old.efectivo_id is not null then
      raise exception 'Cancela el token desde el listado para conservar el historial del pago.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.efectivo_id is not null then
    if new.efectivo_id is distinct from old.efectivo_id then
      if new.efectivo_id is not null or pg_trigger_depth() < 2 or exists (select 1 from public.efectivo where id = old.efectivo_id) then
        raise exception 'El vínculo del token con el pago no puede cambiar.';
      end if;
      new.pago_codigo := old.pago_codigo;
      if old.estado = 'activo' then
        new.estado := 'cancelado';
        new.status := 'cancelado';
        new.cancelled_at := now();
        new.cancel_reason := 'Pago anulado';
      end if;
      return new;
    end if;

    if new.estado is distinct from old.estado and (
      old.estado <> 'activo' or (new.estado = 'entregado' and old.expires_at <= clock_timestamp())
    ) then
      raise exception 'Este token ya no está disponible para entrega.';
    end if;
  elsif new.efectivo_id is not null and (
    tg_op <> 'INSERT' or coalesce(kaupaloki_private.staff_role(), '') not in ('administrador', 'super_admin')
  ) then
    raise exception 'Solo administración puede vincular un token a un pago.' using errcode = '42501';
  end if;

  if new.efectivo_id is null then
    new.pago_codigo := case when tg_op = 'UPDATE' then old.pago_codigo else null end;
    return new;
  end if;

  select * into strict pago from public.efectivo where id = new.efectivo_id;
  if upper(btrim(pago.tipo)) not in ('PAGO', 'EGRESO') then
    raise exception 'El token debe vincularse a una salida de efectivo.';
  end if;
  if tg_op = 'INSERT' then
    new.monto := pago.monto - pago.comision_cop;
    new.divisa := 'COP';
    if new.monto is null or new.monto <= 0 then
      raise exception 'El pago debe tener efectivo por entregar.';
    end if;
  elsif new.monto is distinct from old.monto or new.divisa is distinct from old.divisa
    or new.token_code is distinct from old.token_code or new.expires_at is distinct from old.expires_at then
    raise exception 'Emite un reemplazo para cambiar el vale de un pago.';
  end if;
  new.referencia := pago.referencia;
  new.pago_codigo := pago.codigo;
  return new;
end;
$$;

create trigger zz_validar_token_pago
  before insert or update or delete on public.cash_tokens
  for each row execute function kaupaloki_private.validar_token_pago();

create function kaupaloki_private.sincronizar_token_pago()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.monto, new.comision_cop, new.cliente_id, new.tipo, new.origen_fondos_id)
     is distinct from (old.monto, old.comision_cop, old.cliente_id, old.tipo, old.origen_fondos_id) then
    perform 1 from public.cash_tokens
    where efectivo_id = new.id and (estado = 'entregado' or (estado = 'activo' and expires_at > clock_timestamp()))
    for update;
    if found then
      raise exception 'El pago tiene un token vigente o entregado. Cancela el token vigente antes de modificar el pago.';
    end if;
    if upper(btrim(new.tipo)) not in ('PAGO', 'EGRESO')
       and exists (select 1 from public.cash_tokens where efectivo_id = new.id) then
      raise exception 'Un pago con historial de tokens debe conservar su tipo.';
    end if;
  end if;
  if new.referencia is distinct from old.referencia or new.codigo is distinct from old.codigo then
    update public.cash_tokens set referencia = new.referencia, pago_codigo = new.codigo where efectivo_id = new.id;
  end if;
  return new;
end;
$$;

create trigger sincronizar_token_pago
  after update on public.efectivo
  for each row execute function kaupaloki_private.sincronizar_token_pago();

create function public.emitir_token_pago_efectivo(p_pago_id uuid)
returns public.cash_tokens language plpgsql security invoker set search_path = '' as $$
declare
  pago public.efectivo;
  token public.cash_tokens;
begin
  if coalesce(kaupaloki_private.staff_role(), '') not in ('administrador', 'super_admin') then
    raise exception 'Solo administración puede emitir un token de pago.' using errcode = '42501';
  end if;

  select * into strict pago from public.efectivo where id = p_pago_id for update;
  if upper(btrim(pago.tipo)) not in ('PAGO', 'EGRESO') or pago.monto <= pago.comision_cop then
    raise exception 'Selecciona un pago con efectivo por entregar.';
  end if;

  update public.cash_tokens set estado = 'expirado'
  where efectivo_id = pago.id and estado = 'activo' and expires_at <= clock_timestamp();

  select * into token from public.cash_tokens
  where efectivo_id = pago.id and estado in ('activo', 'entregado') for update;
  if found then
    return token;
  end if;

  insert into public.cash_tokens (efectivo_id)
  values (pago.id)
  returning * into token;
  return token;
end;
$$;

create function public.registrar_pago_con_token(p_pago jsonb)
returns public.cash_tokens language plpgsql security invoker set search_path = '' as $$
declare
  pago public.efectivo := jsonb_populate_record(null::public.efectivo, p_pago);
begin
  if coalesce(kaupaloki_private.staff_role(), '') not in ('administrador', 'super_admin') then
    raise exception 'Solo administración puede registrar un pago con token.' using errcode = '42501';
  end if;
  if pago.id is null or pago.monto is null or pago.comision_cop is null or pago.monto <= pago.comision_cop
     or nullif(btrim(pago.referencia), '') is null then
    raise exception 'El monto y la referencia del pago son obligatorios.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(pago.id::text, 0));
  if not exists (select 1 from public.efectivo where id = pago.id) then
    insert into public.efectivo (
      id, codigo, fecha, tipo, cliente_id, cliente_codigo, cliente_nombre, monto,
      comision_cop, origen_fondos, origen_fondos_id, referencia
    ) values (
      pago.id, pago.codigo, pago.fecha, 'PAGO', pago.cliente_id, pago.cliente_codigo,
      pago.cliente_nombre, pago.monto, pago.comision_cop, pago.origen_fondos, pago.origen_fondos_id, pago.referencia
    );
  end if;
  return public.emitir_token_pago_efectivo(pago.id);
end;
$$;

revoke execute on function public.emitir_token_pago_efectivo(uuid), public.registrar_pago_con_token(jsonb)
  from public, anon;
grant execute on function public.emitir_token_pago_efectivo(uuid), public.registrar_pago_con_token(jsonb)
  to authenticated;
