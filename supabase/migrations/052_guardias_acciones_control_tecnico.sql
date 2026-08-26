-- Evoluciona Control técnico hacia un centro operativo multiproyecto:
-- inventario completo, historial de guardias y bitácora auditable de acciones.

alter table public.sistemas_gestionados
  add column if not exists repositorio_github text null;

create unique index if not exists sistemas_gestionados_vercel_project_unique_idx
  on public.sistemas_gestionados (vercel_project_id)
  where vercel_project_id is not null;

create table if not exists public.sistemas_guardias (
  id uuid primary key default gen_random_uuid(),
  automation_id text not null,
  estado text not null default 'ejecutando',
  ventana_desde timestamptz not null,
  ventana_hasta timestamptz not null,
  iniciada_at timestamptz not null default now(),
  finalizada_at timestamptz null,
  resumen text null,
  sistemas_revisados integer not null default 0,
  incidentes_detectados integer not null default 0,
  acciones_ejecutadas integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sistemas_guardias_estado_check check (estado in ('ejecutando', 'saludable', 'hallazgos', 'fallida', 'bloqueada')),
  constraint sistemas_guardias_ventana_check check (ventana_hasta >= ventana_desde),
  constraint sistemas_guardias_contadores_check check (sistemas_revisados >= 0 and incidentes_detectados >= 0 and acciones_ejecutadas >= 0),
  constraint sistemas_guardias_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists sistemas_guardias_fecha_idx
  on public.sistemas_guardias (iniciada_at desc);
create index if not exists sistemas_guardias_automation_idx
  on public.sistemas_guardias (automation_id, iniciada_at desc);

create table if not exists public.sistemas_acciones_tecnicas (
  id uuid primary key default gen_random_uuid(),
  guardia_id uuid null references public.sistemas_guardias(id) on delete set null,
  sistema_id uuid null references public.sistemas_gestionados(id) on delete set null,
  incidente_id uuid null references public.sistemas_incidentes(id) on delete set null,
  actor text not null default 'codex',
  tipo text not null,
  estado text not null default 'detectada',
  titulo text not null,
  detalle text null,
  evidencia jsonb not null default '{}'::jsonb,
  branch text null,
  commit_sha text null,
  deployment_id text null,
  external_url text null,
  iniciada_at timestamptz not null default now(),
  finalizada_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sistemas_acciones_actor_check check (actor in ('codex', 'automatizacion', 'humano', 'sistema')),
  constraint sistemas_acciones_estado_check check (estado in ('detectada', 'diagnosticando', 'preparada', 'verificada', 'desplegada', 'fallida', 'bloqueada', 'revertida')),
  constraint sistemas_acciones_evidencia_check check (jsonb_typeof(evidencia) = 'object')
);

create index if not exists sistemas_acciones_fecha_idx
  on public.sistemas_acciones_tecnicas (created_at desc);
create index if not exists sistemas_acciones_sistema_fecha_idx
  on public.sistemas_acciones_tecnicas (sistema_id, created_at desc);
create index if not exists sistemas_acciones_guardia_idx
  on public.sistemas_acciones_tecnicas (guardia_id, created_at desc);

alter table public.sistemas_guardias enable row level security;
alter table public.sistemas_acciones_tecnicas enable row level security;

drop policy if exists sistemas_guardias_admin on public.sistemas_guardias;
create policy sistemas_guardias_admin on public.sistemas_guardias
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists sistemas_acciones_tecnicas_admin on public.sistemas_acciones_tecnicas;
create policy sistemas_acciones_tecnicas_admin on public.sistemas_acciones_tecnicas
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

-- Realtime se usa para refrescar el centro de control sin recargar la página.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sistemas_guardias'
  ) then
    alter publication supabase_realtime add table public.sistemas_guardias;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sistemas_acciones_tecnicas'
  ) then
    alter publication supabase_realtime add table public.sistemas_acciones_tecnicas;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sistemas_eventos_tecnicos'
  ) then
    alter publication supabase_realtime add table public.sistemas_eventos_tecnicos;
  end if;
