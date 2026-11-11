-- Migration: Add saldo_inicial_cop and concepto_saldo_inicial to clientes
-- Allows super_admin to configure opening balance (either owed by company or debt owed by client)

-- 1. Add columns to public.clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS saldo_inicial_cop NUMERIC DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS concepto_saldo_inicial TEXT;

-- 2. Trigger on clientes to automatically recalculate saldo_cop, pendiente_cop, and estado
CREATE OR REPLACE FUNCTION public.fn_clientes_recalculate_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_effective_income NUMERIC;
BEGIN
  NEW.saldo_inicial_cop := COALESCE(NEW.saldo_inicial_cop, 0);
  NEW.ingresos_cop := COALESCE(NEW.ingresos_cop, 0);
  NEW.pagado_cop := COALESCE(NEW.pagado_cop, 0);

  v_effective_income := NEW.ingresos_cop + NEW.saldo_inicial_cop;
  NEW.saldo_cop := v_effective_income - NEW.pagado_cop;
  NEW.pendiente_cop := GREATEST(0, NEW.saldo_cop);

  IF NEW.saldo_cop < 0 THEN
    NEW.estado := 'DEBE';
  ELSIF NEW.saldo_cop > 0 THEN
    NEW.estado := 'PENDIENTE';
  ELSIF v_effective_income = 0 AND NEW.pagado_cop = 0 THEN
    NEW.estado := 'SIN ACTIVIDAD';
  ELSE
    NEW.estado := 'PAGADO';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_balance ON public.clientes;
CREATE TRIGGER trg_clientes_balance
BEFORE INSERT OR UPDATE OF ingresos_cop, pagado_cop, saldo_inicial_cop
ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.fn_clientes_recalculate_balance();

-- 3. Trigger to keep resumen_liquidacion updated when clients balance changes
CREATE OR REPLACE FUNCTION public.fn_clientes_after_balance_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;
  UPDATE public.resumen_liquidacion
  SET saldo_neto_clientes_cop = (SELECT COALESCE(SUM(saldo_cop), 0) FROM public.clientes),
      total_saldo_pendiente_clientes_cop = (SELECT COALESCE(SUM(GREATEST(0, pendiente_cop)), 0) FROM public.clientes),
      updated_at = NOW();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_after_balance ON public.clientes;
CREATE TRIGGER trg_clientes_after_balance
AFTER INSERT OR UPDATE OF saldo_cop, pendiente_cop
ON public.clientes
FOR EACH STATEMENT
EXECUTE FUNCTION public.fn_clientes_after_balance_update();

