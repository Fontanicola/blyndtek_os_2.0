-- Reparación segura para instalaciones donde la migración histórica 029 no quedó
-- registrada o aplicada. No recrea el cron antiguo que contenía placeholders.

create table if not exists public.logs_diarios (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  datos_duros jsonb not null default '{}'::jsonb,
  preguntas jsonb not null default '[]'::jsonb,
  respuesta_cruda text null,
  log_estructurado text null,
  estado text not null default 'sin_contexto_humano',
  tokens_entrada integer null,
  tokens_salida integer null,
  costo_estimado_usd numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint logs_diarios_datos_duros_object_check check (jsonb_typeof(datos_duros) = 'object'),
  constraint logs_diarios_preguntas_array_check check (jsonb_typeof(preguntas) = 'array'),
  constraint logs_diarios_estado_check check (estado in ('sin_contexto_humano', 'procesando', 'completado', 'fallido')),
  constraint logs_diarios_tokens_entrada_check check (tokens_entrada is null or tokens_entrada >= 0),
  constraint logs_diarios_tokens_salida_check check (tokens_salida is null or tokens_salida >= 0),
  constraint logs_diarios_costo_check check (costo_estimado_usd is null or costo_estimado_usd >= 0)
);

create index if not exists logs_diarios_fecha_desc_idx on public.logs_diarios (fecha desc);

alter table public.logs_diarios enable row level security;

drop policy if exists logs_diarios_admin on public.logs_diarios;
create policy logs_diarios_admin on public.logs_diarios
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));
