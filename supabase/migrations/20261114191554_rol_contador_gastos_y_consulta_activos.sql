-- Contador: expense registration, read-only assets and supporting catalogs.
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin','administrador','supervisor','comercial','operador','dispersor','auditor','contador','client','cliente'));

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
    AND lower(trim(p.role::text)) IN ('administrador','admin','super_admin','superadmin','supervisor','supervisora','comercial','operador','dispersor','dispersador','auditor','contador')
    AND coalesce(lower(trim(p.status::text)),'') NOT IN ('inactivo','inactive')
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.actualizar_perfil_dashboard(p_id uuid, p_changes jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor text := kaupaloki_private.staff_role();
  changes public.profiles%rowtype;
  new_email text;
begin
  if coalesce(actor,'') not in ('administrador','super_admin') then raise insufficient_privilege; end if;
  changes := jsonb_populate_record(null::public.profiles, p_changes);

  if changes.role is not null and changes.role not in ('administrador','super_admin','supervisor','comercial','operador','dispersor','auditor','contador') then
    raise invalid_parameter_value;
  end if;
  if changes.status is not null and lower(changes.status) not in ('activo','invitado','inactivo') then raise invalid_parameter_value; end if;
  if actor <> 'super_admin' and changes.role = 'super_admin' then raise insufficient_privilege; end if;

  -- Handle email update if provided
  if p_changes ? 'email' then
    new_email := lower(trim(p_changes->>'email'));
    if new_email is not null and new_email <> '' then
      if exists (select 1 from auth.users where lower(email) = new_email and id <> p_id) then
        raise exception 'El correo % ya se encuentra registrado.', new_email;
      end if;

      update auth.users
      set email = new_email,
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', new_email),
          updated_at = now()
      where id = p_id;
    end if;
  end if;

  update public.profiles
  set email = coalesce(new_email, email),
      full_name = coalesce(changes.full_name, full_name),
      pais = coalesce(changes.pais, pais),
      role = coalesce(changes.role, role),
      status = coalesce(lower(changes.status), status),
      authorized_currencies = coalesce(changes.authorized_currencies, authorized_currencies)
  where id = p_id and (actor = 'super_admin' or (role <> 'super_admin' and not coalesce(is_super_admin, false)));

  -- Keep auth.users metadata in sync with profile updates
  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'role', (select role from public.profiles where id = p_id),
           'full_name', (select full_name from public.profiles where id = p_id),
           'authorized_currencies', (select authorized_currencies from public.profiles where id = p_id),
           'pais', (select pais from public.profiles where id = p_id)
         ),
      updated_at = now()
  where id = p_id;

  return found;
end;
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
  IF NEW.operator_code IS NULL OR NEW.operator_code = '' OR NEW.operator_code = 'AUTO'
    OR (TG_OP='UPDATE' AND NEW.role='contador' AND OLD.role IS DISTINCT FROM NEW.role) THEN
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
    ELSIF NEW.role = 'contador' THEN
      v_role_prefix := 'CT';
    ELSIF NEW.role = 'auditor' THEN
      v_role_prefix := 'AU';
    ELSIF NEW.role = 'cliente' OR NEW.role = 'client' THEN
      v_role_prefix := 'CL';
    ELSE
      v_role_prefix := 'OP';
    END IF;

    PERFORM pg_advisory_xact_lock(814636, 3);

    SELECT COALESCE(MAX(
      NULLIF(SUBSTRING(operator_code FROM 4 FOR 3), '')::INTEGER
    ), 0) INTO v_max_num
    FROM public.profiles
    WHERE operator_code ~ '^U[A-Z]{2}[0-9]{3}-';

    v_num := v_max_num + 1;

    v_clean_name := UPPER(REGEXP_REPLACE(SPLIT_PART(TRIM(COALESCE(NEW.full_name, 'USR')), ' ', 1), '[^a-zA-Z0-9]+', '', 'g'));
    IF v_clean_name = '' THEN
      v_clean_name := 'USR';
    END IF;

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

