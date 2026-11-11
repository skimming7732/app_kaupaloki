-- 2FA Recovery and Admin Reset functions

-- 1. Función para que un usuario restablezca su propio 2FA (por ejemplo durante recuperación de contraseña)
CREATE OR REPLACE FUNCTION public.restablecer_mi_2fa()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  UPDATE public.profiles
  SET two_factor_enabled = false,
      two_factor_secret = null,
      two_factor_backup_codes = null,
      biometric_credentials = '[]'::jsonb,
      updated_at = NOW()
  WHERE id = auth.uid();

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.restablecer_mi_2fa() TO authenticated;

-- 2. Función para que administradores o superadministradores restablezcan el 2FA de un usuario
CREATE OR REPLACE FUNCTION public.admin_restablecer_2fa(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT CASE
    WHEN lower(trim(p.role::text)) IN ('super_admin', 'superadmin') THEN 'super_admin'
    WHEN lower(trim(p.role::text)) IN ('admin', 'administrador') THEN 'administrador'
    ELSE lower(trim(p.role::text))
  END INTO v_caller_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_caller_role NOT IN ('super_admin', 'administrador') THEN
    RAISE EXCEPTION 'No tienes permisos de administrador para restablecer el 2FA de este usuario.';
  END IF;

  UPDATE public.profiles
  SET two_factor_enabled = false,
      two_factor_secret = null,
      two_factor_backup_codes = null,
      biometric_credentials = '[]'::jsonb,
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_restablecer_2fa(uuid) TO authenticated;

-- 3. Actualizar listar_perfiles_dashboard para incluir two_factor_enabled
CREATE OR REPLACE FUNCTION public.listar_perfiles_dashboard()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  select coalesce(jsonb_agg(to_jsonb(d) order by d.full_name), '[]'::jsonb)
  from (
    select id, email, full_name, role, pais, operator_code, status, authorized_currencies,
           created_by, created_by_name, created_at_audit, coalesce(two_factor_enabled, false) as two_factor_enabled
    from public.profiles
    where (select kaupaloki_private.staff_role()) in ('administrador','super_admin','supervisor','auditor')
  ) d;
$$;
GRANT EXECUTE ON FUNCTION public.listar_perfiles_dashboard() TO authenticated;