end $$;

with inventario(nombre, url_produccion, vercel_project_id, repositorio_github, stack) as (
  values
    ('Blyndtek OS', 'https://sistema.blyndtek.com', 'prj_LngyjN8q9HPuqtaqwVO02Lf2UUb3', 'Fontanicola/blyndtek_os_2.0', '{"framework":"Next.js","hosting":"Vercel","database":"Supabase","language":"TypeScript"}'::jsonb),
    ('Funes Exclusivos', 'https://funesexclusivos.com', 'prj_FlTAeOgBdtsnNPO1ABgSfz483UpZ', 'Fontanicola/funes-exclusivos', '{"hosting":"Vercel","repository":"GitHub"}'::jsonb),
    ('Control de Obra', null, 'prj_YbXEL2CpGKLusthhA03nYQVnteLo', 'Fontanicola/ha-control-de-obra', '{"hosting":"Vercel","repository":"GitHub"}'::jsonb),
    ('Trackit', null, 'prj_5rx98EBwQtPXAb9BdcwhpGQYydlS', 'Fontanicola/trackit', '{"hosting":"Vercel","repository":"GitHub"}'::jsonb),
    ('ARC', 'https://sistema.arcglobal.com', 'prj_JLB9CNzOcOtIIHlrkofD9iFn2OMC', 'Fontanicola/ARC', '{"hosting":"Vercel","repository":"GitHub"}'::jsonb),
    ('Blyndtek Web', 'https://blyndtek.com', 'prj_3A4qeDlT2TetMXkgSYtEaEeTu9wB', 'Fontanicola/Blyndtek-Web', '{"hosting":"Vercel","repository":"GitHub"}'::jsonb)
)
insert into public.sistemas_gestionados (
  nombre, url_produccion, vercel_project_id, vercel_team_id, repositorio_github,
  stack, version_patrones, estado, monitoreo_activo
)
select nombre, url_produccion, vercel_project_id, 'team_wRHKgVJ2IEyAD3Qfg8R0A77p', repositorio_github,
  stack, 'control-tecnico-v2', 'activo', true
from inventario
on conflict (vercel_project_id) where vercel_project_id is not null do update
set nombre = excluded.nombre,
    url_produccion = coalesce(excluded.url_produccion, sistemas_gestionados.url_produccion),
    repositorio_github = excluded.repositorio_github,
    stack = sistemas_gestionados.stack || excluded.stack,
    version_patrones = excluded.version_patrones,
    monitoreo_activo = true,
    updated_at = now();

insert into public.sistemas_integraciones (sistema_id, proveedor, estado, configuracion)
select sistema.id, proveedor.nombre,
  case proveedor.nombre when 'vercel' then 'conectado' when 'github' then 'conectado' when 'graphify' then 'conectado' else 'no_configurado' end,
  case proveedor.nombre
    when 'vercel' then jsonb_build_object('project_id', sistema.vercel_project_id)
    when 'github' then jsonb_build_object('repository', sistema.repositorio_github)
    when 'graphify' then jsonb_build_object('mode', 'project', 'graph', 'graphify-out/graph.json')
    else '{}'::jsonb
  end
from public.sistemas_gestionados sistema
cross join (values ('vercel'), ('sentry'), ('posthog'), ('supabase'), ('github'), ('linear'), ('graphify')) as proveedor(nombre)
where sistema.vercel_team_id = 'team_wRHKgVJ2IEyAD3Qfg8R0A77p'
on conflict (sistema_id, proveedor) do update
set estado = case
      when sistemas_integraciones.estado = 'conectado' then sistemas_integraciones.estado
      else excluded.estado
    end,
    configuracion = case
      when excluded.configuracion = '{}'::jsonb then sistemas_integraciones.configuracion
      else excluded.configuracion
    end,
    updated_at = now();

insert into public.sistemas_slos (sistema_id)
select id from public.sistemas_gestionados
where vercel_team_id = 'team_wRHKgVJ2IEyAD3Qfg8R0A77p'
on conflict (sistema_id) do nothing;
