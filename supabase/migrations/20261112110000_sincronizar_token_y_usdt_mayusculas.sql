-- Migration: Cancelar token activo al modificar pago de efectivo y forzar mayúsculas en compras/ventas USDT

create or replace function kaupaloki_private.sincronizar_token_pago()
returns trigger
language plpgsql
security definer
set search_path = public, kaupaloki_private
as $$
begin
  if (new.monto, new.comision_cop, new.cliente_id, new.tipo, new.origen_fondos_id)
     is distinct from (old.monto, old.comision_cop, old.cliente_id, old.tipo, old.origen_fondos_id) then

    -- Si el token ya fue entregado (cobrado en efectivo), no se puede alterar el pago
    if exists (
      select 1 from public.cash_tokens
      where efectivo_id = new.id and estado = 'entregado'
    ) then
      raise exception 'El pago tiene un token entregado en caja y no puede modificarse.';
    end if;

    -- Si tiene un token activo (no entregado aún), al modificar el pago se invalida/cancela el token
    -- porque el valor o datos ya no corresponden a la orden emitida.
    update public.cash_tokens
    set estado = 'cancelado',
        status = 'cancelled',
        cancel_reason = 'Cancelado automáticamente por modificación en pago ' || coalesce(new.codigo, old.codigo),
        cancelled_at = clock_timestamp()
    where efectivo_id = new.id and estado = 'activo';

    if upper(btrim(new.tipo)) not in ('PAGO', 'EGRESO')
       and exists (select 1 from public.cash_tokens where efectivo_id = new.id) then
      raise exception 'Un pago con historial de tokens debe conservar su tipo.';
    end if;
  end if;

  if new.referencia is distinct from old.referencia or new.codigo is distinct from old.codigo then
    update public.cash_tokens
    set referencia = new.referencia, pago_codigo = new.codigo
    where efectivo_id = new.id;
  end if;

  return new;
end;
$$;

create or replace function public.trg_compras_usdt_auto_fill()
returns trigger
language plpgsql
as $$
declare
  v_next_num integer;
  v_divisa text;
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.numero is null or new.numero <= 0 then
    select coalesce(max(numero), 0) + 1 into v_next_num from public.compras_usdt;
    new.numero := v_next_num;
  end if;

  if new.fecha is null then
    new.fecha := current_date;
  end if;

  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.proveedor is not null then
    new.proveedor := upper(btrim(new.proveedor));
  end if;

  v_divisa := upper(coalesce(nullif(btrim(new.divisa_codigo), ''), 'USDT'));

  if new.codigo is null or new.codigo = '' or new.codigo = 'AUTO'
     or new.codigo ~ '^CMP-[0-9A-F]{8}$'
     or (tg_op = 'UPDATE' and new.divisa_codigo is distinct from old.divisa_codigo) then
    new.codigo := 'CMP-' || v_divisa || '-' || lpad(new.numero::text, 4, '0');
  end if;

  return new;
end;
$$;

create or replace function public.trg_ventas_usdt_auto_fill()
returns trigger
language plpgsql
as $$
declare
  v_next_num integer;
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.numero is null or new.numero <= 0 then
    select coalesce(max(numero), 0) + 1 into v_next_num from public.ventas_usdt;
    new.numero := v_next_num;
  end if;

  if new.fecha is null then
    new.fecha := current_date;
  end if;

  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.concepto is not null then
    new.concepto := upper(btrim(new.concepto));
  end if;

  if new.codigo is null or new.codigo = '' or new.codigo = 'AUTO'
     or new.codigo ~ '^VNT-[0-9A-F]{8}$' then
    new.codigo := 'VNT-COP-' || lpad(new.numero::text, 4, '0');
  end if;

  return new;
end;
$$;

update public.compras_usdt set proveedor = upper(btrim(proveedor)) where proveedor is not null and proveedor <> upper(btrim(proveedor));
update public.ventas_usdt set concepto = upper(btrim(concepto)) where concepto is not null and concepto <> upper(btrim(concepto));