-- 4. Update fn_recalculate_financial_aggregates to incorporate saldo_inicial_cop in balance and status
CREATE OR REPLACE FUNCTION public.fn_recalculate_financial_aggregates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_saldo_neto_clientes NUMERIC;
  v_total_ventas NUMERIC;
  v_total_gastos NUMERIC;
  v_total_costos_dispersion NUMERIC;
  v_total_activos_digitales NUMERIC;
  v_total_activos_liquidos NUMERIC;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  -- 1a. Recalculate base operational income per client (negocios + efectivo ingreso)
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
        WHERE e.cliente_id = c.id AND UPPER(BTRIM(e.tipo)) IN ('PAGO', 'EGRESO')
      ), 0)
    )
  WHERE c.id IS NOT NULL;

  -- 1b. Recalculate comisionistas based on referred clients' base operational income
  UPDATE public.comisionistas cm
  SET
    ingresos_cop = CASE
      WHEN cm.referidos_ids IS NOT NULL AND ARRAY_LENGTH(cm.referidos_ids, 1) > 0 THEN
        COALESCE((SELECT SUM(c.ingresos_cop) FROM public.clientes c WHERE c.id = ANY(cm.referidos_ids)), 0)
      ELSE 0
    END,
    comisiones_cop = CASE
      WHEN cm.referidos_ids IS NOT NULL AND ARRAY_LENGTH(cm.referidos_ids, 1) > 0 THEN
        COALESCE((SELECT SUM(c.ingresos_cop) FROM public.clientes c WHERE c.id = ANY(cm.referidos_ids)), 0) * COALESCE(cm.porcentaje_comision, 0)
      ELSE 0
    END
  WHERE cm.id IS NOT NULL;

  -- 1c. Add earned commissions to each comisionista client's ingresos_cop
  UPDATE public.clientes c
  SET ingresos_cop = c.ingresos_cop + COALESCE((
    SELECT SUM(cm.comisiones_cop) FROM public.comisionistas cm WHERE cm.cliente_id = c.id
  ), 0)
  WHERE EXISTS (SELECT 1 FROM public.comisionistas cm WHERE cm.cliente_id = c.id);

  -- 1d. Recompute client balances and status incorporating saldo_inicial_cop
  UPDATE public.clientes
  SET
    pendiente_cop = GREATEST(0, (ingresos_cop + COALESCE(saldo_inicial_cop, 0)) - pagado_cop),
    saldo_cop = (ingresos_cop + COALESCE(saldo_inicial_cop, 0)) - pagado_cop,
    estado = CASE
      WHEN (ingresos_cop + COALESCE(saldo_inicial_cop, 0)) = 0 AND pagado_cop = 0 THEN 'SIN ACTIVIDAD'
      WHEN pagado_cop > (ingresos_cop + COALESCE(saldo_inicial_cop, 0)) THEN 'DEBE'
      WHEN (ingresos_cop + COALESCE(saldo_inicial_cop, 0)) = pagado_cop THEN 'PAGADO'
      ELSE 'PENDIENTE'
    END,
    pais = COALESCE(NULLIF(TRIM(pais), ''), 'Colombia')
  WHERE id IS NOT NULL;

  -- 2. Divisas
  UPDATE public.divisas d
  SET
    total_recibido = COALESCE((
      SELECT SUM(n.monto_divisa)
      FROM public.negocios n
      WHERE n.divisa_codigo = d.codigo
    ), 0),
    total_comprado = GREATEST(
      CASE WHEN d.codigo = 'USDT' THEN 0 ELSE COALESCE(d.total_comprado, 0) END,
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
  SELECT COALESCE(SUM(saldo_cop), 0) INTO v_saldo_neto_clientes FROM public.clientes;
  SELECT COALESCE(SUM(total_cop), 0) INTO v_total_ventas FROM public.ventas_usdt WHERE id IS NOT NULL;
  SELECT COALESCE(SUM(saldo_usdt), 0) INTO v_total_activos_digitales FROM public.activos_digitales WHERE activo != 'TEST' AND id IS NOT NULL;
  SELECT COALESCE(SUM(saldo_cop), 0) INTO v_total_activos_liquidos FROM public.activos_liquidos WHERE id IS NOT NULL;

  SELECT COALESCE(SUM(CASE WHEN divisa = 'COP' THEN monto ELSE monto * 4000 END), 0) INTO v_total_gastos FROM public.gastos WHERE id IS NOT NULL;

  SELECT COALESCE(SUM(costo_cop), 0) INTO v_total_costos_dispersion
  FROM public.dispersiones
  WHERE UPPER(BTRIM(COALESCE(estado, 'COMPLETADO'))) <> 'RECHAZADO';

  UPDATE public.resumen_liquidacion r
  SET
    total_negocio_cop = (SELECT COALESCE(SUM(ingreso_cop), 0) FROM public.negocios WHERE id IS NOT NULL),
    total_ventas_usdt_cop = v_total_ventas,
    total_activos_liquidos_cop = v_total_activos_liquidos,
    total_activos_digitales_usdt = v_total_activos_digitales,
    total_liquidez_esperada_cop = v_total_activos_digitales * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950),
    saldo_neto_clientes_cop = v_saldo_neto_clientes,
    total_gastos_cop = v_total_gastos,
    total_costos_dispersion_cop = v_total_costos_dispersion,
    total_saldo_pendiente_clientes_cop = (SELECT COALESCE(SUM(GREATEST(0, pendiente_cop)), 0) FROM public.clientes WHERE id IS NOT NULL),
    ganancia_esperada_cop = v_total_activos_liquidos
      + v_total_activos_digitales * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950)
      - v_saldo_neto_clientes - COALESCE(r.total_capital_invertido_cop, 0),
    updated_at = NOW()
  WHERE r.id IS NOT NULL;

  RETURN NULL;
END;
$function$;

-- 5. Update abrir_portal_cliente to include saldoInicialCOP, conceptoSaldoInicial, fechaCreacion
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
    'client', jsonb_build_object(
      'codigo', cliente.codigo,
      'nombre', cliente.nombre,
      'pais', cliente.pais,
      'saldoPendienteCOP', cliente.saldo_cop,
      'totalIngresosCOP', cliente.ingresos_cop,
      'totalDispersadoCOP', cliente.pagado_cop,
      'estado', cliente.estado,
      'saldoInicialCOP', coalesce(cliente.saldo_inicial_cop, 0),
      'conceptoSaldoInicial', coalesce(cliente.concepto_saldo_inicial, 'Saldo inicial'),
      'fechaCreacion', cliente.fecha_creacion
    ),
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
        'tipo', e.tipo, 'monto', e.monto, 'origenFondos', e.origen_fondos, 'referencia', e.referencia))
      from public.efectivo e
      where (e.cliente_id::text = link.client_id or (e.cliente_id is null and e.cliente_codigo = cliente.codigo))
    ), '[]'::jsonb)
  );
end;
$function$;
