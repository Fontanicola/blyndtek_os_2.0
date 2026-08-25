-- Instagram Content Studio: programación segura, reintentos y bloqueo anti-duplicados.

alter table public.piezas_contenido
  add column if not exists publication_attempts integer not null default 0,
  add column if not exists publication_locked_at timestamptz null,
  add column if not exists publication_next_retry_at timestamptz null,
  add column if not exists last_publication_attempt_at timestamptz null,
  add column if not exists published_permalink text null;

create index if not exists piezas_contenido_instagram_due_idx
  on public.piezas_contenido (fecha_programada, publication_next_retry_at)
  where estado = 'programada' and plataforma in ('instagram_feed', 'instagram_story', 'instagram_reel');

create unique index if not exists contenido_publicaciones_log_instagram_published_once_idx
  on public.contenido_publicaciones_log (pieza_id, red)
  where estado = 'publicado' and red = 'instagram';

create or replace function public.claim_due_instagram_pieces(max_items integer default 5)
returns setof public.piezas_contenido
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with due as (
    select p.id
    from public.piezas_contenido p
    where p.estado = 'programada'
      and p.plataforma in ('instagram_feed', 'instagram_story', 'instagram_reel')
      and p.fecha_programada is not null
      and p.fecha_programada <= now()
      and (p.publication_next_retry_at is null or p.publication_next_retry_at <= now())
      and (p.publication_locked_at is null or p.publication_locked_at < now() - interval '20 minutes')
      and p.meta_post_id is null
    order by p.fecha_programada asc
    for update skip locked
    limit greatest(1, least(max_items, 10))
  )
  update public.piezas_contenido p
  set publication_locked_at = now(),
      last_publication_attempt_at = now(),
      publication_attempts = p.publication_attempts + 1,
      meta_error = null,
      updated_at = now()
  from due
  where p.id = due.id
  returning p.*;
end;
$$;

revoke all on function public.claim_due_instagram_pieces(integer) from public;
grant execute on function public.claim_due_instagram_pieces(integer) to service_role;

comment on function public.claim_due_instagram_pieces(integer) is
  'Reclama piezas vencidas de Instagram con SKIP LOCKED para evitar publicaciones duplicadas.';
