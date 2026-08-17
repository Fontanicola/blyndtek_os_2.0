create table if not exists public.contenido_feed_slots (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas_contenido(id) on delete cascade,
  plataforma text not null,
  slot_orden integer not null,
  fecha_programada timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marca_id, plataforma, slot_orden)
);

create index if not exists contenido_feed_slots_lookup_idx
  on public.contenido_feed_slots (marca_id, plataforma, slot_orden);
