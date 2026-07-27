-- Modelo interno de relevamiento cuantitativo del diagnóstico.
-- Idempotente: puede ejecutarse en entornos que ya tengan parte del modelo.

create table if not exists public.diagnostico_sesiones (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null unique references public.diagnosticos(id) on delete cascade,
  fecha date not null default current_date,
  duracion_minutos integer,
  decisor_nombre text,
  decisor_cargo text,
  notas text,
  estado text not null default 'en_curso' check (estado in ('en_curso', 'completa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.diagnostico_areas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  nombre text not null,
  responsable text,
  volumen_mensual numeric not null default 0,
  unidad_volumen text,
  herramientas text[] not null default '{}',
  proceso_actual text,
  dependencia_critica boolean not null default false,
  nivel_friccion integer not null default 3 check (nivel_friccion between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (diagnostico_id, nombre)
);

create table if not exists public.diagnostico_metricas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references public.diagnosticos(id) on delete cascade,
  area_id uuid references public.diagnostico_areas(id) on delete set null,
  tipo text not null check (tipo in ('trabajo_manual', 'doble_carga', 'error_operativo', 'licencia', 'venta_perdida', 'otro')),
  concepto text not null,
  horas_mes numeric not null default 0,
  costo_hora_usd numeric not null default 0,
  cargas_mes numeric not null default 0,
  minutos_por_carga numeric not null default 0,
  errores_mes numeric not null default 0,
  costo_por_error_usd numeric not null default 0,
  licencias_mes_usd numeric not null default 0,
  uso_pct numeric not null default 0 check (uso_pct between 0 and 100),
  oportunidades_mes numeric not null default 0,
  ticket_promedio_usd numeric not null default 0,
  tasa_cierre_pct numeric not null default 0 check (tasa_cierre_pct between 0 and 100),
  costo_mensual_usd numeric not null default 0,
  costo_anual_usd numeric not null default 0,
  confianza text not null default 'media' check (confianza in ('alta', 'media', 'baja')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnostico_areas_diagnostico_id_idx on public.diagnostico_areas(diagnostico_id);
create index if not exists diagnostico_metricas_diagnostico_id_idx on public.diagnostico_metricas(diagnostico_id);
create index if not exists diagnostico_metricas_area_id_idx on public.diagnostico_metricas(area_id);
