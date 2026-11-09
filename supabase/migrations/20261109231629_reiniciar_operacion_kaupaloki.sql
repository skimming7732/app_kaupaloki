-- Installs the reset procedure without running it.
CREATE FUNCTION kaupaloki_private.reiniciar_operacion(p_confirmacion text) RETURNS void
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
