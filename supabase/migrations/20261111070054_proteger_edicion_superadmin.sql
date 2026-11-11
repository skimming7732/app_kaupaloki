-- Check target permissions before touching Auth or profile fields.
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
  if not exists (select 1 from public.profiles where id=p_id and
    (actor='super_admin' or (role<>'super_admin' and not coalesce(is_super_admin,false))))
  then raise insufficient_privilege; end if;

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
