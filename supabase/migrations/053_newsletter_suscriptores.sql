begin;

create table if not exists public.newsletter_suscriptores (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nombre text,
  empresa text,
  estado text not null default 'activo' check (estado in ('activo', 'desuscripto', 'rebotado')),
  fuente text,
  landing_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  visitor_id text,
  web_session_id text references public.web_sessions(id) on delete set null,
  consentimiento_at timestamptz not null default now(),
  desuscripto_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsletter_suscriptores_email_unique
  on public.newsletter_suscriptores (lower(email));
create index if not exists newsletter_suscriptores_estado_created_idx
  on public.newsletter_suscriptores (estado, created_at desc);
create index if not exists newsletter_suscriptores_fuente_idx
  on public.newsletter_suscriptores (fuente, created_at desc);

alter table public.newsletter_suscriptores enable row level security;

drop policy if exists newsletter_suscriptores_marketing_read on public.newsletter_suscriptores;
create policy newsletter_suscriptores_marketing_read
  on public.newsletter_suscriptores
  for select
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol in ('admin', 'marketing')
    )
  );

drop policy if exists newsletter_suscriptores_admin_write on public.newsletter_suscriptores;
create policy newsletter_suscriptores_admin_write
  on public.newsletter_suscriptores
  for all
  using (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.rol = 'admin'
    )
  );

comment on table public.newsletter_suscriptores is 'Audiencia consentida de La Operación, la publicación editorial de Blyndtek.';
comment on column public.newsletter_suscriptores.fuente is 'Ubicación o formulario desde el que se originó la suscripción.';

commit;
