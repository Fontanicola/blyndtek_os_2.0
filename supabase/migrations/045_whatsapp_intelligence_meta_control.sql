-- Marketing Hub: inteligencia conversacional y control ampliado de Meta.
begin;

create table if not exists public.whatsapp_conversation_analysis (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.whatsapp_conversations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  summary text not null,
  intent text not null check (intent in ('bajo','medio','alto','cliente','soporte','spam')),
  sentiment text not null check (sentiment in ('positivo','neutral','negativo','mixto')),
  urgency text not null check (urgency in ('baja','media','alta','critica')),
  topics jsonb not null default '[]'::jsonb,
  objections jsonb not null default '[]'::jsonb,
  buying_signals jsonb not null default '[]'::jsonb,
  next_action text not null,
  suggested_reply text,
  lead_score_adjustment integer not null default 0 check (lead_score_adjustment between -30 and 30),
  confidence numeric not null default 0 check (confidence between 0 and 1),
  model text not null default 'deterministic-v1',
  last_message_id text,
  raw jsonb not null default '{}'::jsonb,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_analysis_lead_idx on public.whatsapp_conversation_analysis(lead_id, analyzed_at desc);
create index if not exists whatsapp_analysis_priority_idx on public.whatsapp_conversation_analysis(urgency, intent, analyzed_at desc);

alter table public.whatsapp_conversation_analysis enable row level security;
drop policy if exists whatsapp_conversation_analysis_marketing_read on public.whatsapp_conversation_analysis;
create policy whatsapp_conversation_analysis_marketing_read on public.whatsapp_conversation_analysis
  for select using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','marketing')));
drop policy if exists whatsapp_conversation_analysis_admin_write on public.whatsapp_conversation_analysis;
create policy whatsapp_conversation_analysis_admin_write on public.whatsapp_conversation_analysis
  for all using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

alter table public.meta_action_queue drop constraint if exists meta_action_queue_action_type_check;
alter table public.meta_action_queue add constraint meta_action_queue_action_type_check
  check (action_type in ('review_recommendation','pause_entity','resume_entity','rename_entity','adjust_budget','launch_creative_test','refresh_creative','fix_tracking','review_targeting','other'));

comment on table public.whatsapp_conversation_analysis is 'Análisis persistente de intención, urgencia, objeciones y próxima acción por conversación de WhatsApp.';
commit;
