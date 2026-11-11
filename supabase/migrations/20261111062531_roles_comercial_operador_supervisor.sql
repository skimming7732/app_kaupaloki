-- Role permissions are enforced by the database as well as the interface.
CREATE OR REPLACE FUNCTION kaupaloki_private.staff_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.role::text FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('administrador','super_admin','supervisor','comercial','operador','dispersor')
    AND coalesce(lower(p.status::text),'') NOT IN ('inactivo','inactive','invitado','invited');
$$;
REVOKE ALL ON FUNCTION kaupaloki_private.staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kaupaloki_private.staff_role() TO authenticated;

CREATE OR REPLACE FUNCTION kaupaloki_private.puede_operar_divisa(p_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT kaupaloki_private.staff_role() IS NOT NULL AND (
    kaupaloki_private.staff_role() NOT IN ('comercial','operador','dispersor') OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
      AND (coalesce(to_jsonb(p.authorized_currencies),'[]'::jsonb) = '[]'::jsonb
           OR to_jsonb(p.authorized_currencies) ? p_code)
    )
  );
$$;
REVOKE ALL ON FUNCTION kaupaloki_private.puede_operar_divisa(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kaupaloki_private.puede_operar_divisa(text) TO authenticated;

ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin','administrador','supervisor','comercial','operador','dispersor','client','cliente'));

CREATE FUNCTION kaupaloki_private.normalizar_divisas_por_rol() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.role IN ('administrador','super_admin','supervisor') THEN
    NEW := jsonb_populate_record(NEW, '{"authorized_currencies":[]}'::jsonb);
  ELSIF NEW.role = 'dispersor' THEN
    NEW := jsonb_populate_record(NEW, '{"authorized_currencies":["COP"]}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION kaupaloki_private.normalizar_divisas_por_rol() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER normalizar_divisas_por_rol BEFORE INSERT OR UPDATE OF role, authorized_currencies
ON public.profiles FOR EACH ROW EXECUTE FUNCTION kaupaloki_private.normalizar_divisas_por_rol();
UPDATE public.profiles SET authorized_currencies = (jsonb_populate_record(NULL::public.profiles, '{"authorized_currencies":[]}'::jsonb)).authorized_currencies WHERE role IN ('administrador','super_admin','supervisor');
UPDATE public.profiles SET authorized_currencies = (jsonb_populate_record(NULL::public.profiles, '{"authorized_currencies":["COP"]}'::jsonb)).authorized_currencies WHERE role = 'dispersor';

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

  if changes.role is not null and changes.role not in ('administrador','super_admin','supervisor','comercial','operador','dispersor') then
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
CREATE OR REPLACE FUNCTION public.listar_perfiles_dashboard()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(to_jsonb(d) order by d.full_name), '[]'::jsonb)
  from (select id,email,full_name,role,pais,operator_code,status,authorized_currencies,created_by,created_by_name,created_at_audit
        from public.profiles
        where (select kaupaloki_private.staff_role()) in ('administrador','super_admin','supervisor')) d;
$function$
;
CREATE OR REPLACE FUNCTION public.listar_comisionistas_dashboard()
 RETURNS SETOF comisionistas
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select * from public.comisionistas
  where (select kaupaloki_private.staff_role()) in ('administrador','super_admin','supervisor')
  order by fecha_creacion desc nulls last, id;
$function$
;
CREATE OR REPLACE FUNCTION public.ingresos_clientes_30_dias()
 RETURNS TABLE(fecha date, monto_cop numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  WITH periodo AS (
    SELECT timezone('America/Bogota', now())::date AS hoy
    WHERE (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','supervisor')
  ), ingresos AS (
    SELECT n.fecha, n.ingreso_cop AS monto
    FROM public.negocios n CROSS JOIN periodo p
    WHERE n.fecha BETWEEN p.hoy - 29 AND p.hoy
      AND EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = n.cliente_id)
    UNION ALL
    SELECT e.fecha, e.monto
    FROM public.efectivo e CROSS JOIN periodo p
    WHERE e.fecha BETWEEN p.hoy - 29 AND p.hoy
      AND upper(btrim(e.tipo)) = 'INGRESO'
      AND EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.id = e.cliente_id OR (e.cliente_id IS NULL AND c.codigo = e.cliente_codigo)
      )
  )
  SELECT p.hoy - d.n, coalesce(sum(i.monto), 0)
  FROM periodo p CROSS JOIN generate_series(0, 29) AS d(n)
  LEFT JOIN ingresos i ON i.fecha = p.hoy - d.n
  GROUP BY p.hoy - d.n
  ORDER BY p.hoy - d.n;
$function$
;
CREATE OR REPLACE FUNCTION public.guardar_comprobante_dashboard(p_table text, p_id uuid, p_receipt text, p_previous text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor text := coalesce(kaupaloki_private.staff_role(),'');
  current_receipt text;
  object_path text := substr(p_receipt,9);
begin
  if p_table is null or p_table not in ('gastos','dispersiones') then raise invalid_parameter_value; end if;
  if auth.uid() is null or (actor not in ('administrador','super_admin') and not (p_table='dispersiones' and (actor IN ('dispersor','operador') AND kaupaloki_private.puede_operar_divisa('COP')))) then
    raise insufficient_privilege;
  end if;
  if p_receipt is null or split_part(p_receipt,'/',1) <> 'storage:' || p_table
     or split_part(p_receipt,'/',2) <> auth.uid()::text
     or not exists (select 1 from storage.objects where bucket_id='comprobantes' and name=object_path and owner_id::text=auth.uid()::text)
  then raise exception 'Archivo no disponible' using errcode='22023'; end if;

  if p_table='dispersiones' then
    select comprobante_url into current_receipt from public.dispersiones where id=p_id for update;
  else
    select comprobante_url into current_receipt from public.gastos where id=p_id for update;
  end if;
  if not found then raise exception 'Registro no encontrado' using errcode='P0002'; end if;
  if current_receipt=p_receipt then return; end if;
  if nullif(btrim(current_receipt),'') is distinct from nullif(btrim(p_previous),'') then
    raise exception 'El comprobante cambió' using errcode='40001';
  end if;
  if p_table='dispersiones' then
    update public.dispersiones set comprobante_url=p_receipt,tiene_comprobante=true where id=p_id;
  else
    update public.gastos set comprobante_url=p_receipt where id=p_id;
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.guardar_comprobante_dispersion(p_id text, p_receipt text, p_previous text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not kaupaloki_private.puede_operar_divisa('COP') then raise insufficient_privilege; end if;
  if coalesce(kaupaloki_private.staff_role(),'') not in ('administrador','super_admin','dispersor','operador') then raise insufficient_privilege; end if;
  if p_receipt is null or split_part(p_receipt,'/',1) <> 'storage:dispersiones'
    or split_part(p_receipt,'/',2) <> auth.uid()::text
    or not exists (select 1 from storage.objects where bucket_id='comprobantes' and name=substr(p_receipt,9))
  then return false; end if;
  update public.dispersiones set comprobante_url=p_receipt,tiene_comprobante=true
  where id::text=p_id and nullif(btrim(comprobante_url),'') is not distinct from nullif(btrim(p_previous),'');
  return found;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.crear_enlace_cliente(p_client_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  share_token uuid := gen_random_uuid();
  share_pin text;
  random_hex text := replace(gen_random_uuid()::text, '-', '');
  existing jsonb;
  expiry timestamptz;
begin
  if coalesce(kaupaloki_private.staff_role(),'') not in ('administrador','super_admin','comercial','operador','dispersor') then raise insufficient_privilege; end if;
  if not exists (select 1 from public.clientes c where c.id::text = p_client_id) then
    raise foreign_key_violation;
  end if;
  perform pg_advisory_xact_lock(814637, hashtext(p_client_id));
  existing := public.obtener_enlace_cliente(p_client_id);
  if existing is not null then return existing; end if;
  share_pin := lpad(((('x' || substr(random_hex, 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0');
  insert into kaupaloki_private.portal_links(token, client_id, pin_hash)
  values (share_token, p_client_id, encode(sha256(convert_to(share_token::text || ':' || share_pin, 'UTF8')), 'hex'))
  returning expires_at into expiry;
  return jsonb_build_object('token', share_token, 'pin', share_pin, 'expiresAt', expiry);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.registrar_autor_creacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := auth.uid();
  historical_author text;
begin
  if tg_op = 'INSERT' and auth.role() = 'anon' then
    raise insufficient_privilege using message = 'Se requiere una sesión para crear registros';
  end if;

  if tg_op = 'UPDATE' then
    if tg_table_name = 'negocios' and old.created_by is null
       and nullif(btrim(old.created_by_name), '') is null and new.created_by is not null then
      if actor is null or not exists (
        select 1 from public.profiles p
        where p.id = actor and p.role in ('administrador', 'super_admin')
          and coalesce(lower(p.status::text), '') not in ('inactivo', 'inactive', 'invitado', 'invited')
      ) then
        raise insufficient_privilege using message = 'Solo un administrador puede asignar un autor histórico';
      end if;

      select coalesce(nullif(btrim(p.full_name), ''), p.id::text) into historical_author
      from public.profiles p
      where p.id = new.created_by and p.role in ('administrador', 'super_admin', 'operador', 'dispersor', 'comercial', 'supervisor');

      if historical_author is null then
        raise foreign_key_violation using message = 'El autor seleccionado no está disponible';
      end if;

      new.created_by_name := historical_author;
      new.created_at_audit := old.created_at_audit;
      return new;
    end if;

    -- Profiles created during invite or backfill can have created_by assigned when null
    if tg_table_name = 'profiles' and old.created_by is null and new.created_by is not null then
      select nullif(btrim(p.full_name), '') into historical_author
      from public.profiles p where p.id = new.created_by;
      new.created_by_name := coalesce(historical_author, new.created_by::text);
      new.created_at_audit := coalesce(old.created_at_audit, statement_timestamp());
      return new;
    end if;

    if tg_table_name <> 'profiles' or old.created_by is not null or new.created_by is null then
      new.created_by := old.created_by;
      new.created_by_name := old.created_by_name;
      new.created_at_audit := old.created_at_audit;
      return new;
    end if;
  end if;

  if tg_table_name = 'profiles' and auth.role() = 'service_role' then
    actor := coalesce(actor, new.created_by);
  end if;

  new.created_by := actor;
  new.created_by_name := null;
  new.created_at_audit := statement_timestamp();
  if actor is not null then
    select nullif(btrim(p.full_name), '') into new.created_by_name
    from public.profiles p where p.id = actor;
    new.created_by_name := coalesce(new.created_by_name, actor::text);
  end if;
  return new;
end;
$function$
;
-- Existing restrictive ALL policies must stay restrictive for writes. Split them
-- rather than adding Supervisor to ALL and accidentally granting write access.
DO $policies$
DECLARE t text; item record; command text; policy_roles text; read_expression text; write_roles text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','negocios','dispersiones','efectivo','compras_usdt','ventas_usdt',
    'activos_liquidos','activos_digitales','gastos','divisas','instituciones','comisionistas',
    'transferencias_internas','cash_tokens','resumen_liquidacion','historial_ganancia_diaria']
  LOOP
    FOR item IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename=t
      AND permissive='RESTRICTIVE' AND cmd IN ('ALL','SELECT') AND ('authenticated' = ANY(roles) OR 'public' = ANY(roles))
    LOOP
      SELECT string_agg(quote_ident(r),', ') INTO policy_roles FROM unnest(item.roles) r;
      read_expression := '(' || coalesce(item.qual,'true') || ') OR (SELECT kaupaloki_private.staff_role()) = ''supervisor''';
      IF item.cmd='SELECT' THEN
        EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)',item.policyname,t,read_expression);
      ELSE
        EXECUTE format('DROP POLICY %I ON public.%I',item.policyname,t);
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO %s USING (%s)',item.policyname || '_read',t,policy_roles,read_expression);
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO %s WITH CHECK (%s)',item.policyname || '_insert',t,policy_roles,coalesce(item.with_check,item.qual,'true'));
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',item.policyname || '_update',t,policy_roles,coalesce(item.qual,'true'),coalesce(item.with_check,item.qual,'true'));
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO %s USING (%s)',item.policyname || '_delete',t,policy_roles,coalesce(item.qual,'true'));
      END IF;
    END LOOP;
    EXECUTE format('CREATE POLICY supervisor_consulta ON public.%I FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role()) = ''supervisor'')',t);
    write_roles := CASE t
      WHEN 'clientes' THEN '(''administrador'',''super_admin'',''operador'',''comercial'',''dispersor'')'
      WHEN 'negocios' THEN '(''administrador'',''super_admin'',''operador'',''comercial'')'
      WHEN 'dispersiones' THEN '(''administrador'',''super_admin'',''operador'',''dispersor'')'
      ELSE '(''administrador'',''super_admin'')' END;
    FOREACH command IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
      IF command='DELETE' THEN write_roles := '(''administrador'',''super_admin'')'; END IF;
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',
        'roles_write_' || lower(command),t,command,
        CASE command WHEN 'INSERT' THEN 'WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN ' || write_roles || ')'
        WHEN 'UPDATE' THEN 'USING ((SELECT kaupaloki_private.staff_role()) IN ' || write_roles || ') WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN ' || write_roles || ')'
        ELSE 'USING ((SELECT kaupaloki_private.staff_role()) IN ' || write_roles || ')' END);
    END LOOP;
    IF t IN ('clientes','negocios','dispersiones') THEN
      EXECUTE format('CREATE POLICY roles_register ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN %s)',t,
        CASE t WHEN 'clientes' THEN '(''administrador'',''super_admin'',''operador'',''comercial'',''dispersor'')'
        WHEN 'negocios' THEN '(''administrador'',''super_admin'',''operador'',''comercial'')'
        ELSE '(''administrador'',''super_admin'',''operador'',''dispersor'')' END);
      IF t IN ('negocios','dispersiones') THEN
        write_roles := CASE t WHEN 'negocios' THEN '(''administrador'',''super_admin'',''operador'',''comercial'')' ELSE '(''administrador'',''super_admin'',''operador'',''dispersor'')' END;
        EXECUTE format('CREATE POLICY roles_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT kaupaloki_private.staff_role()) IN %s) WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN %s)',t,write_roles,write_roles);
      END IF;
    END IF;
  END LOOP;
END;
$policies$;

-- COP is the only currency used for dispersions, including Operator access.
CREATE POLICY dispersiones_currency_read ON public.dispersiones AS RESTRICTIVE
FOR SELECT TO authenticated USING (kaupaloki_private.puede_operar_divisa('COP'));
CREATE POLICY dispersiones_currency_insert ON public.dispersiones AS RESTRICTIVE
FOR INSERT TO authenticated WITH CHECK (kaupaloki_private.puede_operar_divisa('COP'));
CREATE POLICY dispersiones_currency_update ON public.dispersiones AS RESTRICTIVE
FOR UPDATE TO authenticated USING (kaupaloki_private.puede_operar_divisa('COP'))
WITH CHECK (kaupaloki_private.puede_operar_divisa('COP'));

CREATE OR REPLACE FUNCTION public.cuentas_para_dispersion()
RETURNS TABLE (id text, activo text, institucion text, divisa text, "saldoReal" numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.id::text,a.activo::text,a.institucion::text,a.divisa::text,coalesce(a.saldo_real,a.saldo_cop)::numeric
  FROM public.activos_liquidos a
  WHERE (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','operador','dispersor')
    AND kaupaloki_private.puede_operar_divisa('COP') AND coalesce(a.divisa,'COP')='COP'
  ORDER BY a.activo;
$$;
REVOKE ALL ON FUNCTION public.cuentas_para_dispersion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cuentas_para_dispersion() TO authenticated;

-- Prevent legacy permissive policies from broadening the agreed view access.
DO $read_scope$
DECLARE t text; read_roles text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','negocios','dispersiones','efectivo','compras_usdt','ventas_usdt',
    'activos_liquidos','activos_digitales','gastos','divisas','instituciones','comisionistas',
    'transferencias_internas','cash_tokens','resumen_liquidacion','historial_ganancia_diaria',
    'capital_socios','capital_movimientos']
  LOOP
    read_roles := CASE
      WHEN t IN ('clientes','divisas','instituciones') THEN '(''administrador'',''super_admin'',''supervisor'',''comercial'',''operador'',''dispersor'')'
      WHEN t='negocios' THEN '(''administrador'',''super_admin'',''supervisor'',''comercial'',''operador'')'
      WHEN t='dispersiones' THEN '(''administrador'',''super_admin'',''supervisor'',''dispersor'',''operador'')'
      WHEN t IN ('capital_socios','capital_movimientos') THEN '(''administrador'',''super_admin'')'
      ELSE '(''administrador'',''super_admin'',''supervisor'')' END;
    EXECUTE format('CREATE POLICY roles_read_scope ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role()) IN %s)',t,read_roles);
  END LOOP;
END;
$read_scope$;


-- A directory must never expose other users' MFA secrets through profiles.*.
ALTER POLICY profiles_own_access_only ON public.profiles USING (id = (SELECT auth.uid()));
ALTER POLICY profiles_own_update_only ON public.profiles
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

CREATE FUNCTION public.activar_perfil_invitado() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE insufficient_privilege; END IF;
  UPDATE public.profiles SET status='activo',updated_at=now()
  WHERE id=auth.uid() AND lower(status) IN ('invitado','invited');
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.activar_perfil_invitado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activar_perfil_invitado() TO authenticated;

ALTER POLICY comprobantes_staff_read ON storage.objects USING (
  bucket_id='comprobantes' AND (
    (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','supervisor')
    OR ((SELECT kaupaloki_private.staff_role()) IN ('operador','dispersor')
        AND kaupaloki_private.puede_operar_divisa('COP') AND split_part(name,'/',1)='dispersiones')
  )
);
ALTER POLICY comprobantes_only_staff_read ON storage.objects USING (
  bucket_id<>'comprobantes' OR (
    (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','supervisor')
    OR ((SELECT kaupaloki_private.staff_role()) IN ('operador','dispersor')
        AND kaupaloki_private.puede_operar_divisa('COP') AND split_part(name,'/',1)='dispersiones')
  )
);
ALTER POLICY comprobantes_staff_upload ON storage.objects WITH CHECK (
  bucket_id='comprobantes' AND split_part(name,'/',2)=(SELECT auth.uid())::text AND (
    (split_part(name,'/',1) IN ('gastos','dispersiones') AND (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin'))
    OR (split_part(name,'/',1)='dispersiones' AND (SELECT kaupaloki_private.staff_role()) IN ('operador','dispersor') AND kaupaloki_private.puede_operar_divisa('COP'))
  )
);
ALTER POLICY comprobantes_only_staff_upload ON storage.objects WITH CHECK (
  bucket_id<>'comprobantes' OR (split_part(name,'/',2)=(SELECT auth.uid())::text AND (
    (split_part(name,'/',1) IN ('gastos','dispersiones') AND (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin'))
    OR (split_part(name,'/',1)='dispersiones' AND (SELECT kaupaloki_private.staff_role()) IN ('operador','dispersor') AND kaupaloki_private.puede_operar_divisa('COP'))
  ))
);
