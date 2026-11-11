-- Migration: Roles Auditor, Supervisor Write/Delete Permissions, and Global RLS Delete/Update Alignment

-- 1. Extend staff_role to include 'auditor'
CREATE OR REPLACE FUNCTION kaupaloki_private.staff_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.role::text FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('administrador','super_admin','supervisor','comercial','operador','dispersor','auditor')
    AND coalesce(lower(p.status::text),'') NOT IN ('inactivo','inactive','invitado','invited');
$$;
REVOKE ALL ON FUNCTION kaupaloki_private.staff_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kaupaloki_private.staff_role() TO authenticated;

-- 2. Update profiles role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin','administrador','supervisor','comercial','operador','dispersor','auditor','client','cliente'));

-- 3. Currency normalization for auditor (empty list, not currency-restricted)
CREATE OR REPLACE FUNCTION kaupaloki_private.normalizar_divisas_por_rol() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.role IN ('administrador','super_admin','supervisor','auditor') THEN
    NEW := jsonb_populate_record(NEW, '{"authorized_currencies":[]}'::jsonb);
  ELSIF NEW.role = 'dispersor' THEN
    NEW := jsonb_populate_record(NEW, '{"authorized_currencies":["COP"]}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Update actualizar_perfil_dashboard to permit assigning 'auditor'
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

  if changes.role is not null and changes.role not in ('administrador','super_admin','supervisor','comercial','operador','dispersor','auditor') then
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
$function$;

-- 5. User code generator trigger: prefix 'AU' for auditor
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
$function$;

-- 6. Helper functions allowing auditor read
CREATE OR REPLACE FUNCTION public.listar_perfiles_dashboard()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(to_jsonb(d) order by d.full_name), '[]'::jsonb)
  from (select id,email,full_name,role,pais,operator_code,status,authorized_currencies,created_by,created_by_name,created_at_audit
        from public.profiles
        where (select kaupaloki_private.staff_role()) in ('administrador','super_admin','supervisor','auditor')) d;
$function$;

CREATE OR REPLACE FUNCTION public.listar_comisionistas_dashboard()
 RETURNS SETOF comisionistas
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select * from public.comisionistas
  where (select kaupaloki_private.staff_role()) in ('administrador','super_admin','supervisor','auditor')
  order by fecha_creacion desc nulls last, id;
$function$;

