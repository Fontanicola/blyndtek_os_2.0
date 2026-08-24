-- Centro de Control Meta Ads — Fase 1 (solo lectura desde Meta).
-- Los tokens viven exclusivamente en variables de entorno de Vercel.

begin;

alter table public.leads
  add column if not exists contacto_email text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists meta_campaign_id text,
  add column if not exists meta_adset_id text,
  add column if not exists meta_ad_id text,
  add column if not exists meta_lead_id text,
  add column if not exists fbclid text,
  add column if not exists fbc text,
  add column if not exists fbp text,
  add column if not exists landing_url text,
  add column if not exists formulario_version text,
  add column if not exists consentimiento_marketing boolean not null default false,
  add column if not exists attribution_captured_at timestamptz;

create index if not exists leads_meta_campaign_id_idx on public.leads(meta_campaign_id);
create index if not exists leads_meta_ad_id_idx on public.leads(meta_ad_id);
create unique index if not exists leads_meta_lead_id_unique_idx
  on public.leads(meta_lead_id) where meta_lead_id is not null;

create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text not null unique,
  account_name text,
  business_id text,
  page_id text,
  instagram_account_id text,
  pixel_id text,
  currency text not null default 'USD',
  timezone_name text,
  status text not null default 'not_configured'
    check (status in ('not_configured', 'connected', 'degraded', 'error')),
  permissions jsonb not null default '[]'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_campaigns (
  id text primary key,
  ad_account_id text not null,
  name text not null,
  status text,
  effective_status text,
  objective text,
  buying_type text,
  daily_budget numeric,
  lifetime_budget numeric,
  start_time timestamptz,
  stop_time timestamptz,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.meta_ad_sets (
  id text primary key,
  campaign_id text not null references public.meta_campaigns(id) on delete cascade,
  ad_account_id text not null,
  name text not null,
  status text,
  effective_status text,
  optimization_goal text,
  billing_event text,
  daily_budget numeric,
  lifetime_budget numeric,
  targeting jsonb,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.meta_creatives (
  id text primary key,
  ad_account_id text not null,
  name text,
  concept text,
  angle text,
  hook text,
  format text,
  thumbnail_url text,
  image_url text,
  video_id text,
  destination_url text,
  title text,
  body text,
  call_to_action text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.meta_ads (
  id text primary key,
  campaign_id text not null references public.meta_campaigns(id) on delete cascade,
  adset_id text not null references public.meta_ad_sets(id) on delete cascade,
  creative_id text references public.meta_creatives(id) on delete set null,
  ad_account_id text not null,
  name text not null,
  status text,
  effective_status text,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists public.meta_insights_daily (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text not null,
  date_start date not null,
  date_stop date not null,
  entity_level text not null check (entity_level in ('account', 'campaign', 'adset', 'ad')),
  entity_id text not null,
  campaign_id text,
  adset_id text,
  ad_id text,
  spend numeric not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  frequency numeric not null default 0,
  clicks bigint not null default 0,
  link_clicks bigint not null default 0,
  landing_page_views bigint not null default 0,
  leads bigint not null default 0,
  video_plays_3s bigint not null default 0,
  video_plays_15s bigint not null default 0,
  ctr numeric not null default 0,
  cpc numeric not null default 0,
  cpm numeric not null default 0,
  cost_per_lead numeric,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (ad_account_id, date_start, entity_level, entity_id)
);

create index if not exists meta_insights_daily_date_idx on public.meta_insights_daily(date_start desc);
create index if not exists meta_insights_daily_campaign_idx on public.meta_insights_daily(campaign_id, date_start desc);
create index if not exists meta_insights_daily_ad_idx on public.meta_insights_daily(ad_id, date_start desc);

create table if not exists public.meta_sync_runs (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text,
  trigger_type text not null default 'manual' check (trigger_type in ('manual', 'cron')),
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_campaigns integer not null default 0,
  records_adsets integer not null default 0,
  records_ads integer not null default 0,
  records_insights integer not null default 0,
  error_message text,
  initiated_by uuid references public.usuarios(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.meta_recommendations (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  entity_type text,
  entity_id text,
  title text not null,
  rationale text not null,
  recommended_action text not null,
  evidence jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.usuarios(id) on delete set null,
  unique (rule_key, entity_type, entity_id, status)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'meta_connections', 'meta_campaigns', 'meta_ad_sets', 'meta_creatives',
    'meta_ads', 'meta_insights_daily', 'meta_sync_runs', 'meta_recommendations'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_marketing_read', table_name);
    execute format(
      'create policy %I on public.%I for select using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in (''admin'', ''marketing'')))',
      table_name || '_marketing_read', table_name
    );
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_write', table_name);
    execute format(
      'create policy %I on public.%I for all using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = ''admin'')) with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = ''admin''))',
      table_name || '_admin_write', table_name
    );
  end loop;
end $$;

comment on table public.meta_connections is 'Configuración no secreta y salud de la conexión con Meta. Nunca almacenar tokens aquí.';
comment on table public.meta_insights_daily is 'Cache diario de Insights API para evitar consultar Meta en cada carga del dashboard.';
comment on table public.meta_recommendations is 'Recomendaciones auditables; Fase 1 no ejecuta cambios sobre Meta.';

commit;
