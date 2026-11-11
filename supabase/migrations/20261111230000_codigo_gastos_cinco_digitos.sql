-- Estandarizar códigos de gastos con formato G00001 y autoincremento con 5 dígitos
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

  RETURN NEW;
END;
$function$;

-- Actualizar registros existentes que tengan formato G1, G2, etc., a G00001, G00002...
UPDATE public.gastos
SET codigo = 'G' || LPAD(SUBSTRING(codigo FROM 'G([0-9]+)')::text, 5, '0')
WHERE codigo ~ '^G[0-9]+$' AND LENGTH(SUBSTRING(codigo FROM 'G([0-9]+)')) < 5;
