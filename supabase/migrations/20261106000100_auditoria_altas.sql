begin;

alter table public.clientes add column if not exists pais text;
alter table public.gastos add column if not exists comprobante_url text;
alter table public.gastos add column if not exists origen_fondos_id text;
alter table public.dispersiones add column if not exists origen_fondos_id text;
alter table public.efectivo add column if not exists origen_fondos_id text;
alter table public.compras_usdt add column if not exists wallet_destino_id text;
alter table public.ventas_usdt add column if not exists wallet_origen_id text;
alter table public.ventas_usdt add column if not exists destino_fondos_id text;
alter table public.activos_liquidos add column if not exists saldo_inicial numeric;
alter table public.activos_digitales add column if not exists saldo_inicial numeric;

-- Catalog writes are exposed to the two administrative roles.
do $$
declare
  tabla text;
begin
  foreach tabla in array array['compras_usdt', 'ventas_usdt', 'activos_liquidos', 'activos_digitales', 'divisas'] loop
    execute format('grant insert on public.%I to authenticated', tabla);
    execute format('create policy altas_catalogo on public.%I for insert to authenticated with check (exists (select 1 from public.profiles where id = auth.uid() and role in (''administrador'', ''super_admin'') and is_active is distinct from false))', tabla);
  end loop;
end;
$$;

create or replace function public.cuentas_para_dispersion()
returns table (id text, activo text, institucion text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id::text, a.activo::text, a.institucion::text
  from public.activos_liquidos a
  where exists (
    select 1 from public.profiles p where p.id = auth.uid()
    and p.role in ('administrador', 'super_admin', 'dispersor') and p.is_active is distinct from false
  )
  order by a.activo;
$$;

revoke all on function public.cuentas_para_dispersion() from public;
grant execute on function public.cuentas_para_dispersion() to authenticated;

create table if not exists public.comisionistas (
  id text primary key,
  codigo text not null,
  cliente_id text not null,
  referidos_ids text[] not null default '{}',
  porcentaje_comision numeric not null check (porcentaje_comision between 0 and 1),
  fecha_creacion timestamptz not null default now()
);

alter table public.comisionistas enable row level security;
grant select, insert on public.comisionistas to authenticated;
grant all on public.comisionistas to service_role;

create policy comisionistas_read on public.comisionistas
  for select to authenticated using (exists (
    select 1 from public.profiles where id = auth.uid()
    and role in ('administrador', 'super_admin') and is_active is distinct from false
  ));

create policy comisionistas_insert on public.comisionistas
  for insert to authenticated with check (exists (
    select 1 from public.profiles where id = auth.uid()
    and role in ('administrador', 'super_admin') and is_active is distinct from false
  ));

create or replace function public.registrar_autor_creacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' and auth.role() = 'anon' then
    raise insufficient_privilege using message = 'Se requiere una sesión para crear registros';
  end if;

  if tg_op = 'UPDATE' then
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

revoke all on function public.registrar_autor_creacion() from public;

do $$
declare
  tabla text;
begin
  foreach tabla in array array[
    'clientes', 'negocios', 'dispersiones', 'compras_usdt', 'ventas_usdt',
    'efectivo', 'activos_liquidos', 'activos_digitales', 'divisas', 'gastos',
    'comisionistas', 'profiles', 'resumen_liquidacion'
  ] loop
    execute format('alter table public.%I add column if not exists created_by uuid, add column if not exists created_by_name text, add column if not exists created_at_audit timestamptz', tabla);
    execute format('drop trigger if exists registrar_autor_creacion on public.%I', tabla);
    execute format('create trigger registrar_autor_creacion before insert or update on public.%I for each row execute function public.registrar_autor_creacion()', tabla);
  end loop;
end;
$$;

commit;
