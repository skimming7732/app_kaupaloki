-- Migration: Add get_invited_user_info RPC to prefill onboarding
-- Allows an invited user to securely retrieve their assigned name and role on onboarding

CREATE OR REPLACE FUNCTION public.get_invited_user_info(p_email text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT jsonb_build_object(
    'fullName', p.full_name,
    'email', p.email,
    'role', p.role,
    'pais', p.pais
  )
  FROM public.profiles p
  WHERE lower(btrim(p.email)) = lower(btrim(p_email))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invited_user_info(text) TO anon, authenticated;
