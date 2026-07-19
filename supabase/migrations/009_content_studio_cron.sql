-- Cron job semanal para Content Studio automático.
-- Reemplazar los placeholders:
--   - YOUR_APP_URL
--   - YOUR_SERVICE_ROLE_KEY
-- antes de aplicarlo en Supabase.

SELECT cron.schedule(
  'content-studio-semanal-lunes-8am',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_APP_URL/api/planes-semanales/generar-automatico',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
