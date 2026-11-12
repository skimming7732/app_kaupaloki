-- Migration: Sistema de Novedades por Versión y Notificaciones Push
-- Archivo: 20261112120000_sistema_novedades_y_push.sql

-- 1. Tabla de Versiones del Sistema (Changelog oficial)
create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,               -- ej: 'v1.4.0'
  version_code integer not null unique,        -- ej: 10400 (orden numérico estricto)
  title text not null,                         -- ej: 'Comprobantes USDT, Descarga Móvil y Mejoras de Seguridad'
  summary text not null,                       -- Resumen breve para notificaciones push
  changes jsonb not null default '[]'::jsonb,  -- Array de { category, title, description }
  is_published boolean not null default true,
  released_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists idx_app_versions_code on public.app_versions(version_code desc);
create index if not exists idx_app_versions_pub on public.app_versions(is_published, released_at desc);

-- 2. Tabla de Confirmaciones por Cuenta (No por dispositivo)
create table if not exists public.user_version_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version_id uuid not null references public.app_versions(id) on delete cascade,
  version_code integer not null,
  confirmed_at timestamptz not null default clock_timestamp(),
  constraint uq_user_version unique (user_id, version_id)
);

create index if not exists idx_user_ver_conf_user on public.user_version_confirmations(user_id);

-- 3. Tabla de Suscripciones Push (Por dispositivo)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_type text not null default 'desktop_browser', -- 'iphone_standalone', 'android_standalone', 'desktop_browser'
  user_agent text,
  last_push_version text,
  last_push_version_code integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists idx_push_sub_user on public.push_subscriptions(user_id);
create index if not exists idx_push_sub_active on public.push_subscriptions(is_active);

-- Enable RLS
alter table public.app_versions enable row level security;
alter table public.user_version_confirmations enable row level security;
alter table public.push_subscriptions enable row level security;

-- Policies for app_versions: todos los autenticados pueden leer versiones publicadas
drop policy if exists "Lectura de versiones publicadas" on public.app_versions;
create policy "Lectura de versiones publicadas"
  on public.app_versions for select
  to authenticated
  using (is_published = true);

-- Policies for user_version_confirmations: el usuario solo gestiona sus propias confirmaciones
drop policy if exists "Usuarios ven sus propias confirmaciones" on public.user_version_confirmations;
create policy "Usuarios ven sus propias confirmaciones"
  on public.user_version_confirmations for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Usuarios registran sus confirmaciones" on public.user_version_confirmations;
create policy "Usuarios registran sus confirmaciones"
  on public.user_version_confirmations for insert
  to authenticated
  with check (user_id = auth.uid());

-- Policies for push_subscriptions: el usuario gestiona sus suscripciones por dispositivo
drop policy if exists "Usuarios ven sus suscripciones" on public.push_subscriptions;
create policy "Usuarios ven sus suscripciones"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Usuarios crean sus suscripciones" on public.push_subscriptions;
create policy "Usuarios crean sus suscripciones"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Usuarios actualizan sus suscripciones" on public.push_subscriptions;
create policy "Usuarios actualizan sus suscripciones"
  on public.push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Usuarios eliminan sus suscripciones" on public.push_subscriptions;
create policy "Usuarios eliminan sus suscripciones"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- 4. Función RPC para obtener novedades pendientes de confirmar para el usuario actual
create or replace function public.get_pending_versions_for_current_user()
returns setof public.app_versions
language sql
security definer
stable
set search_path = public
as $$
  select v.*
  from public.app_versions v
  where v.is_published = true
    and not exists (
      select 1
      from public.user_version_confirmations c
      where c.user_id = auth.uid()
        and c.version_id = v.id
    )
  order by v.version_code asc;
$$;

