-- Marketing Intelligence: perfil 360, recorrido multicanal y aprendizaje del ICP.
begin;

create table if not exists public.lead_marketing_profiles (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  score integer not null default 0 check (score between 0 and 100),
  fit_score integer not null default 0 check (fit_score between 0 and 100),
  intent_score integer not null default 0 check (intent_score between 0 and 100),
  engagement_score integer not null default 0 check (engagement_score between 0 and 100),
  data_completeness integer not null default 0 check (data_completeness between 0 and 100),
  icp_tier text not null default 'D' check (icp_tier in ('A','B','C','D')),
  lifecycle_stage text not null,
  first_touch_channel text,
  last_touch_channel text,
  touchpoint_count integer not null default 0,
  first_touch_at timestamptz,
  last_touch_at timestamptz,
  next_best_action text,
  audience_eligible boolean not null default false,
  audience_sync_status text not null default 'not_eligible'
    check (audience_sync_status in ('not_eligible','eligible','pending_approval','synced','error','excluded')),
  positive_signals jsonb not null default '[]'::jsonb,
  missing_data jsonb not null default '[]'::jsonb,
  traits jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lead_marketing_profiles_priority_idx
  on public.lead_marketing_profiles(score desc, calculated_at desc);
create index if not exists lead_marketing_profiles_audience_idx
  on public.lead_marketing_profiles(audience_sync_status, score desc);

create table if not exists public.marketing_touchpoints (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('web','meta','instagram','whatsapp','crm','calendly','email','other')),
  event_name text not null,
  campaign_id text,
  adset_id text,
  ad_id text,
  session_id text,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists marketing_touchpoints_lead_idx
  on public.marketing_touchpoints(lead_id, occurred_at desc);
create index if not exists marketing_touchpoints_channel_idx
  on public.marketing_touchpoints(channel, occurred_at desc);

create table if not exists public.marketing_intelligence_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null check (trigger_type in ('manual','cron','lead_created','stage_changed')),
  status text not null default 'running' check (status in ('running','success','partial','error')),
  profiles_processed integer not null default 0,
  touchpoints_processed integer not null default 0,
  audience_eligible integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  initiated_by uuid references auth.users(id) on delete set null,
  error_message text,
  summary jsonb not null default '{}'::jsonb
);
create index if not exists marketing_intelligence_runs_started_idx
  on public.marketing_intelligence_runs(started_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['lead_marketing_profiles','marketing_touchpoints','marketing_intelligence_runs'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_marketing_read', table_name);
    execute format(
      'create policy %I on public.%I for select using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in (''admin'',''marketing'')))',
      table_name || '_marketing_read', table_name
    );
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_write', table_name);
    execute format(
      'create policy %I on public.%I for all using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = ''admin'')) with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = ''admin''))',
      table_name || '_admin_write', table_name
    );
  end loop;
end $$;

comment on table public.lead_marketing_profiles is 'Perfil 360 calculado con señales CRM, Web, Meta y WhatsApp. No reemplaza la decisión comercial humana.';
comment on table public.marketing_touchpoints is 'Recorrido multicanal normalizado y atribuible de cada lead.';
comment on table public.marketing_intelligence_runs is 'Auditoría de cada recalculo del motor de marketing.';
commit;