ALTER POLICY "dashboard_staff_only" ON public.gastos USING ((((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text])) OR (( SELECT kaupaloki_private.staff_role() AS staff_role) = 'supervisor'::text))) OR (SELECT kaupaloki_private.staff_role())='contador');
ALTER POLICY "roles_read_scope" ON public.gastos USING (((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text, 'auditor'::text]))) OR (SELECT kaupaloki_private.staff_role())='contador');
CREATE POLICY contador_consulta ON public.gastos FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role())='contador');

ALTER POLICY "dashboard_staff_only" ON public.activos_liquidos USING ((((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text])) OR (( SELECT kaupaloki_private.staff_role() AS staff_role) = 'supervisor'::text))) OR (SELECT kaupaloki_private.staff_role())='contador');
ALTER POLICY "roles_read_scope" ON public.activos_liquidos USING (((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text, 'auditor'::text]))) OR (SELECT kaupaloki_private.staff_role())='contador');
CREATE POLICY contador_consulta ON public.activos_liquidos FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role())='contador');

ALTER POLICY "dashboard_staff_only" ON public.activos_digitales USING ((((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text])) OR (( SELECT kaupaloki_private.staff_role() AS staff_role) = 'supervisor'::text))) OR (SELECT kaupaloki_private.staff_role())='contador');
ALTER POLICY "roles_read_scope" ON public.activos_digitales USING (((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text, 'auditor'::text]))) OR (SELECT kaupaloki_private.staff_role())='contador');
CREATE POLICY contador_consulta ON public.activos_digitales FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role())='contador');

ALTER POLICY "roles_read_scope" ON public.instituciones USING (((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text, 'comercial'::text, 'operador'::text, 'dispersor'::text, 'auditor'::text]))) OR (SELECT kaupaloki_private.staff_role())='contador');
CREATE POLICY contador_consulta ON public.instituciones FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role())='contador');

ALTER POLICY "dashboard_staff_only" ON public.divisas USING ((((( SELECT kaupaloki_private.staff_role() AS staff_role) IS NOT NULL) OR (( SELECT kaupaloki_private.staff_role() AS staff_role) = 'supervisor'::text))) OR (SELECT kaupaloki_private.staff_role())='contador');
ALTER POLICY "roles_read_scope" ON public.divisas USING (((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text, 'comercial'::text, 'operador'::text, 'dispersor'::text, 'auditor'::text]))) OR (SELECT kaupaloki_private.staff_role())='contador');
CREATE POLICY contador_consulta ON public.divisas FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role())='contador');

ALTER POLICY "roles_register" ON public.gastos WITH CHECK (((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text]))) OR ((SELECT kaupaloki_private.staff_role())='contador'
 AND monto > 0 AND origen_fondos IS DISTINCT FROM 'Capital & Socios'
 AND ((divisa='COP' AND EXISTS(SELECT 1 FROM public.activos_liquidos a WHERE a.id::text=origen_fondos_id))
   OR (divisa='USDT' AND EXISTS(SELECT 1 FROM public.activos_digitales a WHERE a.id::text=origen_fondos_id)))
 AND (nullif(btrim(comprobante_url),'') IS NULL OR (
   split_part(comprobante_url,'/',1)='storage:gastos' AND split_part(comprobante_url,'/',2)=(SELECT auth.uid())::text
   AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='comprobantes' AND o.name=substr(comprobante_url,9) AND o.owner_id=(SELECT auth.uid())::text)
 ))));
