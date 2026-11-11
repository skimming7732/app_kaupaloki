-- Migration: Permitir acceso de Cuentas para Dispersión a roles Supervisor y Dispersor con datos completos de cuenta

-- 1. Normalizar staff_role para soportar alias y no bloquear usuarios invitados autenticados
CREATE OR REPLACE FUNCTION kaupaloki_private.staff_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT CASE
    WHEN lower(trim(p.role::text)) IN ('dispersador', 'dispersor') THEN 'dispersor'
    WHEN lower(trim(p.role::text)) IN ('super_admin', 'superadmin') THEN 'super_admin'
    WHEN lower(trim(p.role::text)) IN ('admin', 'administrador') THEN 'administrador'
    WHEN lower(trim(p.role::text)) IN ('supervisora', 'supervisor') THEN 'supervisor'
    ELSE lower(trim(p.role::text))
  END
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
    AND lower(trim(p.role::text)) IN ('administrador','admin','super_admin','superadmin','supervisor','supervisora','comercial','operador','dispersor','dispersador','auditor')
    AND coalesce(lower(trim(p.status::text)),'') NOT IN ('inactivo','inactive')
  LIMIT 1;
$function$;

-- 2. Asegurar que puede_operar_divisa siempre otorgue acceso COP a dispersores y acceso a supervisores
CREATE OR REPLACE FUNCTION kaupaloki_private.puede_operar_divisa(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT kaupaloki_private.staff_role() IS NOT NULL AND (
    kaupaloki_private.staff_role() IN ('administrador','super_admin','supervisor','auditor')
    OR (kaupaloki_private.staff_role() = 'dispersor' AND upper(trim(coalesce(p_code, 'COP'))) = 'COP')
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
      AND (
        coalesce(to_jsonb(p.authorized_currencies),'[]'::jsonb) = '[]'::jsonb
        OR to_jsonb(p.authorized_currencies) ? upper(trim(p_code))
        OR to_jsonb(p.authorized_currencies) ? lower(trim(p_code))
      )
    )
  );
$function$;

-- 3. Actualizar cuentas_para_dispersion para incluir a supervisores y devolver datos completos de cuenta
DROP FUNCTION IF EXISTS public.cuentas_para_dispersion();

CREATE FUNCTION public.cuentas_para_dispersion()
RETURNS TABLE (
  id text,
  activo text,
  institucion text,
  cuenta text,
  titular text,
  divisa text,
  "saldoReal" numeric,
  "saldoCop" numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    a.id::text,
    a.activo::text,
    a.institucion::text,
    a.cuenta::text,
    a.titular::text,
    coalesce(a.divisa, 'COP')::text AS divisa,
    coalesce(a.saldo_real, a.saldo_cop)::numeric AS "saldoReal",
    coalesce(a.saldo_cop, a.saldo_real)::numeric AS "saldoCop"
  FROM public.activos_liquidos a
  WHERE (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','supervisor','operador','dispersor')
    AND coalesce(upper(trim(a.divisa)), 'COP') = 'COP'
  ORDER BY a.activo;
$function$;

REVOKE ALL ON FUNCTION public.cuentas_para_dispersion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cuentas_para_dispersion() TO authenticated;
