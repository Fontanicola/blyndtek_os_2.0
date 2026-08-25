-- Endurece la reparación del esquema de Soporte. Las rutas de la aplicación
-- usan service_role; el acceso directo queda limitado a administradores.

alter table public.soporte_tickets enable row level security;
alter table public.soporte_handoffs enable row level security;
alter table public.revisiones_cuenta enable row level security;
alter table public.oportunidades_upsell enable row level security;

drop policy if exists soporte_tickets_admin on public.soporte_tickets;
create policy soporte_tickets_admin on public.soporte_tickets
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists soporte_handoffs_admin on public.soporte_handoffs;
create policy soporte_handoffs_admin on public.soporte_handoffs
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists revisiones_cuenta_admin on public.revisiones_cuenta;
create policy revisiones_cuenta_admin on public.revisiones_cuenta
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));

drop policy if exists oportunidades_upsell_admin on public.oportunidades_upsell;
create policy oportunidades_upsell_admin on public.oportunidades_upsell
  for all to public
  using (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'))
  with check (exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin'));