ALTER POLICY "roles_write_insert" ON public.gastos WITH CHECK (((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text]))) OR ((SELECT kaupaloki_private.staff_role())='contador'
 AND monto > 0 AND origen_fondos IS DISTINCT FROM 'Capital & Socios'
 AND ((divisa='COP' AND EXISTS(SELECT 1 FROM public.activos_liquidos a WHERE a.id::text=origen_fondos_id))
   OR (divisa='USDT' AND EXISTS(SELECT 1 FROM public.activos_digitales a WHERE a.id::text=origen_fondos_id)))
 AND (nullif(btrim(comprobante_url),'') IS NULL OR (
   split_part(comprobante_url,'/',1)='storage:gastos' AND split_part(comprobante_url,'/',2)=(SELECT auth.uid())::text
   AND EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='comprobantes' AND o.name=substr(comprobante_url,9) AND o.owner_id=(SELECT auth.uid())::text)
 ))));
ALTER POLICY "comprobantes_only_staff_upload" ON storage.objects WITH CHECK ((((bucket_id <> 'comprobantes'::text) OR ((split_part(name, '/'::text, 2) = (( SELECT auth.uid() AS uid))::text) AND (((split_part(name, '/'::text, 1) = ANY (ARRAY['gastos'::text, 'dispersiones'::text])) AND (( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text]))) OR ((split_part(name, '/'::text, 1) = 'dispersiones'::text) AND (( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['operador'::text, 'dispersor'::text])) AND kaupaloki_private.puede_operar_divisa('COP'::text)))))) OR (bucket_id='comprobantes' AND split_part(name,'/',1)='gastos' AND split_part(name,'/',2)=(SELECT auth.uid())::text AND (SELECT kaupaloki_private.staff_role())='contador'));
ALTER POLICY "comprobantes_staff_upload" ON storage.objects WITH CHECK ((((bucket_id = 'comprobantes'::text) AND (split_part(name, '/'::text, 2) = (( SELECT auth.uid() AS uid))::text) AND (((split_part(name, '/'::text, 1) = ANY (ARRAY['gastos'::text, 'dispersiones'::text])) AND (( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text]))) OR ((split_part(name, '/'::text, 1) = 'dispersiones'::text) AND (( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['operador'::text, 'dispersor'::text])) AND kaupaloki_private.puede_operar_divisa('COP'::text))))) OR (bucket_id='comprobantes' AND split_part(name,'/',1)='gastos' AND split_part(name,'/',2)=(SELECT auth.uid())::text AND (SELECT kaupaloki_private.staff_role())='contador'));
ALTER POLICY "comprobantes_only_staff_read" ON storage.objects USING ((((bucket_id <> 'comprobantes'::text) OR ((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text, 'auditor'::text])) OR ((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['operador'::text, 'dispersor'::text])) AND kaupaloki_private.puede_operar_divisa('COP'::text) AND (split_part(name, '/'::text, 1) = 'dispersiones'::text))))) OR (bucket_id='comprobantes' AND split_part(name,'/',1)='gastos' AND (SELECT kaupaloki_private.staff_role())='contador'));
ALTER POLICY "comprobantes_staff_read" ON storage.objects USING ((((bucket_id = 'comprobantes'::text) AND ((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['administrador'::text, 'super_admin'::text, 'supervisor'::text, 'auditor'::text])) OR ((( SELECT kaupaloki_private.staff_role() AS staff_role) = ANY (ARRAY['operador'::text, 'dispersor'::text])) AND kaupaloki_private.puede_operar_divisa('COP'::text) AND (split_part(name, '/'::text, 1) = 'dispersiones'::text))))) OR (bucket_id='comprobantes' AND split_part(name,'/',1)='gastos' AND (SELECT kaupaloki_private.staff_role())='contador'));
NOTIFY pgrst, 'reload schema';

CREATE OR REPLACE FUNCTION kaupaloki_private.read_lincoin_balances()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE answer jsonb;
BEGIN
  IF auth.uid() IS NULL OR coalesce(kaupaloki_private.staff_role(), '') NOT IN
    ('administrador','super_admin','supervisor','auditor','contador') OR NOT EXISTS (
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
$function$;
