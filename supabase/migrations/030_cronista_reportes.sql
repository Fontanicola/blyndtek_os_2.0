-- Reportes consolidados del agente Cronista para los socios.
--
-- Antes de aplicar en producción, reemplazar:
--   - YOUR_APP_URL
--   - YOUR_SERVICE_ROLE_KEY
--
-- pg_cron corre en UTC. Argentina usa UTC-3:
--   - domingo 20:00 AR = domingo 23:00 UTC
--   - día 1, 08:00 AR = día 1, 11:00 UTC

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
  for all to public
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

insert into public.automatizaciones (
  agente_id, nombre, descripcion, activa, frecuencia, dia_semana, dia_mes,
  hora, endpoint_trigger, ultima_ejecucion
)
select agentes.id, 'Reporte semanal de socios',
  'Consolida la semana, genera el PDF confidencial y lo envía únicamente a los socios.',
  true, 'semanal', 0, null, '20:00:00',
  '/api/agentes/cronista/reportes/semanal', null
from public.agentes
where agentes.slug = 'cronista'
  and not exists (
    select 1 from public.automatizaciones
    where endpoint_trigger = '/api/agentes/cronista/reportes/semanal'
  );

insert into public.automatizaciones (
  agente_id, nombre, descripcion, activa, frecuencia, dia_semana, dia_mes,
  hora, endpoint_trigger, ultima_ejecucion
)
select agentes.id, 'Reporte mensual de socios',
  'Consolida el mes cerrado, genera el PDF confidencial y lo envía únicamente a los socios.',
  true, 'mensual', null, 1, '08:00:00',
  '/api/agentes/cronista/reportes/mensual', null
from public.agentes
where agentes.slug = 'cronista'
  and not exists (
    select 1 from public.automatizaciones
    where endpoint_trigger = '/api/agentes/cronista/reportes/mensual'
  );

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'cronista-reporte-semanal-domingo-20hs-ar') then
    perform cron.schedule(
      'cronista-reporte-semanal-domingo-20hs-ar',
      '0 23 * * 0',
      $job$
        select net.http_post(
          url := 'https://YOUR_APP_URL/api/agentes/cronista/reportes/semanal',
          headers := jsonb_build_object(
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $job$
    );
  end if;

  if not exists (select 1 from cron.job where jobname = 'cronista-reporte-mensual-dia-1-08hs-ar') then
    perform cron.schedule(
      'cronista-reporte-mensual-dia-1-08hs-ar',
      '0 11 1 * *',
      $job$
        select net.http_post(
          url := 'https://YOUR_APP_URL/api/agentes/cronista/reportes/mensual',
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
