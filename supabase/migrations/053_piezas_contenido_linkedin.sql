-- La interfaz y los canales de contenido ya admiten LinkedIn, pero la
-- restriccion historica de piezas_contenido solo permite plataformas de
-- Instagram. Alinea el esquema con el contrato vigente de la aplicacion.

alter table public.piezas_contenido
  drop constraint if exists piezas_contenido_plataforma_check;

alter table public.piezas_contenido
  add constraint piezas_contenido_plataforma_check
  check (plataforma in (
    'instagram_feed',
    'instagram_story',
    'instagram_reel',
    'linkedin_post'
  ));
