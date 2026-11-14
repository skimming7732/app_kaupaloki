-- Nuevos códigos: D00001 a D99999. Conservar referencias históricas.
CREATE OR REPLACE FUNCTION public.trg_dispersiones_auto_fill()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_next_num integer;
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.numero IS NULL OR NEW.numero <= 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext('public.dispersiones.numero'));
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
    IF NEW.numero > 99999 THEN
      RAISE EXCEPTION 'Se alcanzó el máximo de códigos de dispersión (D99999).';
    END IF;
    NEW.codigo := 'D' || LPAD(NEW.numero::text, 5, '0');
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
