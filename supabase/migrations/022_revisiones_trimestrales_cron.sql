-- Prepara las revisiones de cuenta en el cierre de cada trimestre.
-- Reemplazar YOUR_APP_URL y YOUR_SERVICE_ROLE_KEY antes de aplicar.

insert into public.agentes (slug, nombre, descripcion, tipo, activo, color)
select 'gestor-cuentas', 'Gestor de cuentas', 'Prepara revisiones trimestrales y mantiene trazabilidad de soporte y expansión.', 'vigilante', true, 'signal'
where not exists (select 1 from public.agentes where slug = 'gestor-cuentas');

insert into public.automatizaciones (agente_id, nombre, descripcion, activa, frecuencia, dia_semana, dia_mes, hora, endpoint_trigger, ultima_ejecucion)
select agentes.id, 'Revisiones trimestrales', 'Prepara una revisión de cuenta para cada cliente activo al cierre de cada trimestre.', true, 'mensual', null, 25, '09:00:00', '/api/soporte/revisiones/generar', null
from public.agentes
where agentes.slug = 'gestor-cuentas'
and not exists (select 1 from public.automatizaciones where endpoint_trigger = '/api/soporte/revisiones/generar');

select cron.schedule('revisiones-cuenta-trimestrales-9am', '0 9 25 3,6,9,12 *', $$
  select net.http_post(
    url := 'https://YOUR_APP_URL/api/soporte/revisiones/generar',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);
