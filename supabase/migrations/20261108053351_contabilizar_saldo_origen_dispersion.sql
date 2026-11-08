-- Imported rows may already be reflected in their opening balances. Track
-- only debits applied by this trigger so rejecting a legacy row cannot mint funds.
alter table public.dispersiones
  add column saldo_origen_aplicado boolean not null default false;

create function kaupaloki_private.contabilizar_saldo_origen_dispersion() returns trigger
language plpgsql security definer set search_path = ''
as $balance$
declare
  old_source text;
  new_source text;
  old_amount numeric := 0;
  new_amount numeric := 0;
  old_rejected boolean;
  new_rejected boolean;
  entry record;
begin
  if tg_op <> 'INSERT' and old.saldo_origen_aplicado then
    old_source := old.origen_fondos_id;
    old_amount := coalesce(old.monto_cop, old.monto);
  end if;

  if tg_op <> 'DELETE' then
    new_source := nullif(btrim(new.origen_fondos_id), '');
    new_rejected := upper(btrim(coalesce(new.estado, 'COMPLETADO'))) = 'RECHAZADO';
    if tg_op = 'UPDATE' then
      old_rejected := upper(btrim(coalesce(old.estado, 'COMPLETADO'))) = 'RECHAZADO';
      -- Metadata edits and idempotent writes must never repost a balance.
      if (new_source, new.monto_cop, new.monto, new_rejected)
        is not distinct from (nullif(btrim(old.origen_fondos_id), ''), old.monto_cop, old.monto, old_rejected) then
        new.saldo_origen_aplicado := old.saldo_origen_aplicado;
        return new;
      end if;
    end if;

    new.saldo_origen_aplicado := false;
    if not new_rejected then
      if new_source is null then
        raise exception 'Vincula una cuenta de origen antes de completar la dispersión.' using errcode='P0001';
      end if;
      new_amount := coalesce(new.monto_cop, new.monto);
      if new_amount is null or not (new_amount > 0 and new_amount < 'Infinity'::numeric) then
        raise exception 'Ingresa un monto válido para completar la dispersión.' using errcode='P0001';
      end if;
      new.origen_fondos_id := new_source;
      new.saldo_origen_aplicado := true;
    end if;
  end if;

  -- The net delta handles changes of amount, origin, status and deletion.
  -- Sort account ids consistently when moving a debit between two accounts.
  for entry in
    select account_id, sum(delta) as amount
    from (values (old_source, old_amount), (new_source, -new_amount)) amounts(account_id, delta)
    where account_id is not null
    group by account_id having sum(delta) <> 0
    order by account_id
  loop
    update public.activos_liquidos
    set saldo_cop = coalesce(saldo_cop, 0) + entry.amount,
        egresos_cop = coalesce(egresos_cop, 0) - entry.amount
    where id::text = entry.account_id and coalesce(divisa, 'COP') = 'COP'
      and (entry.amount > 0 or coalesce(saldo_cop, 0) >= -entry.amount);
    if not found then
      raise exception 'La cuenta de origen no está disponible o su saldo contable es insuficiente.' using errcode='P0001';
    end if;
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$balance$;

revoke all on function kaupaloki_private.contabilizar_saldo_origen_dispersion() from public, anon, authenticated;
create trigger zz_contabilizar_saldo_origen_dispersion
before insert or update or delete on public.dispersiones
for each row execute function kaupaloki_private.contabilizar_saldo_origen_dispersion();

-- Recompute customer obligations from operations and cash received.
CREATE OR REPLACE FUNCTION public.fn_recalculate_financial_aggregates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_total_clientes_ingresos NUMERIC;
  v_total_ventas NUMERIC;
  v_total_liq_esp NUMERIC;
  v_total_gastos NUMERIC;
  v_rate_usdt_cop NUMERIC;
  v_total_activos_digitales NUMERIC;
