CREATE TABLE public.historial_ganancia_diaria (
  fecha date PRIMARY KEY,
  ganancia_cop numeric NOT NULL,
  registrado_en timestamptz NOT NULL
);

ALTER TABLE public.historial_ganancia_diaria ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historial_ganancia_diaria FROM public, anon, authenticated;
GRANT SELECT ON public.historial_ganancia_diaria TO authenticated;

CREATE POLICY historial_ganancia_admin_read ON public.historial_ganancia_diaria
  FOR SELECT TO authenticated
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador', 'super_admin'));

CREATE FUNCTION kaupaloki_private.capturar_ganancia_diaria() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $capture$
DECLARE
  ganancia numeric;
  instante timestamptz;
BEGIN
  -- Serialize a scheduled read with the statement updating the balance.
  SELECT r.ganancia_esperada_cop INTO ganancia
  FROM public.resumen_liquidacion r
  ORDER BY r.updated_at DESC NULLS LAST, r.id
  LIMIT 1 FOR SHARE;

  IF ganancia IS NULL THEN RETURN; END IF;
  instante := clock_timestamp();

  INSERT INTO public.historial_ganancia_diaria(fecha, ganancia_cop, registrado_en)
  VALUES (timezone('America/Bogota', instante)::date, ganancia, instante)
  ON CONFLICT (fecha) DO UPDATE
  SET ganancia_cop = excluded.ganancia_cop, registrado_en = excluded.registrado_en
  WHERE public.historial_ganancia_diaria.registrado_en <= excluded.registrado_en;
END;
$capture$;

CREATE FUNCTION kaupaloki_private.capturar_ganancia_al_liquidar() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $capture$
BEGIN
  PERFORM kaupaloki_private.capturar_ganancia_diaria();
  RETURN NULL;
END;
$capture$;

-- The trigger runs with the same guarded owner regardless of who updates the summary.
ALTER FUNCTION kaupaloki_private.capturar_ganancia_al_liquidar() SECURITY DEFINER;
REVOKE ALL ON FUNCTION kaupaloki_private.capturar_ganancia_diaria(), kaupaloki_private.capturar_ganancia_al_liquidar()
  FROM public, anon, authenticated;

CREATE TRIGGER capturar_ganancia_al_liquidar
  AFTER INSERT OR UPDATE ON public.resumen_liquidacion
  FOR EACH STATEMENT EXECUTE FUNCTION kaupaloki_private.capturar_ganancia_al_liquidar();

CREATE EXTENSION IF NOT EXISTS pg_cron;
-- pg_cron uses GMT on this project. 04:59 GMT is 23:59 in Bogotá.
SELECT cron.schedule('kaupaloki_cierre_ganancia_diaria', '59 4 * * *', $job$
  SELECT kaupaloki_private.capturar_ganancia_diaria();
$job$);

-- Seed only the actual current balance. Past closing balances are unavailable.
SELECT kaupaloki_private.capturar_ganancia_diaria();