CREATE OR REPLACE FUNCTION public.ingresos_clientes_30_dias()
 RETURNS TABLE(fecha date, monto_cop numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  WITH periodo AS (
    SELECT timezone('America/Bogota', now())::date AS hoy
    WHERE (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','supervisor','auditor')
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
$function$;

-- 7. Ensure aggregates recalculate dynamically on DELETE and UPDATE
CREATE OR REPLACE FUNCTION public.fn_recalculate_financial_aggregates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_saldo_neto_clientes NUMERIC;
  v_total_ventas NUMERIC;
  v_total_gastos NUMERIC;
  v_total_costos_dispersion NUMERIC;
  v_total_activos_digitales NUMERIC;
  v_total_activos_liquidos NUMERIC;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  -- 1a. Recalculate base operational income per client (negocios + efectivo ingreso)
  UPDATE public.clientes c
  SET
    total_negocios = COALESCE((SELECT COUNT(*) FROM public.negocios n WHERE n.cliente_id = c.id), 0),
    ingresos_cop = (
      COALESCE((SELECT SUM(n.ingreso_cop) FROM public.negocios n WHERE n.cliente_id = c.id), 0)
      + COALESCE((
        SELECT SUM(e.monto)
        FROM public.efectivo e
        WHERE UPPER(BTRIM(e.tipo)) = 'INGRESO'
          AND (e.cliente_id = c.id OR (e.cliente_id IS NULL AND e.cliente_codigo = c.codigo))
      ), 0)
    ),
    pagado_cop = (
      COALESCE((
        SELECT SUM(COALESCE(d.monto_cop, d.monto))
        FROM public.dispersiones d
        WHERE d.cliente_id = c.id AND UPPER(BTRIM(COALESCE(d.estado, 'COMPLETADO'))) != 'RECHAZADO'
      ), 0) +
      COALESCE((
        SELECT SUM(e.monto)
        FROM public.efectivo e
        WHERE e.cliente_id = c.id AND UPPER(BTRIM(e.tipo)) IN ('PAGO', 'EGRESO')
      ), 0)
    )
  WHERE c.id IS NOT NULL;

  -- 1b. Recalculate comisionistas based on referred clients' base operational income
  UPDATE public.comisionistas cm
  SET
    ingresos_cop = CASE
      WHEN cm.referidos_ids IS NOT NULL AND ARRAY_LENGTH(cm.referidos_ids, 1) > 0 THEN
        COALESCE((SELECT SUM(c.ingresos_cop) FROM public.clientes c WHERE c.id = ANY(cm.referidos_ids)), 0)
      ELSE 0
    END,
    comisiones_cop = CASE
      WHEN cm.referidos_ids IS NOT NULL AND ARRAY_LENGTH(cm.referidos_ids, 1) > 0 THEN
        COALESCE((SELECT SUM(c.ingresos_cop) FROM public.clientes c WHERE c.id = ANY(cm.referidos_ids)), 0) * COALESCE(cm.porcentaje_comision, 0)
      ELSE 0
    END
  WHERE cm.id IS NOT NULL;

  -- 1c. Add earned commissions to each comisionista client's ingresos_cop
  UPDATE public.clientes c
  SET ingresos_cop = c.ingresos_cop + COALESCE((
    SELECT SUM(cm.comisiones_cop) FROM public.comisionistas cm WHERE cm.cliente_id = c.id
  ), 0)
  WHERE EXISTS (SELECT 1 FROM public.comisionistas cm WHERE cm.cliente_id = c.id);

  -- 1d. Recompute client balances and status
  UPDATE public.clientes
  SET
    pendiente_cop = GREATEST(0, ingresos_cop - pagado_cop),
    saldo_cop = ingresos_cop - pagado_cop,
    estado = CASE
      WHEN ingresos_cop = 0 AND pagado_cop = 0 THEN 'SIN ACTIVIDAD'
      WHEN pagado_cop > ingresos_cop THEN 'DEBE'
      WHEN ingresos_cop = pagado_cop THEN 'PAGADO'
      ELSE 'PENDIENTE'
    END,
    pais = COALESCE(NULLIF(TRIM(pais), ''), 'Colombia')
  WHERE id IS NOT NULL;

  -- 2. Divisas
  UPDATE public.divisas d
  SET
    total_recibido = COALESCE((
      SELECT SUM(n.monto_divisa)
      FROM public.negocios n
      WHERE n.divisa_codigo = d.codigo
    ), 0),
    total_comprado = GREATEST(
      CASE WHEN d.codigo = 'USDT' THEN 0 ELSE COALESCE(d.total_comprado, 0) END,
      COALESCE((
        SELECT SUM(cu.valor_comprado)
        FROM public.compras_usdt cu
        WHERE cu.divisa_codigo = d.codigo
      ), 0)
    )
  WHERE d.id IS NOT NULL;

  UPDATE public.divisas
  SET total_pendiente = GREATEST(0, total_recibido - total_comprado)
  WHERE id IS NOT NULL;

  -- 3. Resumen Liquidacion variables con rate manual USDT/COP
  SELECT COALESCE(SUM(saldo_cop), 0) INTO v_saldo_neto_clientes FROM public.clientes;
  SELECT COALESCE(SUM(total_cop), 0) INTO v_total_ventas FROM public.ventas_usdt WHERE id IS NOT NULL;
  SELECT COALESCE(SUM(saldo_usdt), 0) INTO v_total_activos_digitales FROM public.activos_digitales WHERE activo != 'TEST' AND id IS NOT NULL;
  SELECT COALESCE(SUM(saldo_cop), 0) INTO v_total_activos_liquidos FROM public.activos_liquidos WHERE id IS NOT NULL;

  SELECT COALESCE(SUM(CASE WHEN divisa = 'COP' THEN monto ELSE monto * 4000 END), 0) INTO v_total_gastos FROM public.gastos WHERE id IS NOT NULL;

  SELECT COALESCE(SUM(costo_cop), 0) INTO v_total_costos_dispersion
  FROM public.dispersiones
  WHERE UPPER(BTRIM(COALESCE(estado, 'COMPLETADO'))) <> 'RECHAZADO';

  UPDATE public.resumen_liquidacion r
  SET
    total_negocio_cop = (SELECT COALESCE(SUM(ingreso_cop), 0) FROM public.negocios WHERE id IS NOT NULL),
    total_ventas_usdt_cop = v_total_ventas,
    total_activos_liquidos_cop = v_total_activos_liquidos,
    total_activos_digitales_usdt = v_total_activos_digitales,
    total_liquidez_esperada_cop = v_total_activos_digitales * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950),
    saldo_neto_clientes_cop = v_saldo_neto_clientes,
    total_gastos_cop = v_total_gastos,
    total_costos_dispersion_cop = v_total_costos_dispersion,
    total_saldo_pendiente_clientes_cop = (SELECT COALESCE(SUM(GREATEST(0, pendiente_cop)), 0) FROM public.clientes WHERE id IS NOT NULL),
    ganancia_esperada_cop = v_total_activos_liquidos
      + v_total_activos_digitales * COALESCE(NULLIF(GREATEST(r.rate_usdt_cop, 0), 0), 3950)
      - v_saldo_neto_clientes - COALESCE(r.total_capital_invertido_cop, 0),
    updated_at = NOW()
  WHERE r.id IS NOT NULL;

  RETURN NULL;
END;
$function$;

-- 8. RLS Alignment for all tables:
--    DELETE: Permissive + Restrictive for ('administrador', 'super_admin', 'supervisor')
--    UPDATE: Permissive + Restrictive for authorized staff roles per table (excluding auditor)
--    INSERT: Permissive + Restrictive for authorized staff roles per table (excluding auditor)
--    SELECT: Auditor added to read scopes
DO $rls_matrix$
DECLARE
  t text;
  edit_roles text;
  delete_roles text := '(''administrador'',''super_admin'',''supervisor'')';
  read_roles text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clientes','negocios','dispersiones','efectivo','compras_usdt','ventas_usdt',
    'activos_liquidos','activos_digitales','gastos','divisas','instituciones','comisionistas',
    'transferencias_internas','cash_tokens','resumen_liquidacion','historial_ganancia_diaria',
    'capital_socios','capital_movimientos'
  ]
  LOOP
    -- A. Determine authorized write/edit roles
    edit_roles := CASE t
      WHEN 'clientes' THEN '(''administrador'',''super_admin'',''supervisor'',''operador'',''comercial'',''dispersor'')'
      WHEN 'negocios' THEN '(''administrador'',''super_admin'',''supervisor'',''operador'',''comercial'')'
      WHEN 'dispersiones' THEN '(''administrador'',''super_admin'',''supervisor'',''operador'',''dispersor'')'
      WHEN 'efectivo' THEN '(''administrador'',''super_admin'',''supervisor'',''operador'')'
      WHEN 'capital_socios' THEN '(''administrador'',''super_admin'')'
      WHEN 'capital_movimientos' THEN '(''administrador'',''super_admin'')'
      ELSE '(''administrador'',''super_admin'',''supervisor'')'
    END;

    -- B. Determine authorized read roles (auditor included in all)
    read_roles := CASE
      WHEN t IN ('clientes','divisas','instituciones') THEN '(''administrador'',''super_admin'',''supervisor'',''comercial'',''operador'',''dispersor'',''auditor'')'
      WHEN t='negocios' THEN '(''administrador'',''super_admin'',''supervisor'',''comercial'',''operador'',''auditor'')'
      WHEN t='dispersiones' THEN '(''administrador'',''super_admin'',''supervisor'',''dispersor'',''operador'',''auditor'')'
      WHEN t IN ('capital_socios','capital_movimientos') THEN '(''administrador'',''super_admin'',''auditor'')'
      ELSE '(''administrador'',''super_admin'',''supervisor'',''auditor'')'
    END;

    -- 1. DELETE Policies
    EXECUTE format('DROP POLICY IF EXISTS roles_delete ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS negocios_admin_delete ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS roles_write_delete ON public.%I', t);

    -- Permissive DELETE
    EXECUTE format(
      'CREATE POLICY roles_delete ON public.%I FOR DELETE TO authenticated USING ((SELECT kaupaloki_private.staff_role()) IN %s)',
      t, delete_roles
    );
    -- Restrictive DELETE gate
    EXECUTE format(
      'CREATE POLICY roles_write_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT kaupaloki_private.staff_role()) IN %s)',
      t, delete_roles
    );

    -- 2. UPDATE Policies
    EXECUTE format('DROP POLICY IF EXISTS roles_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS roles_write_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS portal_staff_update ON public.%I', t);

    -- Permissive UPDATE
    EXECUTE format(
      'CREATE POLICY roles_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT kaupaloki_private.staff_role()) IN %s) WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN %s)',
      t, edit_roles, edit_roles
    );
    -- Restrictive UPDATE gate
    EXECUTE format(
      'CREATE POLICY roles_write_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT kaupaloki_private.staff_role()) IN %s) WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN %s)',
      t, edit_roles, edit_roles
    );

    -- 3. INSERT Policies
    EXECUTE format('DROP POLICY IF EXISTS roles_register ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS roles_write_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS portal_staff_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS gastos_admin_insert ON public.%I', t);

    -- Permissive INSERT
    EXECUTE format(
      'CREATE POLICY roles_register ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN %s)',
      t, edit_roles
    );
    -- Restrictive INSERT gate
    EXECUTE format(
      'CREATE POLICY roles_write_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT kaupaloki_private.staff_role()) IN %s)',
      t, edit_roles
    );

    -- 4. READ SCOPE (Restrictive filter on table)
    EXECUTE format('DROP POLICY IF EXISTS roles_read_scope ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY roles_read_scope ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role()) IN %s)',
      t, read_roles
    );

    -- 5. Permissive SELECT: Ensure at least one permissive policy exists for staff
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND permissive='PERMISSIVE' AND cmd IN ('SELECT','ALL')
    ) THEN
      EXECUTE format(
        'CREATE POLICY staff_select_permissive ON public.%I FOR SELECT TO authenticated USING ((SELECT kaupaloki_private.staff_role()) IS NOT NULL)',
        t
      );
    END IF;
  END LOOP;
END;
$rls_matrix$;

-- 9. Grants & client_shared_links delete permissions
GRANT DELETE ON public.client_shared_links TO authenticated;
DROP POLICY IF EXISTS client_shared_links_delete ON public.client_shared_links;
CREATE POLICY client_shared_links_delete ON public.client_shared_links
  FOR DELETE TO authenticated
  USING ((SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','supervisor'));

-- 10. Storage permissions for auditor to view comprobantes
ALTER POLICY comprobantes_staff_read ON storage.objects USING (
  bucket_id='comprobantes' AND (
    (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','supervisor','auditor')
    OR ((SELECT kaupaloki_private.staff_role()) IN ('operador','dispersor')
        AND kaupaloki_private.puede_operar_divisa('COP') AND split_part(name,'/',1)='dispersiones')
  )
);
ALTER POLICY comprobantes_only_staff_read ON storage.objects USING (
  bucket_id<>'comprobantes' OR (
    (SELECT kaupaloki_private.staff_role()) IN ('administrador','super_admin','supervisor','auditor')
    OR ((SELECT kaupaloki_private.staff_role()) IN ('operador','dispersor')
        AND kaupaloki_private.puede_operar_divisa('COP') AND split_part(name,'/',1)='dispersiones')
  )
);
