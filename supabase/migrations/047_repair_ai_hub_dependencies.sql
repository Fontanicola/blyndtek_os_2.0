-- Completa las tablas que consume Centro IA y que faltaban en Producción.
-- No configura cron jobs ni automatizaciones: eso requiere URLs y credenciales
-- de despliegue y debe hacerse como una tarea separada.

begin;

create table if not exists public.checklist_qa (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references public.fases_proyecto(id) on delete cascade,
  item text not null,
  completado boolean not null default false,
  completado_por uuid null references public.usuarios(id) on delete set null,
  completado_at timestamptz null,
  orden integer not null default 0,
  generado_por_ia boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists checklist_qa_fase_id_idx
  on public.checklist_qa (fase_id, orden);

alter table public.checklist_qa enable row level security;

drop policy if exists checklist_qa_authenticated on public.checklist_qa;
create policy checklist_qa_authenticated on public.checklist_qa
  for all to authenticated
  using (true)
  with check (true);

create table if not exists public.reportes_cronista (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  periodo_inicio date not null,
  periodo_fin date not null,
  metricas_duras jsonb not null default '{}'::jsonb,
  fuentes jsonb not null default '{}'::jsonb,
  reporte_markdown text null,
  estado text not null default 'procesando',
  intentos integer not null default 0,
  error_detalle text null,
  tokens_entrada integer null,
  tokens_salida integer null,
  costo_estimado_usd numeric null,
  resend_email_id text null,
  enviado_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reportes_cronista_tipo_check check (tipo in ('semanal', 'mensual')),
  constraint reportes_cronista_periodo_check check (periodo_fin >= periodo_inicio),
  constraint reportes_cronista_metricas_object_check check (jsonb_typeof(metricas_duras) = 'object'),
  constraint reportes_cronista_fuentes_object_check check (jsonb_typeof(fuentes) = 'object'),
  constraint reportes_cronista_estado_check check (estado in ('procesando', 'completado', 'fallido')),
  constraint reportes_cronista_intentos_check check (intentos between 0 and 2),
  constraint reportes_cronista_tokens_entrada_check check (tokens_entrada is null or tokens_entrada >= 0),
  constraint reportes_cronista_tokens_salida_check check (tokens_salida is null or tokens_salida >= 0),
  constraint reportes_cronista_costo_check check (costo_estimado_usd is null or costo_estimado_usd >= 0),
  constraint reportes_cronista_periodo_unique unique (tipo, periodo_inicio)
);

create index if not exists reportes_cronista_periodo_desc_idx
  on public.reportes_cronista (tipo, periodo_inicio desc);

alter table public.reportes_cronista enable row level security;

drop policy if exists reportes_cronista_admin on public.reportes_cronista;
create policy reportes_cronista_admin on public.reportes_cronista
  for all to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'admin'
    )
  );

commit;
