CREATE INDEX IF NOT EXISTS negocios_dashboard_order_idx ON public.negocios (fecha DESC, created_at_audit DESC NULLS LAST, numero DESC, id);
CREATE INDEX IF NOT EXISTS dispersiones_dashboard_order_idx ON public.dispersiones (fecha DESC, created_at_audit DESC NULLS LAST, numero DESC, id);
CREATE INDEX IF NOT EXISTS compras_usdt_dashboard_order_idx ON public.compras_usdt (fecha DESC, created_at_audit DESC NULLS LAST, numero DESC, id);
CREATE INDEX IF NOT EXISTS ventas_usdt_dashboard_order_idx ON public.ventas_usdt (fecha DESC, created_at_audit DESC NULLS LAST, numero DESC, id);
CREATE INDEX IF NOT EXISTS efectivo_dashboard_order_idx ON public.efectivo (fecha DESC, created_at_audit DESC NULLS LAST, created_at DESC NULLS LAST, id);
CREATE INDEX IF NOT EXISTS gastos_dashboard_order_idx ON public.gastos (fecha DESC, created_at_audit DESC NULLS LAST, created_at DESC NULLS LAST, id);
CREATE INDEX IF NOT EXISTS transferencias_internas_dashboard_order_idx ON public.transferencias_internas (fecha DESC, created_at_audit DESC NULLS LAST, created_at DESC NULLS LAST, id);
CREATE INDEX IF NOT EXISTS clientes_numero_idx ON public.clientes (numero DESC, id);
CREATE INDEX IF NOT EXISTS cash_tokens_dashboard_order_idx ON public.cash_tokens (created_at DESC, id);
CREATE INDEX IF NOT EXISTS comisionistas_fecha_idx ON public.comisionistas (fecha_creacion DESC NULLS LAST, id);
CREATE INDEX IF NOT EXISTS capital_movimientos_dashboard_order_idx ON public.capital_movimientos (fecha DESC, created_at_audit DESC NULLS LAST, created_at DESC NULLS LAST, numero DESC NULLS LAST, id);
CREATE INDEX IF NOT EXISTS negocios_cliente_idx ON public.negocios (cliente_id);
CREATE INDEX IF NOT EXISTS dispersiones_cliente_idx ON public.dispersiones (cliente_id);
CREATE INDEX IF NOT EXISTS efectivo_cliente_idx ON public.efectivo (cliente_id);
CREATE INDEX IF NOT EXISTS efectivo_cliente_codigo_idx ON public.efectivo (cliente_codigo) WHERE cliente_id IS NULL;
CREATE INDEX IF NOT EXISTS negocios_divisa_idx ON public.negocios (divisa_codigo);
CREATE INDEX IF NOT EXISTS compras_usdt_divisa_idx ON public.compras_usdt (divisa_codigo);

-- Installs the updated reset procedure without running it.
CREATE OR REPLACE FUNCTION kaupaloki_private.reiniciar_operacion(p_confirmacion text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' SET lock_timeout = '5s'
AS $reset$
DECLARE
  caja uuid;
BEGIN
  IF p_confirmacion IS DISTINCT FROM 'REINICIAR OPERACION KAUPALOKI' THEN
    RAISE EXCEPTION 'Confirmación de reinicio inválida.' USING ERRCODE = '22023';
  END IF;

  LOCK TABLE public.activos_liquidos, public.divisas, public.resumen_liquidacion IN ACCESS EXCLUSIVE MODE;
  SELECT id INTO STRICT caja
  FROM public.activos_liquidos
  WHERE upper(btrim(activo)) = 'EFECTIVO-CAJA'
    AND upper(btrim(institucion)) = 'EFECTIVO'
    AND COALESCE(divisa, 'COP') = 'COP';

  -- Explicit dependencies prevent cascading into catalogs or user records.
  -- TRUNCATE skips row triggers that would otherwise reverse each deleted movement.
  TRUNCATE TABLE
    public._nc_m2m_negocios_divisas,
    public.client_shared_links,
    public.cash_tokens,
    public.comisionistas,
    public.capital_movimientos,
    public.capital_socios,
    public.dispersiones,
    public.efectivo,
    public.gastos,
    public.transferencias_internas,
    public.compras_usdt,
    public.ventas_usdt,
    public.negocios,
    public.clientes,
    public.activos_digitales
  RESTART IDENTITY RESTRICT;

  DELETE FROM public.activos_liquidos WHERE id <> caja;

  UPDATE public.activos_liquidos
  SET saldo_cop = 0, saldo_real = 0, saldo_inicial = 0,
      ingresos_cop = 0, egresos_cop = 0, movimientos = '[]'::jsonb
  WHERE id = caja;

  UPDATE public.divisas
  SET total_recibido = 0, total_comprado = 0, total_pendiente = 0
  WHERE id IS NOT NULL;

  UPDATE public.resumen_liquidacion
  SET total_negocio_cop = 0, total_ventas_usdt_cop = 0, total_liquidez_esperada_cop = 0,
      ganancia_esperada_cop = 0, total_activos_digitales_usdt = 0, total_activos_liquidos_cop = 0,
      total_saldo_pendiente_clientes_cop = 0, saldo_neto_clientes_cop = 0, total_gastos_cop = 0,
      total_capital_invertido_cop = 0,
      total_costos_dispersion_cop = 0, updated_at = now()
  WHERE id IS NOT NULL;

  IF NOT FOUND THEN
    INSERT INTO public.resumen_liquidacion DEFAULT VALUES;
  END IF;

  -- The summary update captures today's value. Clear it as part of the reset.
  TRUNCATE TABLE public.historial_ganancia_diaria RESTRICT;
END;
$reset$;

REVOKE ALL ON FUNCTION kaupaloki_private.reiniciar_operacion(text) FROM PUBLIC, anon, authenticated, service_role;
