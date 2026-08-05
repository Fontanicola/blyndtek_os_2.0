-- Rol de trabajo para la gestión de marca, contenido y canales de Blyndtek.
-- Ejecutar manualmente en Supabase SQL Editor o via CLI.

alter table public.usuarios
  drop constraint if exists usuarios_rol_check;

alter table public.usuarios
  add constraint usuarios_rol_check
  check (rol in ('admin', 'miembro', 'comercial', 'marketing'));
