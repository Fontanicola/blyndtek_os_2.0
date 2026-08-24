-- Meta Ads — Fase 4: ejecución controlada, simulación y auditoría.

begin;

create table if not exists public.meta_execution_policy (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text not null unique,
  execution_enabled boolean not null default false,
  dry_run_only boolean not null default true,
  allow_pause boolean not null default true,
  allow_resume boolean not null default false,
  allow_budget_changes boolean not null default false,
  max_budget_increase_pct numeric not null default 20 check (max_budget_increase_pct between 0 and 100),
  max_daily_budget_usd numeric not null default 100 check (max_daily_budget_usd >= 0),
  cooldown_minutes integer not null default 30 check (cooldown_minutes between 0 and 1440),
  updated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meta_action_queue
  add column if not exists simulated_at timestamptz,
  add column if not exists simulation_result jsonb,
  add column if not exists execution_requested_at timestamptz,
  add column if not exists executed_by uuid references public.usuarios(id) on delete set null,
  add column if not exists meta_request_id text,
  add column if not exists before_state jsonb,
  add column if not exists after_state jsonb,
  add column if not exists idempotency_key uuid not null default gen_random_uuid();

create unique index if not exists meta_action_queue_idempotency_key_idx
  on public.meta_action_queue(idempotency_key);

create table if not exists public.meta_action_executions (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.meta_action_queue(id) on delete cascade,
  mode text not null check (mode in ('simulate', 'live')),
  outcome text not null check (outcome in ('validated', 'blocked', 'success', 'error')),
  entity_type text,
  entity_id text,
  request_payload jsonb not null default '{}'::jsonb,
  before_state jsonb,
  after_state jsonb,
  meta_request_id text,
  error_message text,
  initiated_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists meta_action_executions_action_idx
  on public.meta_action_executions(action_id, created_at desc);
create index if not exists meta_action_executions_entity_idx
  on public.meta_action_executions(entity_type, entity_id, created_at desc);

insert into public.meta_execution_policy (ad_account_id)
values ('act_1042754824731599')
on conflict (ad_account_id) do nothing;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['meta_execution_policy', 'meta_action_executions']
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

comment on table public.meta_execution_policy is 'Kill switch y límites de ejecución Meta. La variable META_WRITE_ENABLED debe coincidir para permitir una mutación.';
comment on table public.meta_action_executions is 'Log append-only de simulaciones, bloqueos, éxitos y errores de ejecución Meta.';

commit;
