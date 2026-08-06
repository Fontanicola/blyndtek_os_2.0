-- Control plane de sistemas gestionados.
-- Esta migracion refleja el esquema aplicado previamente y completa las
-- policies RLS y la automatizacion de monitoreo.

create table if not exists public.sistemas_gestionados (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid null references public.proyectos(id) on delete set null,
  cliente_id uuid null references public.clientes(id) on delete set null,
  nombre text not null,
  url_produccion text null,
  url_staging text null,
  management_endpoint text null,
  management_token text null,
  vercel_project_id text null,
  vercel_team_id text null,
  supabase_project_ref text null,
  stack jsonb null,
  version_patrones text null,
  estado text not null default 'activo',
  monitoreo_activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sistemas_gestionados add column if not exists proyecto_id uuid;
alter table public.sistemas_gestionados add column if not exists cliente_id uuid;
alter table public.sistemas_gestionados add column if not exists nombre text;
alter table public.sistemas_gestionados add column if not exists url_produccion text;
alter table public.sistemas_gestionados add column if not exists url_staging text;
alter table public.sistemas_gestionados add column if not exists management_endpoint text;
alter table public.sistemas_gestionados add column if not exists management_token text;
alter table public.sistemas_gestionados add column if not exists vercel_project_id text;
alter table public.sistemas_gestionados add column if not exists vercel_team_id text;
alter table public.sistemas_gestionados add column if not exists supabase_project_ref text;
alter table public.sistemas_gestionados add column if not exists stack jsonb;
alter table public.sistemas_gestionados add column if not exists version_patrones text;
alter table public.sistemas_gestionados add column if not exists estado text not null default 'activo';
alter table public.sistemas_gestionados add column if not exists monitoreo_activo boolean not null default true;
alter table public.sistemas_gestionados add column if not exists created_at timestamptz not null default now();
alter table public.sistemas_gestionados add column if not exists updated_at timestamptz not null default now();

create table if not exists public.sistemas_health_checks (
  id uuid primary key default gen_random_uuid(),
  sistema_id uuid not null references public.sistemas_gestionados(id) on delete cascade,
  estado text not null,
  latencia_ms integer null,
  db_ok boolean null,
  detalle text null,
  checked_at timestamptz not null default now()
);

create table if not exists public.sistemas_incidentes (
  id uuid primary key default gen_random_uuid(),
  sistema_id uuid not null references public.sistemas_gestionados(id) on delete cascade,
  tipo text not null,
  severidad text not null default 'media',
  titulo text not null,
  detalle text null,
  resuelto boolean not null default false,
  resuelto_at timestamptz null,
  resuelto_por uuid null references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sistemas_deploys (
  id uuid primary key default gen_random_uuid(),
  sistema_id uuid not null references public.sistemas_gestionados(id) on delete cascade,
  vercel_deployment_id text null,
  estado text null,
  commit_sha text null,
  commit_mensaje text null,
  desplegado_at timestamptz null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sistemas_gestionados'::regclass
      and contype = 'f'
      and confrelid = 'public.proyectos'::regclass
  ) then
    alter table public.sistemas_gestionados
      add constraint sistemas_gestionados_proyecto_id_fkey
      foreign key (proyecto_id) references public.proyectos(id) on delete set null;
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sistemas_gestionados'::regclass
      and contype = 'f'
      and confrelid = 'public.clientes'::regclass
  ) then
    alter table public.sistemas_gestionados
      add constraint sistemas_gestionados_cliente_id_fkey
      foreign key (cliente_id) references public.clientes(id) on delete set null;
  end if;
end;
$$;

alter table public.sistemas_gestionados enable row level security;
alter table public.sistemas_health_checks enable row level security;
alter table public.sistemas_incidentes enable row level security;
alter table public.sistemas_deploys enable row level security;

drop policy if exists sistemas_gestionados_admin on public.sistemas_gestionados;
create policy sistemas_gestionados_admin on public.sistemas_gestionados
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists sistemas_health_checks_admin on public.sistemas_health_checks;
create policy sistemas_health_checks_admin on public.sistemas_health_checks
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists sistemas_incidentes_admin on public.sistemas_incidentes;
create policy sistemas_incidentes_admin on public.sistemas_incidentes
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists sistemas_deploys_admin on public.sistemas_deploys;
create policy sistemas_deploys_admin on public.sistemas_deploys
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

insert into public.agentes (slug, nombre, descripcion, tipo, activo, color)
select 'monitor-sistemas', 'Monitor de sistemas', 'Controla disponibilidad, incidentes y despliegues de sistemas gestionados.', 'vigilante', true, 'signal'
where not exists (select 1 from public.agentes where slug = 'monitor-sistemas');

insert into public.automatizaciones (agente_id, nombre, descripcion, activa, frecuencia, dia_semana, dia_mes, hora, endpoint_trigger, ultima_ejecucion)
select agentes.id, 'Health check de sistemas', 'Verifica cada cinco minutos la disponibilidad de los sistemas gestionados.', true, 'diaria', null, null, '00:00:00', '/api/sistemas/check-todos', null
from public.agentes
where agentes.slug = 'monitor-sistemas'
and not exists (select 1 from public.automatizaciones where endpoint_trigger = '/api/sistemas/check-todos');

create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'sistemas-health-check-cada-5-min') then
    perform cron.schedule('sistemas-health-check-cada-5-min', '*/5 * * * *', $job$
      select net.http_post(
        url := 'https://YOUR_APP_URL/api/sistemas/check-todos',
        headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY', 'Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    $job$);
  end if;
end;
$$;
