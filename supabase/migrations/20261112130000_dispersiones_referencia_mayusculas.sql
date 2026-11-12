-- Forzar siempre mayúsculas en las referencias de dispersiones
CREATE OR REPLACE FUNCTION public.trg_dispersiones_auto_fill()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_next_num integer;
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.numero IS NULL OR NEW.numero <= 0 THEN
    SELECT COALESCE(MAX(numero), 0) + 1 INTO v_next_num FROM public.dispersiones;
    NEW.numero := v_next_num;
  END IF;

  IF NEW.fecha IS NULL THEN
    NEW.fecha := NOW();
  END IF;

  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;

  IF NEW.estado IS NULL OR NEW.estado = '' THEN
    NEW.estado := 'COMPLETADO';
  END IF;

  IF NEW.codigo IS NULL OR NEW.codigo = '' OR NEW.codigo = 'AUTO' THEN
    NEW.codigo := 'D' || LPAD(NEW.numero::text, 4, '0');
  END IF;

  IF NEW.cliente_id IS NOT NULL AND (NEW.cliente_nombre IS NULL OR NEW.cliente_codigo IS NULL) THEN
    SELECT codigo, nombre INTO NEW.cliente_codigo, NEW.cliente_nombre FROM public.clientes WHERE id = NEW.cliente_id;
  END IF;

  -- Forzar referencia siempre en mayúsculas limpias
  IF NEW.referencia IS NOT NULL THEN
    NEW.referencia := UPPER(BTRIM(NEW.referencia));
  END IF;

  RETURN NEW;
END;
$function$;

-- Asegurar trigger en INSERT y UPDATE
DROP TRIGGER IF EXISTS trg_dispersiones_before_insert ON public.dispersiones;
DROP TRIGGER IF EXISTS trg_dispersiones_before_insert_or_update ON public.dispersiones;

CREATE TRIGGER trg_dispersiones_before_insert_or_update
  BEFORE INSERT OR UPDATE ON public.dispersiones
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dispersiones_auto_fill();

-- Actualizar registros existentes a mayúsculas
UPDATE public.dispersiones
SET referencia = UPPER(BTRIM(referencia))
WHERE referencia IS NOT NULL;
