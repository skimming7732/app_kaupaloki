-- Historical dispersions have no recorded fee. Keep it separate from the
-- amount paid to the customer and from expenses recorded in gastos.
ALTER TABLE public.dispersiones
  ADD COLUMN costo_cop numeric(18, 2) NOT NULL DEFAULT 0
  CHECK (costo_cop >= 0 AND costo_cop < 'Infinity'::numeric);

GRANT INSERT (costo_cop), UPDATE (costo_cop) ON public.dispersiones TO authenticated;

ALTER TABLE public.resumen_liquidacion
  ADD COLUMN total_costos_dispersion_cop numeric NOT NULL DEFAULT 0;

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
  v_total_costos_dispersion NUMERIC;
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

  SELECT COALESCE(SUM(costo_cop), 0) INTO v_total_costos_dispersion
  FROM public.dispersiones
  WHERE UPPER(BTRIM(COALESCE(estado, 'COMPLETADO'))) <> 'RECHAZADO';

  UPDATE public.resumen_liquidacion
  SET
    total_negocio_cop = (SELECT COALESCE(SUM(ingreso_cop), 0) FROM public.negocios WHERE id IS NOT NULL),
    total_ventas_usdt_cop = v_total_ventas,
    total_liquidez_esperada_cop = v_total_liq_esp,
    total_gastos_cop = v_total_gastos,
    total_costos_dispersion_cop = v_total_costos_dispersion,
    total_activos_digitales_usdt = v_total_activos_digitales,
    total_activos_liquidos_cop = (SELECT COALESCE(SUM(saldo_cop), 0) FROM public.activos_liquidos WHERE id IS NOT NULL),
    total_saldo_pendiente_clientes_cop = (SELECT COALESCE(SUM(GREATEST(0, pendiente_cop)), 0) FROM public.clientes WHERE id IS NOT NULL),
    ganancia_esperada_cop = (v_total_ventas + v_total_liq_esp - v_total_clientes_ingresos - v_total_gastos - v_total_costos_dispersion),
    updated_at = NOW()
  WHERE id IS NOT NULL;

  RETURN NULL;
END;
$function$;
