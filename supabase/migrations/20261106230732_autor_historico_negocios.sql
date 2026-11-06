begin;

create or replace function public.registrar_autor_creacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
      where p.id = new.created_by and p.role in ('administrador', 'super_admin', 'operador', 'dispersor');

      if historical_author is null then
        raise foreign_key_violation using message = 'El autor seleccionado no está disponible';
      end if;

      new.created_by_name := historical_author;
      new.created_at_audit := old.created_at_audit;
      return new;
    end if;

    -- Provisioning may create a profile before the trusted invite handler runs.
    if tg_table_name <> 'profiles' or auth.role() is distinct from 'service_role'
       or old.created_by is not null or new.created_by is null then
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
$$;

commit;
