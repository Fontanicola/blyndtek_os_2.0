create table if not exists public.preferencias_navegacion (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios(id) on delete cascade,
  secciones_ocultas text[] not null default '{}',
  modo_foco_activo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.preferencias_navegacion enable row level security;

drop policy if exists preferencias_navegacion_select_own on public.preferencias_navegacion;
create policy preferencias_navegacion_select_own
  on public.preferencias_navegacion for select
  using (usuario_id = auth.uid());

drop policy if exists preferencias_navegacion_insert_own on public.preferencias_navegacion;
create policy preferencias_navegacion_insert_own
  on public.preferencias_navegacion for insert
  with check (usuario_id = auth.uid());

drop policy if exists preferencias_navegacion_update_own on public.preferencias_navegacion;
create policy preferencias_navegacion_update_own
  on public.preferencias_navegacion for update
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
