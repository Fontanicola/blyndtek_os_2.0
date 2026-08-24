-- Centro de Control Meta Ads — Fase 2: guardrails e inteligencia operativa.
-- Continúa sin permisos de escritura sobre Meta.

begin;

create table if not exists public.meta_guardrails (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text not null unique,
  target_cpl numeric not null default 60 check (target_cpl > 0),
  target_cpql numeric not null default 180 check (target_cpql > 0),
  target_cash_roas numeric not null default 3 check (target_cash_roas > 0),
  min_link_ctr numeric not null default 0.8 check (min_link_ctr > 0),
  max_frequency numeric not null default 3.5 check (max_frequency > 0),
  max_attribution_gap_pct numeric not null default 25 check (max_attribution_gap_pct between 0 and 100),
  min_spend_for_alert numeric not null default 100 check (min_spend_for_alert >= 0),
  stale_sync_hours integer not null default 36 check (stale_sync_hours between 1 and 168),
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meta_recommendations
  add column if not exists last_detected_at timestamptz not null default now(),
  add column if not exists occurrences integer not null default 1,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references public.usuarios(id) on delete set null,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists meta_recommendations_status_severity_idx
  on public.meta_recommendations(status, severity, last_detected_at desc);

alter table public.meta_guardrails enable row level security;

drop policy if exists meta_guardrails_marketing_read on public.meta_guardrails;
create policy meta_guardrails_marketing_read on public.meta_guardrails
  for select using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin', 'marketing'))
  );

drop policy if exists meta_guardrails_admin_write on public.meta_guardrails;
create policy meta_guardrails_admin_write on public.meta_guardrails
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  ) with check (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );

comment on table public.meta_guardrails is 'Objetivos y límites internos para detectar desvíos. No modifican campañas de Meta.';

commit;
