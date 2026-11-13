-- Lincoin credentials live only in Vault. All HTTP calls and rotation share
-- one transaction lock; the accounting balances are never changed here.
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS kaupaloki_private.lincoin_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  last_attempt_at timestamptz,
  consulted_at timestamptz,
  companies jsonb NOT NULL DEFAULT '[]',
  last_error text,
  blocked boolean NOT NULL DEFAULT false,
  rotation_pending boolean NOT NULL DEFAULT false
);
ALTER TABLE kaupaloki_private.lincoin_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON kaupaloki_private.lincoin_state FROM PUBLIC, anon, authenticated;
INSERT INTO kaupaloki_private.lincoin_state(id) VALUES(true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION kaupaloki_private.lincoin_request(p_method text, p_cred jsonb)
RETURNS extensions.http_response LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  ruta text := '/functions/v1/api-empresas';
  hora text := to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  nonce text := encode(extensions.gen_random_bytes(16), 'hex');
  secret text := translate(p_cred->>'secreto', '-_', '+/');
  signature text;
BEGIN
  IF p_method = 'POST' THEN ruta := ruta || '/rotar'; END IF;
  signature := encode(extensions.hmac(convert_to(concat_ws(E'\n', p_method, ruta, '', hora, nonce,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'), 'UTF8'),
    decode(secret || repeat('=', (4 - length(secret) % 4) % 4), 'base64'), 'sha256'), 'hex');
  -- Keep the whole RPC below the authenticated PostgREST statement timeout.
  PERFORM set_config('http.curlopt_connecttimeout_msec', '1500', true);
  PERFORM set_config('http.curlopt_timeout_msec', '3000', true);
  RETURN extensions.http(ROW(p_method::extensions.http_method, 'https://wqleypebmfiaygrurnrc.supabase.co' || ruta,
    ARRAY[
      ROW('X-Llave-Id', p_cred->>'llave_id')::extensions.http_header,
      ROW('X-Generacion', p_cred->>'generacion')::extensions.http_header,
      ROW('X-Hora', hora)::extensions.http_header,
      ROW('X-Nonce', nonce)::extensions.http_header,
      ROW('X-Firma', signature)::extensions.http_header,
      ROW('X-Dispositivo', 'kaupaloki-supabase')::extensions.http_header
    ], CASE WHEN p_method = 'POST' THEN 'application/json' ELSE NULL END,
    CASE WHEN p_method = 'POST' THEN '' ELSE NULL END)::extensions.http_request);
END;
$$;
REVOKE ALL ON FUNCTION kaupaloki_private.lincoin_request(text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION kaupaloki_private.sync_lincoin()
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  state kaupaloki_private.lincoin_state%ROWTYPE;
  secret_id uuid;
  cred jsonb;
  result extensions.http_response;
  payload jsonb;
BEGIN
  IF NOT pg_try_advisory_xact_lock(193701, 461) THEN RETURN; END IF;
  SELECT * INTO state FROM kaupaloki_private.lincoin_state WHERE id;
  IF state.blocked OR state.last_attempt_at > clock_timestamp() - interval '30 seconds' THEN RETURN; END IF;
  UPDATE kaupaloki_private.lincoin_state SET last_attempt_at = clock_timestamp() WHERE id;
  SELECT id, decrypted_secret::jsonb INTO secret_id, cred
    FROM vault.decrypted_secrets WHERE name = 'lincoin_api_credential';
  IF cred IS NULL THEN
    UPDATE kaupaloki_private.lincoin_state SET last_error = 'La credencial de Lincoin no está configurada.' WHERE id;
    RETURN;
  END IF;

  IF state.rotation_pending OR (cred->>'rotated_at')::timestamptz < clock_timestamp() - interval '1 hour' THEN
    -- Persist pending even on timeout: retry /rotar before any GET with the old
    -- generation. Lincoin supports recovery while the new secret is unused.
    UPDATE kaupaloki_private.lincoin_state SET rotation_pending = true WHERE id;
    BEGIN
      result := kaupaloki_private.lincoin_request('POST', cred);
      IF result.status <> 200 THEN
        UPDATE kaupaloki_private.lincoin_state SET
          last_error = 'Lincoin: error al renovar la credencial (HTTP ' || result.status || ').',
          blocked = result.status IN (401,403) WHERE id;
        RETURN;
      END IF;
      payload := result.content::jsonb;
      IF coalesce(payload->>'secreto','') !~ '^[A-Za-z0-9_-]{43}$'
        OR coalesce((payload->>'generacion')::integer,0) <= (cred->>'generacion')::integer
        OR (payload->>'expira_at')::timestamptz IS NULL THEN
        RAISE EXCEPTION 'Invalid rotation response';
      END IF;
      cred := cred || jsonb_build_object('secreto', payload->>'secreto', 'generacion', payload->'generacion',
        'expira_at', payload->>'expira_at', 'rotated_at', clock_timestamp());
      PERFORM vault.update_secret(secret_id, cred::text);
      UPDATE kaupaloki_private.lincoin_state SET rotation_pending = false WHERE id;
    EXCEPTION WHEN OTHERS THEN
      UPDATE kaupaloki_private.lincoin_state SET last_error = 'No se pudo renovar Lincoin; se recuperará la rotación antes de consultar saldos.' WHERE id;
      RETURN;
    END;
  END IF;

  -- Separate exception scope: a failed balance request must not roll back an
  -- already saved rotation. Never surface upstream bodies or secrets.
  BEGIN
    result := kaupaloki_private.lincoin_request('GET', cred);
    IF result.status <> 200 THEN
      UPDATE kaupaloki_private.lincoin_state SET
        last_error = 'Lincoin respondió HTTP ' || result.status || '. Se conserva la última consulta.',
        blocked = result.status IN (401,403) WHERE id;
      RETURN;
    END IF;
    payload := result.content::jsonb;
    IF jsonb_typeof(payload->'empresas') IS DISTINCT FROM 'array'
      OR (payload->>'generado_at')::timestamptz IS NULL THEN
      RAISE EXCEPTION 'Invalid companies response';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(payload->'empresas') e
      WHERE coalesce(e->>'id','') = '' OR jsonb_typeof(e->'total_cop') IS DISTINCT FROM 'number') THEN
      RAISE EXCEPTION 'Invalid company balance';
    END IF;
    UPDATE kaupaloki_private.lincoin_state SET companies = payload->'empresas',
      consulted_at = (payload->>'generado_at')::timestamptz, last_error = NULL WHERE id;
  EXCEPTION WHEN OTHERS THEN
    UPDATE kaupaloki_private.lincoin_state SET last_error = 'No se pudo consultar Lincoin. Se conserva el último saldo y su fecha.' WHERE id;
  END;
END;
$$;
REVOKE ALL ON FUNCTION kaupaloki_private.sync_lincoin() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION kaupaloki_private.read_lincoin_balances()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE answer jsonb;
BEGIN
  IF auth.uid() IS NULL OR coalesce(kaupaloki_private.staff_role(), '') NOT IN
    ('administrador','super_admin','supervisor','auditor') OR NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
        AND coalesce(lower(trim(p.status::text)), '') NOT IN ('inactivo','inactive','invitado','invited')
    ) THEN
    RAISE EXCEPTION 'No autorizado para consultar activos líquidos' USING ERRCODE = '42501';
  END IF;
  PERFORM kaupaloki_private.sync_lincoin();
  SELECT jsonb_build_object('error', s.last_error, 'balances', coalesce((
    SELECT jsonb_agg(jsonb_build_object('asset_id', a.id, 'api_id', a.api_id,
      'saldo_real', e->'total_cop', 'consultado_at', s.consulted_at))
    FROM public.activos_liquidos a
    JOIN LATERAL jsonb_array_elements(s.companies) e ON e->>'id' = upper(trim(a.api_id))
    LEFT JOIN public.instituciones i ON i.id = a.institucion_id
    WHERE lower(trim(coalesce(i.name, a.institucion, ''))) = 'lincoin' AND a.divisa = 'COP'
  ), '[]'::jsonb)) INTO answer FROM kaupaloki_private.lincoin_state s WHERE s.id;
  RETURN answer;
END;
$$;
REVOKE ALL ON FUNCTION kaupaloki_private.read_lincoin_balances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kaupaloki_private.read_lincoin_balances() TO authenticated;

CREATE OR REPLACE FUNCTION public.lincoin_balances()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT kaupaloki_private.read_lincoin_balances();
$$;
REVOKE ALL ON FUNCTION public.lincoin_balances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lincoin_balances() TO authenticated;

-- One server-side process, including when nobody has the app open.
SELECT cron.schedule('kaupaloki_lincoin_sync', '* * * * *',
  'SELECT kaupaloki_private.sync_lincoin();');
