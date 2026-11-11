-- Auth user_metadata is user-editable and must never grant a staff role.
-- Invitations assign the validated role afterwards through their service-side profile upsert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
 SECURITY DEFINER
AS $function$
DECLARE
  v_currencies text[];
BEGIN
  IF NEW.raw_user_meta_data ? 'authorized_currencies' AND jsonb_typeof(NEW.raw_user_meta_data->'authorized_currencies') = 'array' THEN
    SELECT COALESCE(array_agg(elem), ARRAY[]::text[])
    INTO v_currencies
    FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'authorized_currencies') AS elem;
  ELSE
    v_currencies := ARRAY['USD', 'USDT', 'COP']::text[];
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    pais,
    authorized_currencies,
    onboarding_completed,
    status,
    is_super_admin
  )
  VALUES (
    NEW.id,
    LOWER(TRIM(NEW.email)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'client',
    COALESCE(NEW.raw_user_meta_data->>'pais', 'COL'),
    v_currencies,
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false),
    'invitado',
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    pais = COALESCE(EXCLUDED.pais, public.profiles.pais),
    authorized_currencies = CASE
      WHEN COALESCE(array_length(public.profiles.authorized_currencies, 1), 0) = 0 THEN EXCLUDED.authorized_currencies
      ELSE public.profiles.authorized_currencies
    END;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trg_profiles_auto_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_role_prefix TEXT;
  v_clean_name TEXT;
  v_country TEXT;
  v_max_num INTEGER;
  v_num INTEGER;
BEGIN
  -- Only the trusted staff workflow can move a newly registered client to staff.
  IF TG_OP='UPDATE' AND OLD.role IN ('client','cliente')
    AND NEW.role NOT IN ('client','cliente') AND COALESCE(NEW.operator_code,'') ~ '^UCL[0-9]+-' THEN
    NEW.operator_code := 'AUTO';
  END IF;
  -- If operator_code already set and valid, do not overwrite unless requested
  IF NEW.operator_code IS NULL OR NEW.operator_code = '' OR NEW.operator_code = 'AUTO' THEN
    IF NEW.role = 'super_admin' THEN
      v_role_prefix := 'SA';
    ELSIF NEW.role = 'administrador' OR NEW.role = 'admin' THEN
      v_role_prefix := 'AD';
    ELSIF NEW.role = 'dispersor' OR NEW.role = 'dispersador' THEN
      v_role_prefix := 'DS';
    ELSIF NEW.role = 'comercial' THEN
      v_role_prefix := 'CO';
    ELSIF NEW.role = 'supervisor' THEN
      v_role_prefix := 'SU';
    ELSIF NEW.role = 'cliente' OR NEW.role = 'client' THEN
      v_role_prefix := 'CL';
    ELSE
      v_role_prefix := 'OP';
    END IF;

    PERFORM pg_advisory_xact_lock(814636, 3);

    -- Extract max number
    SELECT COALESCE(MAX(
      NULLIF(SUBSTRING(operator_code FROM 4 FOR 3), '')::INTEGER
    ), 0) INTO v_max_num
    FROM public.profiles
    WHERE operator_code ~ '^U[A-Z]{2}[0-9]{3}-';

    v_num := v_max_num + 1;

    -- Clean first name (alphanumeric only)
    v_clean_name := UPPER(REGEXP_REPLACE(SPLIT_PART(TRIM(COALESCE(NEW.full_name, 'USR')), ' ', 1), '[^a-zA-Z0-9]+', '', 'g'));
    IF v_clean_name = '' THEN
      v_clean_name := 'USR';
    END IF;

    -- Clean country code
    v_country := UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(NEW.pais, 'COL'), '[^a-zA-Z0-9]+', '', 'g'), 1, 3));
    IF v_country = '' THEN
      v_country := 'COL';
    END IF;

    NEW.operator_code := 'U' || v_role_prefix || LPAD(v_num::TEXT, 3, '0') || '-' || v_clean_name || '-' || v_country;
  END IF;

  RETURN NEW;
END;
$function$
;
