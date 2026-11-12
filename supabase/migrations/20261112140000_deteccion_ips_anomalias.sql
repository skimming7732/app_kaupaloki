-- Migration: Detección de anomalías por nueva dirección IP post 3 días de registro
-- Archivo: 20261112140000_deteccion_ips_anomalias.sql

-- 1. Tabla aislada de IPs conocidas por usuario
CREATE TABLE IF NOT EXISTS public.user_known_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  user_agent text,
  is_verified boolean NOT NULL DEFAULT true,
  verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_user_known_ip UNIQUE (user_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_user_known_ips_lookup ON public.user_known_ips (user_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_user_known_ips_user ON public.user_known_ips (user_id);

-- RLS exclusivo para user_known_ips (sin tocar ninguna otra tabla)
ALTER TABLE public.user_known_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios leen sus propias IPs" ON public.user_known_ips;
CREATE POLICY "Usuarios leen sus propias IPs"
  ON public.user_known_ips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Función segura para evaluar si la IP es nueva y si requiere verificación de correo
CREATE OR REPLACE FUNCTION public.check_user_ip_status(
  client_ip text,
  client_user_agent text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_created_at timestamptz;
  v_account_age_days numeric;
  v_ip_exists boolean;
  v_requires_email_otp boolean;
  v_total_known_ips integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  client_ip := trim(coalesce(client_ip, ''));
  IF client_ip = '' THEN
    RETURN jsonb_build_object(
      'client_ip', '',
      'is_new_ip', false,
      'requires_email_otp', false,
      'account_age_days', 0,
      'reason', 'no_ip_provided'
    );
  END IF;

  -- 1. Consultar fecha de registro original del usuario
  SELECT created_at INTO v_user_created_at
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_created_at IS NULL THEN
    SELECT coalesce(created_at_audit, created_at, NOW()) INTO v_user_created_at
    FROM public.profiles
    WHERE id = v_user_id;
  END IF;

  -- Calcular días transcurridos desde el registro
  v_account_age_days := ROUND(EXTRACT(EPOCH FROM (NOW() - coalesce(v_user_created_at, NOW()))) / 86400.0, 1);

  -- 2. Comprobar si la IP ya está en el registro de IPs autorizadas
  SELECT EXISTS(
    SELECT 1 FROM public.user_known_ips
    WHERE user_id = v_user_id AND ip_address = client_ip AND is_verified = true
  ) INTO v_ip_exists;

  SELECT COUNT(*) INTO v_total_known_ips
  FROM public.user_known_ips
  WHERE user_id = v_user_id AND is_verified = true;

  -- 3. Lógica del protocolo de seguridad:
  -- Caso A: La IP ya es conocida -> OK, solo 2FA
  -- Caso B: La cuenta tiene menos de 3 días (< 3.0) -> Período de gracia inicial, se auto-registra
  -- Caso C: La cuenta tiene >= 3 días y la IP es nueva -> ANOMALÍA: REQUIERE EMAIL OTP + 2FA
  IF v_ip_exists THEN
    UPDATE public.user_known_ips
    SET last_seen_at = clock_timestamp(),
        user_agent = coalesce(client_user_agent, user_agent)
    WHERE user_id = v_user_id AND ip_address = client_ip;

    v_requires_email_otp := false;
  ELSIF v_account_age_days < 3.0 THEN
    INSERT INTO public.user_known_ips (user_id, ip_address, user_agent, is_verified, verified_at, last_seen_at)
    VALUES (v_user_id, client_ip, client_user_agent, true, clock_timestamp(), clock_timestamp())
    ON CONFLICT (user_id, ip_address) DO UPDATE
      SET last_seen_at = clock_timestamp(),
          user_agent = coalesce(excluded.user_agent, public.user_known_ips.user_agent);

    v_requires_email_otp := false;
  ELSE
    v_requires_email_otp := true;
  END IF;

  RETURN jsonb_build_object(
    'client_ip', client_ip,
    'is_new_ip', NOT v_ip_exists,
    'requires_email_otp', v_requires_email_otp,
    'account_age_days', v_account_age_days,
    'known_ips_count', v_total_known_ips
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_ip_status(text, text) TO authenticated;

-- 3. Función para autorizar y guardar la nueva IP tras verificar correo y 2FA
CREATE OR REPLACE FUNCTION public.authorize_user_ip(
  client_ip text,
  client_user_agent text DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  client_ip := trim(coalesce(client_ip, ''));
  IF client_ip = '' THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_known_ips (
    user_id,
    ip_address,
    user_agent,
    is_verified,
    verified_at,
    last_seen_at
  )
  VALUES (
    v_user_id,
    client_ip,
    client_user_agent,
    true,
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (user_id, ip_address) DO UPDATE
    SET is_verified = true,
        verified_at = clock_timestamp(),
        last_seen_at = clock_timestamp(),
        user_agent = coalesce(excluded.user_agent, public.user_known_ips.user_agent);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authorize_user_ip(text, text) TO authenticated;
