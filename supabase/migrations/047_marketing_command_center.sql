-- Marketing Command Center: objetivos, experimentos, prioridades y aprendizaje.

begin;

create table if not exists public.marketing_goals (
  id uuid primary key default gen_random_uuid(),
  period_month date not null unique,
  budget_usd numeric not null default 0 check (budget_usd >= 0),
  leads_target integer not null default 0 check (leads_target >= 0),
  qualified_leads_target integer not null default 0 check (qualified_leads_target >= 0),
  won_leads_target integer not null default 0 check (won_leads_target >= 0),
  revenue_target_usd numeric not null default 0 check (revenue_target_usd >= 0),
  target_cpl numeric check (target_cpl is null or target_cpl > 0),
  target_cpql numeric check (target_cpql is null or target_cpql > 0),
  target_cac numeric check (target_cac is null or target_cac > 0),
  target_cash_roas numeric check (target_cash_roas is null or target_cash_roas > 0),
  created_by uuid references public.usuarios(id) on delete set null,
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_experiments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  hypothesis text not null,
  status text not null default 'draft'
    check (status in ('draft','planned','running','completed','cancelled')),
  category text not null default 'creative'
    check (category in ('creative','audience','offer','landing','funnel','channel','other')),
  primary_metric text not null default 'qualified_leads',
  target_value numeric,
  budget_usd numeric not null default 0 check (budget_usd >= 0),
  start_date date,
  end_date date,
  campaign_id text,
  owner_id uuid references public.usuarios(id) on delete set null,
  variables jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  verdict text check (verdict is null or verdict in ('winner','loser','inconclusive')),
  learning text,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_experiments_status_idx
  on public.marketing_experiments(status, start_date desc);

create table if not exists public.marketing_daily_priorities (
  id uuid primary key default gen_random_uuid(),
  priority_date date not null,
  title text not null,
  reason text not null,
  recommended_action text not null,
  impact text not null default 'medium' check (impact in ('low','medium','high')),
  confidence integer not null default 70 check (confidence between 0 and 100),
  effort text not null default 'medium' check (effort in ('low','medium','high')),
  source text not null default 'system',
  entity_type text,
  entity_id text,
  status text not null default 'suggested'
    check (status in ('suggested','accepted','in_progress','completed','dismissed')),
  assigned_to uuid references public.usuarios(id) on delete set null,
  task_id uuid references public.tareas(id) on delete set null,
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (priority_date, title, entity_type, entity_id)
);
create index if not exists marketing_daily_priorities_queue_idx
  on public.marketing_daily_priorities(priority_date desc, status, impact);

create table if not exists public.marketing_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  summary text not null,
  wins jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  learnings jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_creative_taxonomy (
  ad_id text primary key,
  creative_id text,
  angle text,
  hook_type text,
  format text,
  funnel_stage text,
  cta_type text,
  presenter text,
  duration_seconds integer,
  tags jsonb not null default '[]'::jsonb,
  fatigue_status text not null default 'unknown'
    check (fatigue_status in ('unknown','fresh','watch','fatigued')),
  classified_by text not null default 'system',
  classified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_team_settings (
  user_id uuid primary key references public.usuarios(id) on delete cascade,
  role_label text not null default 'Marketing',
  daily_capacity_minutes integer not null default 360 check (daily_capacity_minutes between 30 and 720),
  automation_enabled boolean not null default true,
  daily_review_hour integer not null default 17 check (daily_review_hour between 0 and 23),
  max_open_tasks integer not null default 5 check (max_open_tasks between 1 and 20),
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.marketing_team_settings (
  user_id, role_label, daily_capacity_minutes, automation_enabled,
  daily_review_hour, max_open_tasks
)
select id, 'Contenido y Social', 360, true, 17, 5
from public.usuarios
where rol = 'marketing' and nombre ilike '%Luli%'
on conflict (user_id) do nothing;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'marketing_goals','marketing_experiments','marketing_daily_priorities',
    'marketing_weekly_reports','marketing_creative_taxonomy','marketing_team_settings'
  ] loop
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

comment on table public.marketing_daily_priorities is 'Cola diaria de decisiones recomendadas; convertir una sugerencia en tarea requiere una acción explícita.';
comment on table public.marketing_experiments is 'Registro de hipótesis, presupuesto, resultado y aprendizaje para evitar cambios sin trazabilidad.';
comment on table public.marketing_team_settings is 'Capacidad y límites operativos por persona; no se usa para generar trabajo de relleno.';

commit;
