-- Cron jobs para automatizaciones recurrentes.
-- Reemplazar los placeholders:
--   - YOUR_PROJECT_REF
--   - YOUR_SERVICE_ROLE_KEY
-- Antes de ejecutar en Supabase.

-- ============================================================================
-- cobros-mensuales: diariamente a las 6:00 AM
-- ============================================================================

SELECT cron.schedule(
  'cobros-mensuales-diario-6am',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cobros-mensuales',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- marcar-vencidos: diariamente a las 6:30 AM
-- ============================================================================

SELECT cron.schedule(
  'marcar-vencidos-diario-630am',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/marcar-vencidos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- sync-google-calendar: cada 5 minutos
-- ============================================================================
-- La Edge Function actualmente está documentada como stub. Cuando esté lista,
-- descomentar el job siguiente.

-- SELECT cron.schedule(
--   'sync-google-calendar-cada-5-min',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-google-calendar',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
