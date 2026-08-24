-- Medición first-party y auditoría de Meta Conversions API.

begin;

alter table public.leads
  add column if not exists meta_event_id text,
  add column if not exists meta_capi_status text,
  add column if not exists meta_capi_event_at timestamptz,
  add column if not exists meta_capi_error text;

create unique index if not exists leads_meta_event_id_unique_idx
  on public.leads(meta_event_id) where meta_event_id is not null;

create table if not exists public.meta_capi_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_name text not null,
  event_id text not null unique,
  event_source_url text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'error', 'skipped')),
  attempts integer not null default 0,
  response jsonb not null default '{}'::jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meta_capi_events_lead_idx on public.meta_capi_events(lead_id, created_at desc);
create index if not exists meta_capi_events_status_idx on public.meta_capi_events(status, created_at desc);

alter table public.meta_capi_events enable row level security;

drop policy if exists meta_capi_events_marketing_read on public.meta_capi_events;
create policy meta_capi_events_marketing_read on public.meta_capi_events
  for select using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin', 'marketing'))
  );

drop policy if exists meta_capi_events_admin_write on public.meta_capi_events;
create policy meta_capi_events_admin_write on public.meta_capi_events
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  ) with check (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );

comment on table public.meta_capi_events is 'Registro auditable e idempotente de eventos enviados a Meta Conversions API; no almacena tokens.';

commit;

