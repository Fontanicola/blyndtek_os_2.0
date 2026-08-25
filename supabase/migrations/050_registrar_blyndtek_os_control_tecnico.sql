-- Registra el propio Blyndtek OS en el control plane y declara la cobertura
-- verificada durante la instalación del centro de operaciones técnicas.

insert into public.sistemas_gestionados (
  nombre,
  url_produccion,
  vercel_project_id,
  vercel_team_id,
  supabase_project_ref,
  stack,
  version_patrones,
  estado,
  monitoreo_activo
)
select
  'Blyndtek OS 2.0',
  'https://sistema.blyndtek.com',
  'prj_LngyjN8q9HPuqtaqwVO02Lf2UUb3',
  'team_wRHKgVJ2IEyAD3Qfg8R0A77p',
  'gyspazxpnzwkzrqlikqw',
  '{"framework":"Next.js 14","hosting":"Vercel","database":"Supabase","language":"TypeScript"}'::jsonb,
  'control-tecnico-v1',
  'activo',
  true
where not exists (
  select 1
  from public.sistemas_gestionados
  where vercel_project_id = 'prj_LngyjN8q9HPuqtaqwVO02Lf2UUb3'
);

insert into public.sistemas_integraciones (sistema_id, proveedor, estado, ultima_sincronizacion_at, configuracion)
select sistema.id, integracion.proveedor, integracion.estado, now(), integracion.configuracion
from public.sistemas_gestionados sistema
cross join (
  values
    ('vercel', 'conectado', '{"project_id":"prj_LngyjN8q9HPuqtaqwVO02Lf2UUb3"}'::jsonb),
    ('supabase', 'conectado', '{"project_ref":"gyspazxpnzwkzrqlikqw"}'::jsonb),
    ('github', 'conectado', '{"repository":"Fontanicola/blyndtek_os_2.0"}'::jsonb),
    ('linear', 'conectado', '{"project":"Blyndtek OS · Control técnico"}'::jsonb),
    ('graphify', 'conectado', '{"mode":"project","graph":"graphify-out/graph.json"}'::jsonb),
    ('posthog', 'conectado', '{"project_id":575415,"dashboard_id":2029086}'::jsonb),
    ('sentry', 'no_configurado', '{}'::jsonb)
) as integracion(proveedor, estado, configuracion)
where sistema.vercel_project_id = 'prj_LngyjN8q9HPuqtaqwVO02Lf2UUb3'
on conflict (sistema_id, proveedor) do update
set estado = excluded.estado,
    ultima_sincronizacion_at = excluded.ultima_sincronizacion_at,
    ultimo_error = null,
    configuracion = excluded.configuracion,
    updated_at = now();

insert into public.sistemas_slos (sistema_id)
select id
from public.sistemas_gestionados
where vercel_project_id = 'prj_LngyjN8q9HPuqtaqwVO02Lf2UUb3'
on conflict (sistema_id) do nothing;
