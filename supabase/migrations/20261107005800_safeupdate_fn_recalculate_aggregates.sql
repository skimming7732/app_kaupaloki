-- Fix Postgres error 21000 caused by safeupdate extension requiring WHERE clauses on all UPDATE statements
CREATE OR REPLACE FUNCTION public.fn_recalculate_financial_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  v_total_clientes_ingresos NUMERIC;
  v_total_ventas NUMERIC;
  v_total_liq_esp NUMERIC;
  v_total_gastos NUMERIC;
BEGIN
  -- 1. Clientes
  UPDATE public.clientes c
  SET 
    ingresos_cop = CASE 
      WHEN EXISTS (SELECT 1 FROM public.negocios n WHERE n.cliente_id = c.id) 
        THEN COALESCE((SELECT SUM(n.ingreso_cop) FROM public.negocios n WHERE n.cliente_id = c.id), 0)
      ELSE COALESCE(c.ingresos_cop, 0)
    END,
    pagado_cop = (
      COALESCE((
        SELECT SUM(d.monto_cop) 
        FROM public.dispersiones d 
        WHERE d.cliente_id = c.id AND UPPER(COALESCE(d.estado, 'COMPLETADO')) != 'RECHAZADO'
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
    estado = CASE WHEN (ingresos_cop - pagado_cop) <= 0 AND ingresos_cop > 0 THEN 'PAGADO' ELSE 'PENDIENTE' END
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

  -- 3. Resumen Liquidacion variables
  SELECT COALESCE(SUM(ingresos_cop), 0) INTO v_total_clientes_ingresos FROM public.clientes WHERE id IS NOT NULL;
  SELECT COALESCE(SUM(total_cop), 0) INTO v_total_ventas FROM public.ventas_usdt WHERE id IS NOT NULL;
  SELECT COALESCE(SUM(liquidez_esperada_cop), 0) INTO v_total_liq_esp FROM public.activos_digitales WHERE activo != 'TEST' AND id IS NOT NULL;
  SELECT COALESCE(SUM(CASE WHEN divisa = 'COP' THEN monto ELSE monto * 4000 END), 0) INTO v_total_gastos FROM public.gastos WHERE id IS NOT NULL;

  UPDATE public.resumen_liquidacion
  SET 
    total_negocio_cop = (SELECT COALESCE(SUM(ingreso_cop), 0) FROM public.negocios WHERE id IS NOT NULL),
    total_ventas_usdt_cop = v_total_ventas,
    total_liquidez_esperada_cop = v_total_liq_esp,
    total_gastos_cop = v_total_gastos,
    total_activos_digitales_usdt = (SELECT COALESCE(SUM(saldo_usdt), 0) FROM public.activos_digitales WHERE activo != 'TEST' AND id IS NOT NULL),
    total_activos_liquidos_cop = (SELECT COALESCE(SUM(saldo_cop), 0) FROM public.activos_liquidos WHERE id IS NOT NULL),
    total_saldo_pendiente_clientes_cop = (SELECT COALESCE(SUM(GREATEST(0, pendiente_cop)), 0) FROM public.clientes WHERE id IS NOT NULL),
    ganancia_esperada_cop = (v_total_ventas + v_total_liq_esp - v_total_clientes_ingresos - v_total_gastos),
    updated_at = NOW()
  WHERE id IS NOT NULL;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
