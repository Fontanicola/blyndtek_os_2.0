alter table public.sistemas_incidentes add column if not exists estado text not null default 'abierto';
alter table public.sistemas_incidentes add column if not exists fuente text not null default 'health_check';
alter table public.sistemas_incidentes add column if not exists fingerprint text null;
alter table public.sistemas_incidentes add column if not exists ocurrencias integer not null default 1;
alter table public.sistemas_incidentes add column if not exists primera_ocurrencia_at timestamptz not null default now();
alter table public.sistemas_incidentes add column if not exists ultima_ocurrencia_at timestamptz not null default now();
alter table public.sistemas_incidentes add column if not exists ruta text null;
alter table public.sistemas_incidentes add column if not exists deployment_id text null;
alter table public.sistemas_incidentes add column if not exists commit_sha text null;
alter table public.sistemas_incidentes add column if not exists external_url text null;
alter table public.sistemas_incidentes add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.sistemas_incidentes
set estado = case when resuelto then 'resuelto' else 'abierto' end;

create unique index if not exists sistemas_incidentes_fingerprint_abierto_idx
  on public.sistemas_incidentes (sistema_id, fuente, fingerprint)
  where resuelto = false and fingerprint is not null;

create index if not exists sistemas_incidentes_prioridad_idx
  on public.sistemas_incidentes (resuelto, severidad, ultima_ocurrencia_at desc);

create table if not exists public.sistemas_eventos_tecnicos (
  id uuid primary key default gen_random_uuid(),
  sistema_id uuid null references public.sistemas_gestionados(id) on delete cascade,
  fuente text not null,
  tipo text not null,
  nivel text not null default 'info',
  fingerprint text not null,
  mensaje text not null,
  ruta text null,
  status_code integer null,
  duracion_ms integer null,
  deployment_id text null,
  commit_sha text null,
  proyecto_externo_id text null,
  metadata jsonb not null default '{}'::jsonb,
  ocurrido_at timestamptz not null,
  recibido_at timestamptz not null default now(),
  constraint sistemas_eventos_tecnicos_nivel_check check (nivel in ('debug', 'info', 'warning', 'error', 'fatal')),
  constraint sistemas_eventos_tecnicos_status_check check (status_code is null or status_code between 100 and 599),
  constraint sistemas_eventos_tecnicos_duracion_check check (duracion_ms is null or duracion_ms >= 0),
  constraint sistemas_eventos_tecnicos_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists sistemas_eventos_tecnicos_sistema_fecha_idx
  on public.sistemas_eventos_tecnicos (sistema_id, ocurrido_at desc);
create index if not exists sistemas_eventos_tecnicos_fingerprint_idx
  on public.sistemas_eventos_tecnicos (fingerprint, ocurrido_at desc);
create index if not exists sistemas_eventos_tecnicos_nivel_idx
  on public.sistemas_eventos_tecnicos (nivel, ocurrido_at desc);

create table if not exists public.sistemas_integraciones (
  id uuid primary key default gen_random_uuid(),
  sistema_id uuid not null references public.sistemas_gestionados(id) on delete cascade,
  proveedor text not null,
  estado text not null default 'no_configurado',
  ultima_sincronizacion_at timestamptz null,
  ultimo_error text null,
  configuracion jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sistemas_integraciones_estado_check check (estado in ('no_configurado', 'conectado', 'degradado', 'error')),
  constraint sistemas_integraciones_config_check check (jsonb_typeof(configuracion) = 'object'),
  unique (sistema_id, proveedor)
);

create table if not exists public.sistemas_slos (
  id uuid primary key default gen_random_uuid(),
  sistema_id uuid not null references public.sistemas_gestionados(id) on delete cascade unique,
  disponibilidad_objetivo numeric(6,3) not null default 99.900,
  latencia_p95_objetivo_ms integer not null default 1500,
  tasa_error_objetivo numeric(8,5) not null default 0.01000,
  ventana_dias integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sistemas_slos_disponibilidad_check check (disponibilidad_objetivo > 0 and disponibilidad_objetivo <= 100),
  constraint sistemas_slos_latencia_check check (latencia_p95_objetivo_ms > 0),
  constraint sistemas_slos_error_check check (tasa_error_objetivo >= 0 and tasa_error_objetivo <= 1),
  constraint sistemas_slos_ventana_check check (ventana_dias between 1 and 90)
);

create table if not exists public.sistemas_remediaciones (
  id uuid primary key default gen_random_uuid(),
  sistema_id uuid not null references public.sistemas_gestionados(id) on delete cascade,
  incidente_id uuid null references public.sistemas_incidentes(id) on delete set null,
  estado text not null default 'diagnosticando',
  nivel_autonomia integer not null default 0,
  resumen text not null,
  branch text null,
  commit_sha text null,
  verificaciones jsonb not null default '[]'::jsonb,
  iniciada_at timestamptz not null default now(),
  finalizada_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint sistemas_remediaciones_estado_check check (estado in ('diagnosticando', 'preparada', 'verificada', 'fallida', 'cancelada', 'desplegada')),
  constraint sistemas_remediaciones_nivel_check check (nivel_autonomia between 0 and 3),
  constraint sistemas_remediaciones_verificaciones_check check (jsonb_typeof(verificaciones) = 'array')
);

create index if not exists sistemas_remediaciones_fecha_idx
  on public.sistemas_remediaciones (sistema_id, created_at desc);

alter table public.sistemas_eventos_tecnicos enable row level security;
alter table public.sistemas_integraciones enable row level security;
alter table public.sistemas_slos enable row level security;
alter table public.sistemas_remediaciones enable row level security;

drop policy if exists sistemas_eventos_tecnicos_admin on public.sistemas_eventos_tecnicos;
create policy sistemas_eventos_tecnicos_admin on public.sistemas_eventos_tecnicos
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists sistemas_integraciones_admin on public.sistemas_integraciones;
create policy sistemas_integraciones_admin on public.sistemas_integraciones
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists sistemas_slos_admin on public.sistemas_slos;
create policy sistemas_slos_admin on public.sistemas_slos
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists sistemas_remediaciones_admin on public.sistemas_remediaciones;
create policy sistemas_remediaciones_admin on public.sistemas_remediaciones
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

insert into public.sistemas_integraciones (sistema_id, proveedor, estado, configuracion)
select sistema.id, proveedor.nombre, 'no_configurado', '{}'::jsonb
from public.sistemas_gestionados sistema
cross join (values ('vercel'), ('sentry'), ('posthog'), ('supabase'), ('github'), ('linear'), ('graphify')) as proveedor(nombre)
on conflict (sistema_id, proveedor) do nothing;

insert into public.sistemas_slos (sistema_id)
select id from public.sistemas_gestionados
on conflict (sistema_id) do nothing;
