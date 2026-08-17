-- Canales editoriales configurables para el timeline de Marca.
create table if not exists public.canales_contenido (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas_contenido(id) on delete cascade,
  nombre text not null,
  slug text not null,
  plataforma text not null,
  color text not null default 'signal',
  orden integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (marca_id, slug),
  unique (marca_id, plataforma)
);

create index if not exists canales_contenido_marca_orden_idx
  on public.canales_contenido (marca_id, orden);

insert into public.canales_contenido (marca_id, nombre, slug, plataforma, color, orden)
select m.id, seed.nombre, seed.slug, seed.plataforma, seed.color, seed.orden
from public.marcas_contenido m
cross join (values
  ('LinkedIn', 'linkedin', 'linkedin_post', 'blue', 0),
  ('Historias', 'historias', 'instagram_story', 'violet', 1),
  ('Instagram Feed', 'instagram-feed', 'instagram_feed', 'pink', 2)
) as seed(nombre, slug, plataforma, color, orden)
where m.slug = 'blyndtek'
on conflict (marca_id, slug) do nothing;
