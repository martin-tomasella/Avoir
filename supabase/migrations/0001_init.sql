-- Avoir — 0001 init
-- Núcleo multi-tenant del MVP: organización, activos/dispositivos, posiciones,
-- geo, jornadas, alarmas, formularios y tareas. Aislamiento por RLS (company_id).
-- Postgres 17 + PostGIS. Aplicar con: supabase db push / apply_migration.

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ───────────────────────── Tenancy & identidad ─────────────────────────

create type user_role as enum ('super_admin','admin','subadmin','operator','agent');

create table company (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  country    text,
  timezone   text not null default 'America/Argentina/Buenos_Aires',
  settings   jsonb not null default '{}',          -- flags/módulos activos
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Perfil ligado a auth.users de Supabase (id = auth.uid()).
create table app_user (
  id         uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references company(id) on delete cascade,  -- null => super_admin global
  full_name  text,
  email      text,
  role       user_role not null default 'operator',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index on app_user(company_id);

-- Helpers de autorización (SECURITY DEFINER para poder leer app_user sin recursión de RLS).
create or replace function current_company_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select company_id from app_user where id = auth.uid()
$$;

create or replace function is_super_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from app_user where id = auth.uid()), false)
$$;

create table "group" (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create index on "group"(company_id);

create table user_group (
  user_id  uuid not null references app_user(id) on delete cascade,
  group_id uuid not null references "group"(id) on delete cascade,
  primary key (user_id, group_id)
);

-- ───────────────────────── Activos & dispositivos ─────────────────────────

-- Activo = la unidad rastreada (persona/vehículo/objeto).
create table asset (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id) on delete cascade,
  group_id    uuid references "group"(id) on delete set null,
  alias       text,
  person_name text,
  cargo       text,
  phone       text,
  extra       jsonb not null default '{}',          -- campos extra configurables
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on asset(company_id);
create index on asset(company_id, group_id);

create type device_kind as enum ('app','hardware');

-- Dispositivo = lo que reporta. Un activo puede tener >1 (app + tracker).
create table device (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references company(id) on delete cascade,
  asset_id      uuid references asset(id) on delete set null,
  kind          device_kind not null,
  identifier    text not null,                       -- IMEI / serial / device id
  protocol      text,                                -- p.ej. 'teltonika','queclink','app'
  model         text,
  os            text,
  last_report_at timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (company_id, identifier)
);
create index on device(company_id);
create index on device(asset_id);

-- ───────────────────────── Posiciones & eventos ─────────────────────────
-- Tabla de alto volumen. Candidata a hypertable (TimescaleDB) / partición por tiempo.
create table position (
  id          bigint generated always as identity primary key,
  company_id  uuid not null references company(id) on delete cascade,
  device_id   uuid not null references device(id) on delete cascade,
  asset_id    uuid references asset(id) on delete set null,
  ts          timestamptz not null,                  -- timestamp del fix (del equipo)
  geom        geography(Point,4326) not null,
  speed       real,                                  -- km/h
  heading     real,
  altitude    real,
  satellites  smallint,
  attributes  jsonb not null default '{}',           -- IO: temperatura, entradas, batería, etc.
  created_at  timestamptz not null default now()     -- recepción en servidor
);
create index on position(company_id, asset_id, ts desc);
create index on position(device_id, ts desc);
create index on position using gist(geom);

-- Stream de eventos (de donde derivan alarmas y reportes).
create table event (
  id          bigint generated always as identity primary key,
  company_id  uuid not null references company(id) on delete cascade,
  device_id   uuid references device(id) on delete set null,
  asset_id    uuid references asset(id) on delete set null,
  type        text not null,                         -- 'panic','geofence_in','overspeed','ignition',...
  ts          timestamptz not null,
  geom        geography(Point,4326),
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on event(company_id, ts desc);
create index on event(asset_id, ts desc);

-- ───────────────────────── Geo ─────────────────────────

create table geozone (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  name       text not null,
  geom       geography(Geometry,4326) not null,      -- polígono/multipolígono
  rules      jsonb not null default '{}',            -- entrada/salida/permanencia/velocidad
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index on geozone(company_id);
create index on geozone using gist(geom);

-- Puntos de control / POIs.
create table control_point (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  name       text not null,
  geom       geography(Point,4326) not null,
  radius_m   integer not null default 80,
  type       text,                                   -- cliente/sede/poi/control
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on control_point(company_id);
create index on control_point using gist(geom);

-- ───────────────────────── Jornadas ─────────────────────────

create table work_schedule (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  name       text not null,
  rules      jsonb not null default '{}',            -- {mon:[["09:00","18:00"]], ...}
  auto_end   boolean not null default false,
  created_at timestamptz not null default now()
);
create index on work_schedule(company_id);

create table asset_schedule (
  asset_id    uuid not null references asset(id) on delete cascade,
  schedule_id uuid not null references work_schedule(id) on delete cascade,
  primary key (asset_id, schedule_id)
);

-- ───────────────────────── Alarmas ─────────────────────────

create type alarm_status as enum ('attention','active','closed');

create table alarm (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id) on delete cascade,
  asset_id    uuid references asset(id) on delete set null,
  type        text not null,                         -- 'attention','panic','geofence','overspeed',...
  status      alarm_status not null default 'active',
  description text,
  operator_id uuid references app_user(id) on delete set null,
  event_ts    timestamptz not null default now(),
  assigned_at timestamptz,
  closed_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index on alarm(company_id, status, event_ts desc);

-- ───────────────────────── Formularios ─────────────────────────

create table form_template (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  name       text not null,
  schema     jsonb not null default '{}',            -- definición de campos
  published  boolean not null default false,
  created_at timestamptz not null default now()
);
create index on form_template(company_id);

create table form_submission (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references company(id) on delete cascade,
  template_id uuid not null references form_template(id) on delete cascade,
  asset_id    uuid references asset(id) on delete set null,
  user_id     uuid references app_user(id) on delete set null,
  data        jsonb not null default '{}',
  geom        geography(Point,4326),
  files       jsonb not null default '[]',           -- refs a Storage
  ts          timestamptz not null default now()
);
create index on form_submission(company_id, ts desc);
create index on form_submission(template_id);

-- ───────────────────────── Tareas ─────────────────────────

create type task_status as enum ('pending','assigned','in_progress','done','cancelled');

create table task (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references company(id) on delete cascade,
  asset_id      uuid references asset(id) on delete set null,
  control_point_id uuid references control_point(id) on delete set null,
  type          text,
  status        task_status not null default 'pending',
  title         text,
  description   text,
  scheduled_at  timestamptz,
  geofence      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index on task(company_id, status, scheduled_at);
create index on task(asset_id);

-- ───────────────────────── RLS ─────────────────────────
-- Patrón: cada tabla de negocio aislada por company_id. super_admin ve todo.
-- (Granularidad por rol/grupo se refina en migraciones siguientes.)

do $$
declare t text;
begin
  foreach t in array array[
    'company','app_user','group','user_group','asset','device','position','event',
    'geozone','control_point','work_schedule','asset_schedule','alarm',
    'form_template','form_submission','task'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- company: miembro ve su empresa; super_admin ve todas.
create policy company_sel on company for select
  using (is_super_admin() or id = current_company_id());
create policy company_mod on company for all
  using (is_super_admin()) with check (is_super_admin());

-- app_user: ve usuarios de su empresa; super_admin todo.
create policy app_user_sel on app_user for select
  using (is_super_admin() or company_id = current_company_id() or id = auth.uid());
create policy app_user_mod on app_user for all
  using (is_super_admin() or company_id = current_company_id())
  with check (is_super_admin() or company_id = current_company_id());

-- Resto de tablas con company_id directo: política uniforme tenant-scoped.
do $$
declare t text;
begin
  foreach t in array array[
    'group','asset','device','position','event','geozone','control_point',
    'work_schedule','alarm','form_template','form_submission','task'
  ] loop
    execute format($f$
      create policy %1$s_tenant on %1$I for all
        using (is_super_admin() or company_id = current_company_id())
        with check (is_super_admin() or company_id = current_company_id());
    $f$, t);
  end loop;
end $$;

-- Tablas puente (sin company_id): heredan vía join.
create policy user_group_tenant on user_group for all
  using (is_super_admin() or exists (
    select 1 from app_user u where u.id = user_group.user_id and u.company_id = current_company_id()))
  with check (is_super_admin() or exists (
    select 1 from app_user u where u.id = user_group.user_id and u.company_id = current_company_id()));

create policy asset_schedule_tenant on asset_schedule for all
  using (is_super_admin() or exists (
    select 1 from asset a where a.id = asset_schedule.asset_id and a.company_id = current_company_id()))
  with check (is_super_admin() or exists (
    select 1 from asset a where a.id = asset_schedule.asset_id and a.company_id = current_company_id()));
