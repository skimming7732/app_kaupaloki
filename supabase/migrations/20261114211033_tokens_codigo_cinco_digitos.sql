-- Nuevos códigos TK00001 a TK99999; conservar códigos existentes y claves de retiro.
CREATE OR REPLACE FUNCTION public.trg_cash_tokens_auto_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
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

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '48 hours';
  END IF;

  IF NEW.estado IS NULL THEN
    NEW.estado := 'activo';
  END IF;
  NEW.status := NEW.estado;

  IF NEW.codigo IS NULL OR NEW.codigo = '' OR NEW.codigo = 'AUTO' THEN
    PERFORM pg_advisory_xact_lock(hashtext('public.cash_tokens.codigo'));
    SELECT COALESCE(MAX(SUBSTRING(codigo FROM '^TK([0-9]+)$')::integer), 0) + 1 INTO v_next_num FROM public.cash_tokens;
    IF v_next_num > 99999 THEN
      RAISE EXCEPTION 'Se alcanzó el máximo de códigos de token (TK99999).';
    END IF;
    NEW.codigo := 'TK' || LPAD(v_next_num::text, 5, '0');
  END IF;

  IF NEW.token_code IS NULL OR NEW.token_code = '' THEN
    NEW.token_code := UPPER(SUBSTRING(MD5(gen_random_uuid()::text || clock_timestamp()::text) FROM 1 FOR 8));
  END IF;

  NEW.token_code := UPPER(NEW.token_code);
  NEW.updated_at := clock_timestamp();

  RETURN NEW;
END;
$function$
;
