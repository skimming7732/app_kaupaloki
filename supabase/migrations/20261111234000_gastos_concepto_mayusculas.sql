-- Forzar que el concepto de gasto siempre se guarde en MAYÚSCULAS en la base de datos
CREATE OR REPLACE FUNCTION public.trg_gastos_auto_fill()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_next_num integer;
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.fecha IS NULL THEN
    NEW.fecha := CURRENT_DATE;
  END IF;

  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;

  IF NEW.codigo IS NULL OR NEW.codigo = '' OR NEW.codigo = 'AUTO' THEN
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM 'G([0-9]+)')::integer), 0) + 1 INTO v_next_num FROM public.gastos;
    NEW.codigo := 'G' || LPAD(v_next_num::text, 5, '0');
  END IF;

  IF NEW.concepto IS NOT NULL THEN
    NEW.concepto := UPPER(TRIM(NEW.concepto));
  END IF;

  RETURN NEW;
END;
$function$;

-- Normalizar todos los conceptos existentes a MAYÚSCULAS
UPDATE public.gastos
SET concepto = UPPER(TRIM(concepto))
WHERE concepto IS NOT NULL AND concepto <> UPPER(TRIM(concepto));
