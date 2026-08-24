-- Meta Ads — Fase 3 segura: propuestas de acción con aprobación humana.
-- Esta tabla no otorga permisos de escritura sobre Meta ni ejecuta cambios.

begin;

create table if not exists public.meta_action_queue (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references public.meta_recommendations(id) on delete set null,
  action_type text not null default 'review_recommendation'
    check (action_type in ('review_recommendation', 'pause_entity', 'adjust_budget', 'launch_creative_test', 'refresh_creative', 'fix_tracking', 'review_targeting', 'other')),
  entity_type text,
  entity_id text,
  title text not null,
  rationale text not null,
  proposed_action text not null,
  proposed_payload jsonb not null default '{}'::jsonb,
  risk_level text not null default 'medium'
    check (risk_level in ('low', 'medium', 'high')),
  status text not null default 'pending_approval'
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'executed', 'failed')),
  requested_by uuid references public.usuarios(id) on delete set null,
  reviewed_by uuid references public.usuarios(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  executed_at timestamptz,
  notes text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meta_action_queue_status_idx
  on public.meta_action_queue(status, requested_at desc);
create index if not exists meta_action_queue_recommendation_idx
  on public.meta_action_queue(recommendation_id);
create unique index if not exists meta_action_queue_active_recommendation_idx
  on public.meta_action_queue(recommendation_id)
  where recommendation_id is not null and status in ('draft', 'pending_approval', 'approved');

alter table public.meta_action_queue enable row level security;
drop policy if exists meta_action_queue_marketing_read on public.meta_action_queue;
create policy meta_action_queue_marketing_read on public.meta_action_queue
  for select using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin', 'marketing'))
  );
drop policy if exists meta_action_queue_admin_write on public.meta_action_queue;
create policy meta_action_queue_admin_write on public.meta_action_queue
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  ) with check (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );

comment on table public.meta_action_queue is 'Cola auditable de propuestas Meta. Aprobado no significa ejecutado; la ejecución permanece bloqueada hasta habilitar ads_management.';
comment on column public.meta_action_queue.proposed_payload is 'Payload futuro y no secreto. Nunca almacenar tokens ni credenciales.';

commit;