BEGIN
  -- 1. Clientes: Recalcular ingresos_cop, total_negocios, pagado_cop y estado
  UPDATE public.clientes c
  SET
    total_negocios = COALESCE((SELECT COUNT(*) FROM public.negocios n WHERE n.cliente_id = c.id), 0),
    ingresos_cop = (
      COALESCE((SELECT SUM(n.ingreso_cop) FROM public.negocios n WHERE n.cliente_id = c.id), 0)
      + COALESCE((
        SELECT SUM(e.monto)
        FROM public.efectivo e
        WHERE UPPER(BTRIM(e.tipo)) = 'INGRESO'
          AND (e.cliente_id = c.id OR (e.cliente_id IS NULL AND e.cliente_codigo = c.codigo))
      ), 0)
    ),
    pagado_cop = (
      COALESCE((
        SELECT SUM(COALESCE(d.monto_cop, d.monto))
        FROM public.dispersiones d
        WHERE d.cliente_id = c.id AND UPPER(BTRIM(COALESCE(d.estado, 'COMPLETADO'))) != 'RECHAZADO'
      ), 0) +
      COALESCE((
        SELECT SUM(e.monto)
        FROM public.efectivo e
        WHERE e.cliente_id = c.id AND UPPER(e.tipo) = 'PAGO'
      ), 0)
    )
  WHERE c.id IS NOT NULL;

  UPDATE public.clientes
  SET
    pendiente_cop = GREATEST(0, ingresos_cop - pagado_cop),
    saldo_cop = ingresos_cop - pagado_cop,
    estado = CASE
      WHEN ingresos_cop = 0 AND pagado_cop = 0 THEN 'SIN ACTIVIDAD'
      WHEN (ingresos_cop - pagado_cop) <= 0 AND ingresos_cop > 0 THEN 'PAGADO'
      ELSE 'PENDIENTE'
    END,
    pais = COALESCE(NULLIF(TRIM(pais), ''), 'Colombia')
  WHERE id IS NOT NULL;

  -- 2. Divisas
  UPDATE public.divisas d
  SET
    total_recibido = GREATEST(
      COALESCE(d.total_recibido, 0),
      COALESCE((
        SELECT SUM(n.monto_divisa)
        FROM public.negocios n
        WHERE n.divisa_codigo = d.codigo
      ), 0)
    ),
    total_comprado = GREATEST(
      COALESCE(d.total_comprado, 0),
      COALESCE((
        SELECT SUM(cu.valor_comprado)
        FROM public.compras_usdt cu
        WHERE cu.divisa_codigo = d.codigo
      ), 0)
    )
  WHERE d.id IS NOT NULL;

  UPDATE public.divisas
  SET total_pendiente = GREATEST(0, total_recibido - total_comprado)
  WHERE id IS NOT NULL;

  -- 3. Resumen Liquidacion variables con rate manual USDT/COP
  SELECT COALESCE(rate_usdt_cop, 3950) INTO v_rate_usdt_cop FROM public.resumen_liquidacion WHERE id IS NOT NULL LIMIT 1;
  IF v_rate_usdt_cop IS NULL OR v_rate_usdt_cop <= 0 THEN
    v_rate_usdt_cop := 3950;
  END IF;

  SELECT COALESCE(SUM(ingresos_cop), 0) INTO v_total_clientes_ingresos FROM public.clientes WHERE id IS NOT NULL;
  SELECT COALESCE(SUM(total_cop), 0) INTO v_total_ventas FROM public.ventas_usdt WHERE id IS NOT NULL;
  SELECT COALESCE(SUM(saldo_usdt), 0) INTO v_total_activos_digitales FROM public.activos_digitales WHERE activo != 'TEST' AND id IS NOT NULL;

  -- Liquidez esperada = Saldo total USDT * Rate manual USDT/COP
  v_total_liq_esp := v_total_activos_digitales * v_rate_usdt_cop;
  SELECT COALESCE(SUM(CASE WHEN divisa = 'COP' THEN monto ELSE monto * 4000 END), 0) INTO v_total_gastos FROM public.gastos WHERE id IS NOT NULL;

  UPDATE public.resumen_liquidacion
  SET
    total_negocio_cop = (SELECT COALESCE(SUM(ingreso_cop), 0) FROM public.negocios WHERE id IS NOT NULL),
    total_ventas_usdt_cop = v_total_ventas,
    total_liquidez_esperada_cop = v_total_liq_esp,
    total_gastos_cop = v_total_gastos,
    total_activos_digitales_usdt = v_total_activos_digitales,
    total_activos_liquidos_cop = (SELECT COALESCE(SUM(saldo_cop), 0) FROM public.activos_liquidos WHERE id IS NOT NULL),
    total_saldo_pendiente_clientes_cop = (SELECT COALESCE(SUM(GREATEST(0, pendiente_cop)), 0) FROM public.clientes WHERE id IS NOT NULL),
    ganancia_esperada_cop = (v_total_ventas + v_total_liq_esp - v_total_clientes_ingresos - v_total_gastos),
    updated_at = NOW()
  WHERE id IS NOT NULL;

  RETURN NULL;
END;
$function$;

-- The client portal shows settled payments and retains the existing PIN checks.
CREATE OR REPLACE FUNCTION public.abrir_portal_cliente(p_token uuid, p_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      from public.dispersiones d
      where (d.cliente_id::text = link.client_id or (d.cliente_id is null and d.cliente_codigo = cliente.codigo))
        and upper(btrim(coalesce(d.estado, 'COMPLETADO'))) <> 'RECHAZADO'
    ), '[]'::jsonb),
    'efectivo', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'codigo', e.codigo, 'fecha', e.fecha,
        'tipo', case when upper(e.tipo::text) = 'INGRESO' then 'Ingreso' else 'Pago' end,
        'origenFondos', e.origen_fondos, 'monto', e.monto, 'referencia', e.referencia))
      from public.efectivo e where e.cliente_id::text = link.client_id or (e.cliente_id is null and e.cliente_codigo = cliente.codigo)
    ), '[]'::jsonb)
  );
end;
$function$;

-- Fire only the statement-level aggregate trigger. Historical rows are untouched.
update public.dispersiones set estado=estado where false;