-- 5. Función RPC para confirmar versiones pendientes en bloque (bloqueante hasta pulsar "Entendido")
create or replace function public.confirm_versions(p_version_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code integer;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Usuario no autenticado';
  end if;

  foreach v_id in array p_version_ids loop
    select version_code into v_code from public.app_versions where id = v_id;
    if v_code is not null then
      insert into public.user_version_confirmations (user_id, version_id, version_code, confirmed_at)
      values (v_uid, v_id, v_code, clock_timestamp())
      on conflict (user_id, version_id) do nothing;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- 6. Función RPC para la IA / Backend: Obtener resumen acumulado de novedades push pendientes de un usuario
create or replace function public.get_pending_push_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_code integer := 0;
  v_pending_record record;
  v_titles text[] := '{}';
  v_summaries text[] := '{}';
  v_versions text[] := '{}';
  v_ids uuid[] := '{}';
  v_count integer := 0;
  v_max_code integer := 0;
  v_latest_version text := '';
  v_accumulated_text text := '';
begin
  -- Obtener el mayor version_code enviado previamente a alguna suscripción activa del usuario
  select coalesce(max(last_push_version_code), 0)
  into v_last_code
  from public.push_subscriptions
  where user_id = p_user_id and is_active = true;

  -- Iterar por todas las versiones publicadas posteriores a la última notificada
  for v_pending_record in
    select id, version, version_code, title, summary
    from public.app_versions
    where is_published = true
      and version_code > v_last_code
    order by version_code asc
  loop
    v_count := v_count + 1;
    v_ids := array_append(v_ids, v_pending_record.id);
    v_versions := array_append(v_versions, v_pending_record.version);
    v_titles := array_append(v_titles, v_pending_record.title);
    v_summaries := array_append(v_summaries, v_pending_record.summary);
    if v_pending_record.version_code > v_max_code then
      v_max_code := v_pending_record.version_code;
      v_latest_version := v_pending_record.version;
    end if;
  end loop;

  if v_count = 0 then
    return jsonb_build_object(
      'has_pending', false,
      'pending_count', 0,
      'last_push_version_code', v_last_code
    );
  end if;

  -- Armar resumen acumulado conciso evitando duplicados
  if v_count = 1 then
    v_accumulated_text := v_latest_version || ': ' || v_titles[1] || '. ' || v_summaries[1];
  else
    v_accumulated_text := v_latest_version || ' (' || v_count || ' actualizaciones acumuladas): ' || array_to_string(v_summaries, ' | ');
  end if;

  return jsonb_build_object(
    'has_pending', true,
    'pending_count', v_count,
    'latest_version', v_latest_version,
    'highest_version_code', v_max_code,
    'accumulated_summary', v_accumulated_text,
    'versions', v_versions,
    'version_ids', v_ids
  );
end;
$$;

-- 7. Función RPC para registrar la última versión enviada por push (sin marcar como leída)
create or replace function public.record_push_version_sent(
  p_user_id uuid,
  p_highest_version_code integer,
  p_version text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_subscriptions
  set last_push_version_code = p_highest_version_code,
      last_push_version = p_version,
      updated_at = clock_timestamp()
  where user_id = p_user_id
    and is_active = true
    and last_push_version_code < p_highest_version_code;
end;
$$;

-- Permitir ejecución a usuarios autenticados
grant execute on function public.get_pending_versions_for_current_user to authenticated;
grant execute on function public.confirm_versions to authenticated;
grant execute on function public.get_pending_push_summary to authenticated;
grant execute on function public.record_push_version_sent to authenticated;

-- Habilitar Supabase Realtime para app_versions
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_versions'
  ) then
    alter publication supabase_realtime add table public.app_versions;
  end if;
end;
$$;

-- 8. Seed Inicial con el Historial Real de Versiones de Kaupaloki
insert into public.app_versions (version, version_code, title, summary, changes, is_published, released_at)
values
(
  'v1.0.0',
  10000,
  'Lanzamiento Oficial Kaupaloki MVP',
  'Inicio de operaciones del sistema contable y de gestión cambiaria en tiempo real.',
  '[
    {"category": "Novedad", "title": "Gestión de Negocios y Clientes", "description": "Registro integral de compras, ventas y perfiles de clientes."},
    {"category": "Novedad", "title": "Control de Divisas y Cuentas", "description": "Saldos consolidados y extractos por cada divisa e institución."},
    {"category": "Seguridad", "title": "Roles y Permisos", "description": "Separación de privilegios entre Super Admin, Administrador, Operador y Comisionista."}
  ]'::jsonb,
  true,
  '2026-11-01 10:00:00+00'
),
(
  'v1.1.0',
  10100,
  'Organización de Gastos y Filtros Mejorados',
  'Estandarización de códigos de gastos a 5 dígitos (G00001) y diseño responsivo de filtros.',
  '[
    {"category": "Mejora", "title": "Códigos de Gastos a 5 dígitos", "description": "Generación consecutiva con ceros a la izquierda (G00001, G00002...)."},
    {"category": "Mejora", "title": "Filtros adaptables", "description": "Distribución equilibrada del buscador, selector de divisa y rangos de fechas."},
    {"category": "Corrección", "title": "Conceptos en mayúsculas", "description": "Formato automático en mayúsculas para todos los conceptos de gastos registrados."}
  ]'::jsonb,
  true,
  '2026-11-08 14:00:00+00'
),
(
  'v1.2.0',
  10200,
  'Portal Privado de Clientes y Comisiones',
  'Acceso seguro para clientes mediante enlaces protegidos por PIN y cálculo transparente de comisiones.',
  '[
    {"category": "Novedad", "title": "Portal Privado con PIN", "description": "Compartir estado de cuenta exclusivo mediante enlace privado seguro."},
    {"category": "Novedad", "title": "Desglose de Comisiones", "description": "Visualización detallada de comisiones calculadas por negocio en pesos colombianos."},
    {"category": "Seguridad", "title": "Aviso Legal y SAGRILAFT", "description": "Incorporación de aviso de cumplimiento normativo y prevención AML en vistas públicas."}
  ]'::jsonb,
  true,
  '2026-11-10 16:30:00+00'
),
(
  'v1.3.0',
  10300,
  'Autenticación 2FA Robusta y Recuperación Administrativa',
  'Protección de cuentas con doble factor de autenticación TOTP y códigos de respaldo cifrados.',
  '[
    {"category": "Seguridad", "title": "Autenticación TOTP Obligatoria", "description": "Compatibilidad con Google Authenticator, Authy y llaveros seguros."},
    {"category": "Seguridad", "title": "Códigos de Respaldo", "description": "Descarga de códigos únicos de recuperación ante pérdida del dispositivo móvil."},
    {"category": "Mejora", "title": "Restablecimiento por Administrador", "description": "Panel administrativo para desbloquear o reiniciar 2FA previa verificación de identidad."}
  ]'::jsonb,
  true,
  '2026-11-11 18:00:00+00'
),
(
  'v1.4.0',
  10400,
  'Comprobantes USDT, Descarga Nativa iOS y Validación de Pagos',
  'Vouchers gráficos para compras/ventas USDT, soporte para Safari iOS y sincronización de efectivo.',
  '[
    {"category": "Novedad", "title": "Comprobantes Digitales USDT (9:16)", "description": "Generación de comprobantes de compras y ventas listos para descargar o copiar."},
    {"category": "Mejora", "title": "Descarga Directa en iPhone / iOS", "description": "Integración con el menú nativo de iOS para guardar comprobantes directamente en Fotos o Archivos."},
    {"category": "Seguridad", "title": "Invalidación Automática de Tokens", "description": "Al modificar pagos de efectivo vinculados, los tokens activos se cancelan automáticamente por seguridad."},
    {"category": "Mejora", "title": "Visualización de Contraseña en Login", "description": "Alternador para ver/ocultar contraseña al iniciar sesión."}
  ]'::jsonb,
  true,
  clock_timestamp()
)
on conflict (version) do update
set version_code = excluded.version_code,
    title = excluded.title,
    summary = excluded.summary,
    changes = excluded.changes,
    is_published = excluded.is_published,
    released_at = excluded.released_at;
