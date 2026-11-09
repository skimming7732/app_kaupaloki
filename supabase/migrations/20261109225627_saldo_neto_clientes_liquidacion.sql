ALTER TABLE public.resumen_liquidacion
  ADD COLUMN saldo_neto_clientes_cop numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.fn_recalculate_financial_aggregates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_saldo_neto_clientes NUMERIC;
  v_total_ventas NUMERIC;
  v_total_gastos NUMERIC;
  v_total_costos_dispersion NUMERIC;
  v_total_activos_digitales NUMERIC;
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
        WHERE e.cliente_id = c.id AND UPPER(e.tipo) = 'PAGO'
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

  -- 1d. Recompute client balances and status
  UPDATE public.clientes
  SET
    pendiente_cop = GREATEST(0, ingresos_cop - pagado_cop),
    saldo_cop = ingresos_cop - pagado_cop,
    estado = CASE
      WHEN ingresos_cop = 0 AND pagado_cop = 0 THEN 'SIN ACTIVIDAD'
      WHEN pagado_cop > ingresos_cop THEN 'DEBE'
      WHEN ingresos_cop = pagado_cop THEN 'PAGADO'
      ELSE 'PENDIENTE'
    END,
    pais = COALESCE(NULLIF(TRIM(pais), ''), 'Colombia')
  WHERE id IS NOT NULL;

  -- 2. Divisas
  UPDATE public.divisas d
  SET
    total_recibido = GREATEST(
      CASE WHEN d.codigo = 'USDT' THEN 0 ELSE COALESCE(d.total_recibido, 0) END,
      COALESCE((
        SELECT SUM(n.monto_divisa)
        FROM public.negocios n
        WHERE n.divisa_codigo = d.codigo
      ), 0)
    ),
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

  SELECT COALESCE(SUM(CASE WHEN divisa = 'COP' THEN monto ELSE monto * 4000 END), 0) INTO v_total_gastos FROM public.gastos WHERE id IS NOT NULL;

  SELECT COALESCE(SUM(costo_cop), 0) INTO v_total_costos_dispersion
  FROM public.dispersiones
  WHERE UPPER(BTRIM(COALESCE(estado, 'COMPLETADO'))) <> 'RECHAZADO';

  UPDATE public.resumen_liquidacion r
  SET
    total_negocio_cop = (SELECT COALESCE(SUM(ingreso_cop), 0) FROM public.negocios WHERE id IS NOT NULL),
    total_ventas_usdt_cop = v_total_ventas,
    total_liquidez_esperada_cop = v_total_activos_digitales * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950),
    saldo_neto_clientes_cop = v_saldo_neto_clientes,
    total_gastos_cop = v_total_gastos,
    total_costos_dispersion_cop = v_total_costos_dispersion,
    total_activos_digitales_usdt = v_total_activos_digitales,
    total_activos_liquidos_cop = (SELECT COALESCE(SUM(saldo_cop), 0) FROM public.activos_liquidos WHERE id IS NOT NULL),
    total_saldo_pendiente_clientes_cop = (SELECT COALESCE(SUM(GREATEST(0, pendiente_cop)), 0) FROM public.clientes WHERE id IS NOT NULL),
    ganancia_esperada_cop = v_total_ventas + v_total_activos_digitales * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950) - v_saldo_neto_clientes - v_total_gastos,
    updated_at = NOW()
  WHERE r.id IS NOT NULL;

  RETURN NULL;
END;
$function$;

CREATE FUNCTION kaupaloki_private.aplicar_tasa_liquidacion(p_rate numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $rate$
BEGIN
  IF COALESCE(kaupaloki_private.staff_role(), '') NOT IN ('administrador', 'super_admin') THEN
    RAISE insufficient_privilege;
  END IF;
  IF p_rate IS NULL OR p_rate <= 0 OR p_rate::text IN ('NaN', 'Infinity') THEN
    RAISE EXCEPTION 'La tasa debe ser un número mayor que cero' USING ERRCODE = '22023';
  END IF;

  UPDATE public.resumen_liquidacion r
  SET rate_usdt_cop = p_rate,
      total_liquidez_esperada_cop = COALESCE(r.total_activos_digitales_usdt, 0) * p_rate,
      ganancia_esperada_cop = COALESCE(r.total_ventas_usdt_cop, 0)
        + COALESCE(r.total_activos_digitales_usdt, 0) * p_rate
        - r.saldo_neto_clientes_cop - COALESCE(r.total_gastos_cop, 0),
      updated_at = now()
  WHERE r.id IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el resumen de liquidación' USING ERRCODE = 'P0002';
  END IF;
END;
$rate$;

CREATE OR REPLACE FUNCTION public.actualizar_rate_usdt(p_rate numeric) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $rate$
  SELECT kaupaloki_private.aplicar_tasa_liquidacion(p_rate);
$rate$;

REVOKE ALL ON FUNCTION kaupaloki_private.aplicar_tasa_liquidacion(numeric), public.actualizar_rate_usdt(numeric)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION kaupaloki_private.aplicar_tasa_liquidacion(numeric), public.actualizar_rate_usdt(numeric)
  TO authenticated;

-- Refresh the current estimate without rewriting operational rows or prior daily closes.
WITH saldo AS (
  SELECT COALESCE(SUM(saldo_cop), 0) AS neto FROM public.clientes
)
UPDATE public.resumen_liquidacion r
SET saldo_neto_clientes_cop = s.neto,
    total_liquidez_esperada_cop = COALESCE(r.total_activos_digitales_usdt, 0) * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950),
    ganancia_esperada_cop = COALESCE(r.total_ventas_usdt_cop, 0)
      + COALESCE(r.total_activos_digitales_usdt, 0) * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950)
      - s.neto - COALESCE(r.total_gastos_cop, 0),
    updated_at = now()
FROM saldo s
WHERE r.id IS NOT NULL;
