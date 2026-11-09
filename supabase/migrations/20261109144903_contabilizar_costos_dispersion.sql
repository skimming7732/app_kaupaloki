ALTER TABLE public.dispersiones
  ADD COLUMN costo_origen_aplicado boolean NOT NULL DEFAULT false;

-- Track the principal and fee independently so posting a fee on a historical
-- dispersion cannot replay a principal already reflected in opening balances.
CREATE OR REPLACE FUNCTION kaupaloki_private.contabilizar_saldo_origen_dispersion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $balance$
DECLARE
  old_source text;
  new_source text;
  old_debit numeric := 0;
  new_debit numeric := 0;
  rejected boolean;
  principal numeric;
  entry record;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_source := nullif(btrim(old.origen_fondos_id), '');
    IF old.saldo_origen_aplicado THEN
      old_debit := coalesce(old.monto_cop, old.monto);
    END IF;
    IF old.costo_origen_aplicado THEN
      old_debit := old_debit + old.costo_cop;
    END IF;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_source := nullif(btrim(new.origen_fondos_id), '');
    rejected := upper(btrim(coalesce(new.estado, 'COMPLETADO'))) = 'RECHAZADO';
    principal := coalesce(new.monto_cop, new.monto);

    IF rejected THEN
      new.saldo_origen_aplicado := false;
    ELSIF TG_OP = 'INSERT'
       OR (new_source, new.monto_cop, new.monto, rejected) IS DISTINCT FROM
          (old_source, old.monto_cop, old.monto, upper(btrim(coalesce(old.estado, 'COMPLETADO'))) = 'RECHAZADO') THEN
      IF principal IS NULL OR NOT (principal > 0 AND principal < 'Infinity'::numeric) THEN
        RAISE EXCEPTION 'Ingresa un monto válido para completar la dispersión.';
      END IF;
      new.saldo_origen_aplicado := true;
    ELSE
      new.saldo_origen_aplicado := old.saldo_origen_aplicado;
    END IF;

    new.costo_origen_aplicado := NOT rejected AND new.costo_cop > 0;
    IF new.saldo_origen_aplicado OR new.costo_origen_aplicado THEN
      IF new_source IS NULL THEN
        RAISE EXCEPTION 'Vincula una cuenta de origen antes de completar la dispersión.';
      END IF;
      new.origen_fondos_id := new_source;
    END IF;
    IF new.saldo_origen_aplicado THEN
      new_debit := principal;
    END IF;
    IF new.costo_origen_aplicado THEN
      new_debit := new_debit + new.costo_cop;
    END IF;
  END IF;

  FOR entry IN
    SELECT account_id, sum(delta) AS amount
    FROM (VALUES (old_source, old_debit), (new_source, -new_debit)) amounts(account_id, delta)
    WHERE account_id IS NOT NULL
    GROUP BY account_id HAVING sum(delta) <> 0
    ORDER BY account_id
  LOOP
    UPDATE public.activos_liquidos
    SET saldo_cop = coalesce(saldo_cop, 0) + entry.amount,
        egresos_cop = coalesce(egresos_cop, 0) - entry.amount
    WHERE id::text = entry.account_id AND coalesce(divisa, 'COP') = 'COP'
      AND (entry.amount > 0 OR coalesce(saldo_cop, 0) >= -entry.amount);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La cuenta de origen no está disponible o su saldo contable es insuficiente para el monto y el costo.';
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN old; END IF;
  RETURN new;
END;
$balance$;

GRANT DELETE ON public.dispersiones TO authenticated;
CREATE POLICY dispersiones_admin_delete ON public.dispersiones
  FOR DELETE TO authenticated
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));

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
    ganancia_esperada_cop = (v_total_ventas + v_total_liq_esp - v_total_clientes_ingresos - v_total_gastos),
    updated_at = NOW()
  WHERE id IS NOT NULL;

  RETURN NULL;
END;
$function$;

-- The principal stays as posted. Re-run accounting only for existing fees
-- with an eligible linked account. The existing summary trigger refreshes KPIs.
UPDATE public.dispersiones d
SET costo_cop = d.costo_cop
WHERE d.costo_cop > 0
  AND NOT d.costo_origen_aplicado
  AND upper(btrim(coalesce(d.estado, 'COMPLETADO'))) <> 'RECHAZADO'
  AND EXISTS (
    SELECT 1 FROM public.activos_liquidos a
    WHERE a.id::text = nullif(btrim(d.origen_fondos_id), '') AND coalesce(a.divisa, 'COP') = 'COP'
  );
