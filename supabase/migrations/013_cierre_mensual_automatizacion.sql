INSERT INTO public.automatizaciones (
  agente_id,
  nombre,
  descripcion,
  activa,
  frecuencia,
  dia_semana,
  dia_mes,
  hora,
  endpoint_trigger,
  ultima_ejecucion
)
SELECT
  agentes.id,
  'Cierre de caja mensual',
  'Genera el resumen automático del cierre de caja de cada mes.',
  true,
  'mensual',
  null,
  28,
  '18:00:00',
  '/api/cierres-mensuales/generar',
  null
FROM public.agentes
WHERE agentes.slug = 'cierre-mensual'
  AND NOT EXISTS (
    SELECT 1
    FROM public.automatizaciones
    WHERE endpoint_trigger = '/api/cierres-mensuales/generar'
  );
