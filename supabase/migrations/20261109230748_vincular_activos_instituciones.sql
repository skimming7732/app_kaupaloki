ALTER TABLE public.activos_liquidos
  ADD COLUMN institucion_id uuid REFERENCES public.instituciones(id) ON DELETE SET NULL,
  ADD COLUMN tipo text;

ALTER TABLE public.activos_digitales
  ADD COLUMN institucion_id uuid REFERENCES public.instituciones(id) ON DELETE SET NULL,
  ADD COLUMN tipo text,
  ALTER COLUMN red SET DEFAULT 'TRC20';

ALTER TABLE public.activos_digitales ALTER COLUMN tipo SET DEFAULT 'Billetera fría';

CREATE INDEX activos_liquidos_institucion_idx ON public.activos_liquidos(institucion_id);
CREATE INDEX activos_digitales_institucion_idx ON public.activos_digitales(institucion_id);

UPDATE public.instituciones
SET type = 'wallet', updated_at = now()
WHERE lower(btrim(name)) = 'tronlink' AND type = 'bank';

-- Match existing account names only when the catalog identifies a single institution.
WITH catalog AS (
  SELECT lower(btrim(name)) AS name, currency, (array_agg(id))[1] AS id, min(type) AS type
  FROM public.instituciones
  GROUP BY lower(btrim(name)), currency
  HAVING count(*) = 1
)
UPDATE public.activos_liquidos a
SET institucion_id = i.id, tipo = i.type
FROM catalog i
WHERE a.institucion_id IS NULL
  AND i.currency = COALESCE(a.divisa, 'COP')
  AND i.name = lower(btrim(a.institucion));

CREATE FUNCTION kaupaloki_private.validar_institucion_activo() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $asset$
DECLARE
  institucion public.instituciones%ROWTYPE;
  moneda text;
BEGIN
  IF NEW.institucion_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'activos_liquidos' THEN
    moneda := COALESCE(NEW.divisa, 'COP');
  ELSE
    moneda := 'USDT';
  END IF;

  SELECT * INTO institucion FROM public.instituciones WHERE id = NEW.institucion_id;
  IF NOT FOUND OR institucion.currency <> moneda THEN
    RAISE EXCEPTION 'La institución seleccionada no corresponde a %.', moneda USING ERRCODE = '22023';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF institucion.status <> 'active' THEN
      RAISE EXCEPTION 'La institución seleccionada no está activa.' USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.institucion_id IS DISTINCT FROM OLD.institucion_id AND institucion.status <> 'active' THEN
    RAISE EXCEPTION 'La institución seleccionada no está activa.' USING ERRCODE = '22023';
  END IF;

  IF TG_TABLE_NAME = 'activos_liquidos' THEN
    NEW.institucion := institucion.name;
    NEW.tipo := institucion.type;
  END IF;
  RETURN NEW;
END;
$asset$;

REVOKE ALL ON FUNCTION kaupaloki_private.validar_institucion_activo() FROM public, anon, authenticated;

CREATE TRIGGER validar_institucion_activo
BEFORE INSERT OR UPDATE OF institucion_id, divisa, institucion, tipo ON public.activos_liquidos
FOR EACH ROW EXECUTE FUNCTION kaupaloki_private.validar_institucion_activo();

CREATE TRIGGER validar_institucion_activo
BEFORE INSERT OR UPDATE OF institucion_id ON public.activos_digitales
FOR EACH ROW EXECUTE FUNCTION kaupaloki_private.validar_institucion_activo();
