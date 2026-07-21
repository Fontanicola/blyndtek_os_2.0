-- Generación mensual de egresos recurrentes.
-- Reemplazar:
--   - YOUR_APP_URL
--   - YOUR_SERVICE_ROLE_KEY
-- antes de aplicar en producción.

INSERT INTO public.automatizaciones (
  agente_id,
  nombre,
  descripcion,
  activa,
  frecuencia,
  dia_semana,
  dia_mes,
  hora,
  endpoint_trigger
)
SELECT
  agentes.id,
  'Instancias mensuales de egresos recurrentes',
  'Genera automáticamente las instancias reales de egresos recurrentes para el mes en curso.',
  true,
  'mensual',
  NULL,
  1,
  '06:15:00',
  '/api/egresos/generar-recurrentes-mes'
FROM public.agentes
WHERE agentes.slug = 'cierre-mensual'
  AND NOT EXISTS (
    SELECT 1
    FROM public.automatizaciones
    WHERE endpoint_trigger = '/api/egresos/generar-recurrentes-mes'
  );

SELECT cron.schedule(
  'egresos-recurrentes-mensual-dia-1-615am',
  '15 6 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_APP_URL/api/egresos/generar-recurrentes-mes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
