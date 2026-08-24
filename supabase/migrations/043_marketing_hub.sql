-- Marketing Hub: medición first-party, WhatsApp e Instagram.
begin;

alter table public.leads add column if not exists web_session_id text;
create index if not exists leads_web_session_id_idx on public.leads(web_session_id);

create table if not exists public.web_sessions (
  id text primary key,
  visitor_id text not null,
  started_at timestamptz not null,
  last_seen_at timestamptz not null,
  landing_url text,
  landing_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  fbclid text,
  device_type text,
  event_count integer not null default 0,
  engaged boolean not null default false,
  converted_lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists web_sessions_started_idx on public.web_sessions(started_at desc);
create index if not exists web_sessions_campaign_idx on public.web_sessions(meta_campaign_id, started_at desc);
create index if not exists web_sessions_utm_campaign_idx on public.web_sessions(utm_campaign, started_at desc);

create table if not exists public.web_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  session_id text not null references public.web_sessions(id) on delete cascade,
  visitor_id text not null,
  event_name text not null,
  path text,
  url text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index if not exists web_events_occurred_idx on public.web_events(occurred_at desc);
create index if not exists web_events_name_occurred_idx on public.web_events(event_name, occurred_at desc);
create index if not exists web_events_session_idx on public.web_events(session_id, occurred_at);

create or replace function public.increment_web_session_event_count(session_key text)
returns void language sql security definer set search_path = public as $$
  update public.web_sessions set event_count = event_count + 1, last_seen_at = now(), updated_at = now() where id = session_key;
$$;
revoke all on function public.increment_web_session_event_count(text) from public, anon, authenticated;
grant execute on function public.increment_web_session_event_count(text) to service_role;

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,
  lead_id uuid references public.leads(id) on delete set null,
  session_id text references public.web_sessions(id) on delete set null,
  phone_number_id text,
  contact_name text,
  referral jsonb not null default '{}'::jsonb,
  first_message_at timestamptz,
  last_message_at timestamptz,
  first_response_at timestamptz,
  message_count integer not null default 0,
  unread_count integer not null default 0,
  status text not null default 'open' check (status in ('open','qualified','closed','spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_messages (
  id text primary key,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text,
  status text,
  text_preview text,
  timestamp timestamptz not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_conversation_idx on public.whatsapp_messages(conversation_id, timestamp desc);

create table if not exists public.instagram_media (
  id text primary key,
  account_id text not null,
  caption text,
  media_type text,
  media_product_type text,
  media_url text,
  thumbnail_url text,
  permalink text,
  posted_at timestamptz,
  like_count bigint not null default 0,
  comments_count bigint not null default 0,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);
create index if not exists instagram_media_posted_idx on public.instagram_media(posted_at desc);

create table if not exists public.instagram_insights_daily (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  media_id text references public.instagram_media(id) on delete cascade,
  date date not null,
  metric text not null,
  value numeric not null default 0,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (account_id, media_id, date, metric)
);
create index if not exists instagram_insights_date_idx on public.instagram_insights_daily(date desc, metric);

do $$
declare table_name text;
begin
  foreach table_name in array array['web_sessions','web_events','whatsapp_conversations','whatsapp_messages','instagram_media','instagram_insights_daily'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_marketing_read', table_name);
    execute format('create policy %I on public.%I for select using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in (''admin'',''marketing'')))', table_name || '_marketing_read', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_write', table_name);
    execute format('create policy %I on public.%I for all using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = ''admin'')) with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = ''admin''))', table_name || '_admin_write', table_name);
  end loop;
end $$;

comment on table public.web_events is 'Eventos first-party sin PII usados para medir el recorrido web y atribuir conversiones.';
comment on table public.whatsapp_messages is 'Mensajes y estados recibidos mediante WhatsApp Cloud API.';
commit;
