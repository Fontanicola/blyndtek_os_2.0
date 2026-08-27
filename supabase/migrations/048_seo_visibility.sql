-- SEO y visibilidad en buscadores con IA.

begin;

create table if not exists public.seo_data_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  label text not null,
  status text not null default 'not_configured'
    check (status in ('connected','partial','error','not_configured')),
  last_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_queries (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  cluster text not null,
  intent text not null check (intent in ('commercial','problem','educational','brand','comparison')),
  funnel_stage text not null check (funnel_stage in ('discovery','consideration','decision','retention')),
  audience text not null,
  target_country text not null default 'ARG',
  target_language text not null default 'es',
  target_device text not null default 'all' check (target_device in ('all','desktop','mobile','tablet')),
  estimated_volume integer check (estimated_volume is null or estimated_volume >= 0),
  estimated_difficulty numeric check (estimated_difficulty is null or estimated_difficulty between 0 and 100),
  commercial_relevance integer not null default 3 check (commercial_relevance between 1 and 5),
  target_url text,
  desired_result text,
  cta text,
  priority text not null default 'medium' check (priority in ('critical','high','medium','low')),
  status text not null default 'planned' check (status in ('planned','active','won','paused','retired')),
  last_reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (query, target_country, target_language, target_device)
);

create table if not exists public.seo_query_measurements (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references public.seo_queries(id) on delete cascade,
  measured_at timestamptz not null,
  period_start date,
  period_end date,
  source text not null,
  country text not null default 'ARG',
  device text not null default 'all',
  position numeric,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  ctr numeric,
  best_position numeric,
  competitor_above text,
  serp_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (query_id, measured_at, source, country, device)
);
create index if not exists seo_query_measurements_lookup_idx
  on public.seo_query_measurements(query_id, measured_at desc);

create table if not exists public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  page_type text not null default 'other',
  primary_query_id uuid references public.seo_queries(id) on delete set null,
  published_at timestamptz,
  updated_content_at timestamptz,
  editorial_quality integer check (editorial_quality is null or editorial_quality between 0 and 100),
  indexation_status text not null default 'unknown',
  canonical_url text,
  robots_directive text,
  internal_links_in integer not null default 0,
  internal_links_out integer not null default 0,
  backlinks integer not null default 0,
  cannibalization_status text not null default 'unknown',
  freshness_status text not null default 'unknown',
  recommended_action text,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_page_measurements (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.seo_pages(id) on delete cascade,
  measured_at timestamptz not null,
  source text not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  ctr numeric,
  average_position numeric,
  organic_sessions bigint not null default 0,
  conversions bigint not null default 0,
  leads bigint not null default 0,
  subscriptions bigint not null default 0,
  lcp_ms integer,
  inp_ms integer,
  cls numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (page_id, measured_at, source)
);

create table if not exists public.seo_competitors (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  label text,
  competitor_type text not null default 'organic',
  differentiation_notes text,
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.seo_ai_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  cluster text not null,
  country text not null default 'Argentina',
  language text not null default 'es',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (prompt, country, language)
);

create table if not exists public.seo_ai_runs (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.seo_ai_prompts(id) on delete cascade,
  engine text not null,
  engine_mode text,
  run_at timestamptz not null,
  session_state text not null default 'unknown',
  response_text text,
  mentions_blyndtek boolean not null default false,
  prominence text check (prominence is null or prominence in ('primary','list','secondary','absent')),
  cited_url text,
  competitors jsonb not null default '[]'::jsonb,
  description_accuracy text check (description_accuracy is null or description_accuracy in ('accurate','partial','incorrect','not_applicable')),
  evidence_url text,
  notes text,
  created_at timestamptz not null default now(),
  unique (prompt_id, engine, run_at)
);

create table if not exists public.seo_actions (
  id uuid primary key default gen_random_uuid(),
  problem text not null,
  impact text not null check (impact in ('low','medium','high','critical')),
  urgency text not null check (urgency in ('low','medium','high','critical')),
  effort text not null check (effort in ('low','medium','high')),
  affected_url text,
  recommendation text not null,
  owner_id uuid references public.usuarios(id) on delete set null,
  status text not null default 'suggested'
    check (status in ('suggested','approved','in_progress','completed','dismissed')),
  approval_status text not null default 'not_required'
    check (approval_status in ('not_required','pending','approved','rejected')),
  expected_result text,
  measured_result text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null check (severity in ('info','warning','critical')),
  title text not null,
  detail text not null,
  affected_url text,
  query_id uuid references public.seo_queries(id) on delete set null,
  detected_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open','acknowledged','resolved','dismissed')),
  evidence jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists seo_alerts_open_idx on public.seo_alerts(status, severity, detected_at desc);

create table if not exists public.seo_daily_snapshots (
  snapshot_date date primary key,
  clicks bigint,
  impressions bigint,
  ctr numeric,
  average_position numeric,
  conversions bigint,
  leads bigint,
  subscriptions bigint,
  indexed_pages integer,
  indexation_errors integer,
  top_3 integer,
  top_5 integer,
  top_10 integer,
  top_20 integer,
  ai_mentions integer,
  ai_referral_sessions integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.seo_data_sources (source_key, label, status) values
  ('google_search_console', 'Google Search Console', 'not_configured'),
  ('ga4', 'Google Analytics 4', 'not_configured'),
  ('bing_webmaster', 'Bing Webmaster Tools', 'not_configured'),
  ('pagespeed', 'PageSpeed Insights', 'partial'),
  ('vercel', 'Vercel', 'connected'),
  ('blyndtek_web', 'Blyndtek Web', 'connected'),
  ('ai_visibility', 'Buscadores con IA', 'partial')
on conflict (source_key) do update set label = excluded.label;

insert into public.seo_ai_prompts (prompt, cluster) values
  ('¿Qué empresas argentinas automatizan procesos para Pymes?', 'automatizacion'),
  ('¿Quién desarrolla sistemas a medida para empresas en Argentina?', 'software_a_medida'),
  ('¿Cómo puedo automatizar procesos administrativos de mi empresa?', 'automatizacion_administrativa'),
  ('¿Qué consultora puede diagnosticar procesos antes de desarrollar software?', 'diagnostico_operativo'),
  ('¿Qué empresa trabaja con agentes de IA aplicados a operaciones?', 'agentes_ia'),
  ('¿Cómo saber si una Pyme necesita software a medida?', 'software_a_medida'),
  ('¿Quién puede integrar WhatsApp, CRM y sistemas internos?', 'integraciones')
on conflict (prompt, country, language) do nothing;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'seo_data_sources','seo_queries','seo_query_measurements','seo_pages',
    'seo_page_measurements','seo_competitors','seo_ai_prompts','seo_ai_runs',
    'seo_actions','seo_alerts','seo_daily_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_team_read', table_name);
    execute format(
      'create policy %I on public.%I for select using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in (''admin'',''marketing'')))',
      table_name || '_team_read', table_name
    );
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_write', table_name);
    execute format(
      'create policy %I on public.%I for all using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = ''admin'')) with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = ''admin''))',
      table_name || '_admin_write', table_name
    );
  end loop;
end $$;

comment on table public.seo_query_measurements is 'Historial contextual de posiciones y rendimiento; no sobrescribe mediciones anteriores.';
comment on table public.seo_ai_runs is 'Evidencia de respuestas variables de buscadores con IA; no representa un ranking determinístico.';
comment on table public.seo_actions is 'Cola priorizada. Las acciones de alto impacto conservan aprobación y resultado medido.';

commit;
