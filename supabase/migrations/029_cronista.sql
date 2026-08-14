-- Agente Cronista: captura diaria de hechos duros y contexto humano.
--
-- Antes de aplicar en producción, reemplazar:
--   - YOUR_APP_URL
--   - YOUR_SERVICE_ROLE_KEY
--
-- pg_cron corre en UTC. 00:00 UTC equivale a las 21:00 de Argentina
-- del día calendario anterior; el endpoint resuelve la fecha en
-- America/Argentina/Buenos_Aires.

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
  constraint logs_diarios_estado_check check (
    estado in ('sin_contexto_humano', 'procesando', 'completado', 'fallido')
  ),
  constraint logs_diarios_tokens_entrada_check check (tokens_entrada is null or tokens_entrada >= 0),
  constraint logs_diarios_tokens_salida_check check (tokens_salida is null or tokens_salida >= 0),
  constraint logs_diarios_costo_check check (costo_estimado_usd is null or costo_estimado_usd >= 0)
);

create index if not exists logs_diarios_fecha_desc_idx
  on public.logs_diarios (fecha desc);

alter table public.logs_diarios enable row level security;

drop policy if exists logs_diarios_admin on public.logs_diarios;
create policy logs_diarios_admin on public.logs_diarios
  for all to public
  using (
    exists (
      select 1
      from public.usuarios u
      where u.id = auth.uid()
        and u.rol = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.usuarios u
      where u.id = auth.uid()
        and u.rol = 'admin'
    )
  );

-- Las tablas operativas conservan el estado actual, pero no todas guardan
-- cuándo cambió. Este historial mínimo evita que Cronista infiera cambios.
create table if not exists public.cronista_eventos_estado (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null,
  entidad_id uuid not null,
  estado_anterior text not null,
  estado_nuevo text not null,
  ocurrido_at timestamptz not null default now(),
  constraint cronista_eventos_entidad_check check (
    entidad_tipo in ('lead', 'feature', 'fase_proyecto')
  )
);

create index if not exists cronista_eventos_estado_fecha_idx
  on public.cronista_eventos_estado (ocurrido_at desc);

create index if not exists cronista_eventos_estado_entidad_idx
  on public.cronista_eventos_estado (entidad_tipo, entidad_id);

alter table public.cronista_eventos_estado enable row level security;

drop policy if exists cronista_eventos_estado_admin on public.cronista_eventos_estado;
create policy cronista_eventos_estado_admin on public.cronista_eventos_estado
  for all to public
  using (
    exists (
      select 1
      from public.usuarios u
      where u.id = auth.uid()
        and u.rol = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.usuarios u
      where u.id = auth.uid()
        and u.rol = 'admin'
    )
  );

create or replace function public.registrar_cronista_cambio_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tipo text;
  anterior text;
  nuevo text;
begin
  if tg_table_name = 'leads' then
    tipo := 'lead';
    anterior := old.etapa::text;
    nuevo := new.etapa::text;
  elsif tg_table_name = 'features' then
    tipo := 'feature';
    anterior := old.estado::text;
    nuevo := new.estado::text;
  elsif tg_table_name = 'fases_proyecto' then
    tipo := 'fase_proyecto';
    anterior := old.estado::text;
    nuevo := new.estado::text;
  else
    return new;
  end if;

  if anterior is distinct from nuevo then
    insert into public.cronista_eventos_estado (
      entidad_tipo,
      entidad_id,
      estado_anterior,
      estado_nuevo,
      ocurrido_at
    ) values (
      tipo,
      new.id,
      anterior,
      nuevo,
      now()
    );
  end if;

  return new;
end;
$$;

revoke all on function public.registrar_cronista_cambio_estado() from public;

drop trigger if exists leads_cronista_cambio_etapa on public.leads;
create trigger leads_cronista_cambio_etapa
  after update of etapa on public.leads
  for each row
  execute function public.registrar_cronista_cambio_estado();

drop trigger if exists features_cronista_cambio_estado on public.features;
create trigger features_cronista_cambio_estado
  after update of estado on public.features
  for each row
  execute function public.registrar_cronista_cambio_estado();

drop trigger if exists fases_cronista_cambio_estado on public.fases_proyecto;
create trigger fases_cronista_cambio_estado
  after update of estado on public.fases_proyecto
  for each row
  execute function public.registrar_cronista_cambio_estado();

insert into public.agentes (slug, nombre, descripcion, tipo, activo, color)
select
  'cronista',
  'Cronista',
  'Captura el criterio detrás de los hechos relevantes del día y prepara el log diario de la memoria organizacional.',
  'analista',
  true,
  'violet'
where not exists (
  select 1
  from public.agentes
  where slug = 'cronista'
);

insert into public.automatizaciones (
  agente_id,
  nombre,
  descripcion,
  activa,
  frecuencia,
  dia_semana,
  dia_mes,
  hora,
  endpoint_trigger,
  ultima_ejecucion
)
select
  agentes.id,
  'Captura diaria de contexto',
  'Reúne los hechos relevantes del día y genera preguntas breves para capturar el criterio humano.',
  true,
  'diaria',
  null,
  null,
  '21:00:00',
  '/api/agentes/cronista/generar-preguntas',
  null
from public.agentes
where agentes.slug = 'cronista'
  and not exists (
    select 1
    from public.automatizaciones
    where endpoint_trigger = '/api/agentes/cronista/generar-preguntas'
  );

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'cronista-diario-21hs-argentina'
  ) then
    perform cron.schedule(
      'cronista-diario-21hs-argentina',
      '0 0 * * *',
      $job$
        select net.http_post(
          url := 'https://YOUR_APP_URL/api/agentes/cronista/generar-preguntas',
          headers := jsonb_build_object(
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  end if;
end;
$$;
