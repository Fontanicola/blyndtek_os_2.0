-- Orden editorial, pineado y anotaciones visuales persistentes para Marca.
alter table public.piezas_contenido
  add column if not exists feed_orden integer null,
  add column if not exists feed_pineado boolean not null default false,
  add column if not exists workspace_data jsonb null;

create index if not exists piezas_contenido_feed_orden_idx
  on public.piezas_contenido (marca_id, plataforma, feed_pineado desc, feed_orden asc, created_at asc);
