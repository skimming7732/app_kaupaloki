-- Migration: Enforce UPPERCASE on profiles full_name and retroactively update existing records

UPDATE public.profiles 
SET full_name = UPPER(TRIM(full_name)) 
WHERE full_name IS NOT NULL;

UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', to_jsonb(UPPER(TRIM(raw_user_meta_data->>'full_name'))))
WHERE raw_user_meta_data->>'full_name' IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_profiles_enforce_uppercase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL THEN
    NEW.full_name := UPPER(TRIM(NEW.full_name));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_uppercase ON public.profiles;
CREATE TRIGGER trg_profiles_uppercase
BEFORE INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_profiles_enforce_uppercase();
