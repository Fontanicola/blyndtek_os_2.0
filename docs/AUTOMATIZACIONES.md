# Automatizaciones

Este documento explica cómo desplegar las automatizaciones recurrentes de Blyndtek OS con Supabase Edge Functions, triggers SQL y `pg_cron`.

## 1. Deploy de Edge Functions

Las funciones viven en `supabase/functions/`:

- `cobros-mensuales`
- `marcar-vencidos`
- `sync-google-calendar`

Meta Ads usa una función Vercel separada: `GET /api/cron/meta-sync`, declarada en `vercel.json` a las 10:15 UTC. Vercel envía `Authorization: Bearer $CRON_SECRET`; la ejecución consulta Meta en modo lectura y registra el resultado en `meta_sync_runs`.

Al finalizar una sincronización correcta, la Fase 2 recalcula recomendaciones contra `meta_guardrails`. El análisis es tolerante a fallos: si una regla falla, el sync de datos permanece válido y el error se registra server-side. Las recomendaciones nunca aplican cambios en Meta.

La Fase 3 permite convertir una recomendación en una fila de `meta_action_queue` y someterla a aprobación. Incluso una acción aprobada permanece sin ejecutar: no existe cron de escritura ni permiso `ads_management` habilitado.

### Comando de deploy

```bash
supabase functions deploy cobros-mensuales
supabase functions deploy marcar-vencidos
supabase functions deploy sync-google-calendar
```

### Variables requeridas en Supabase

Las Edge Functions usan estas variables en runtime:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

La función de Google Calendar además depende de las variables ya documentadas por la app:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## 2. Migraciones SQL

Migraciones relevantes:

- `supabase/migrations/003_automatizaciones.sql`
- `supabase/migrations/004_cron_jobs.sql`
- `supabase/migrations/008_agentes_asesor_financiero.sql`
- `supabase/migrations/029_cronista.sql`
- `supabase/migrations/030_cronista_reportes.sql`
- `supabase/migrations/038_meta_ads_control_center.sql`

### Cómo aplicarlas

Opción recomendada:

```bash
supabase db push
```

O bien, manualmente desde Supabase SQL Editor copiando cada archivo.

### Qué hace cada migración

`003_automatizaciones.sql`

- Recalcula `proyectos.avance_pct` cuando cambian las features.
- Documenta que la completitud de fases del roadmap público se calcula en lectura, por lo que no se necesita un trigger extra.
- Agenda el próximo recordatorio de lead cuando se marca un toque como hecho.

`004_cron_jobs.sql`

- Programa los jobs de `cobros-mensuales` y `marcar-vencidos`.
- Deja comentado `sync-google-calendar` hasta que esa Edge Function deje de ser stub.

`008_agentes_asesor_financiero.sql`

- Programa el análisis mensual del agente `asesor-financiero` contra `POST /api/agentes/asesor-financiero/analizar`.
- El route del análisis decide en runtime si genera o no el resumen automático leyendo su fila en `automatizaciones` por `endpoint_trigger`.

`029_cronista.sql`

- Registra el agente `cronista` y la automatización diaria en `automatizaciones`.
- Programa `POST /api/agentes/cronista/generar-preguntas` a las 21:00 de Argentina. El cron usa `00:00 UTC` y el endpoint resuelve la fecha calendario en `America/Argentina/Buenos_Aires`.
- Crea `logs_diarios` con RLS admin-only y el historial mínimo de cambios de estado necesario para no inferir actividad.

`030_cronista_reportes.sql`

- Programa el reporte semanal de socios el domingo a las 20:00 de Argentina (`23:00 UTC`).
- Programa el reporte mensual del mes cerrado el día 1 a las 08:00 de Argentina (`11:00 UTC`).
- Crea `reportes_cronista` con RLS admin-only, dos intentos máximos, error, tokens, costo, Markdown e ID de Resend.

`038_meta_ads_control_center.sql`

- Crea el cache operativo de campañas, conjuntos, anuncios, creatividades e insights diarios.
- Crea historial de sincronizaciones y recomendaciones auditables con lectura para roles `admin` y `marketing`.
- Amplía `leads` con atribución UTM/Meta estructurada; el token de Meta no se almacena en Postgres.

## 3. Placeholders a reemplazar

Antes de correr `004_cron_jobs.sql`, reemplazá:

- `YOUR_PROJECT_REF`
- `YOUR_SERVICE_ROLE_KEY`

Usá el ref real del proyecto Supabase y una service role key válida.

Antes de correr `008_agentes_asesor_financiero.sql`, reemplazá:

- `YOUR_APP_URL`
- `YOUR_SERVICE_ROLE_KEY`

Usá la URL real de producción del sitio y una service role key válida.

Antes de correr `029_cronista.sql`, reemplazá:

- `YOUR_APP_URL`
- `YOUR_SERVICE_ROLE_KEY`

El endpoint cron requiere la service role en `Authorization`. La vista y los endpoints manuales siguen exigiendo una sesión admin.

Antes de correr `030_cronista_reportes.sql`, reemplazá `YOUR_APP_URL` y `YOUR_SERVICE_ROLE_KEY`. Configurá además en el runtime server-side `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `CRONISTA_SOCIOS_EMAILS`.

## 4. Verificación

### Edge Functions

Podés probarlas manualmente con `curl` o con el Dashboard de Supabase Functions.

### Cron jobs

En Supabase podés verificar la ejecución en:

- `cron.job_run_details`
- `cron.job`

Buscá:

- `cobros-mensuales-diario-6am`
- `marcar-vencidos-diario-630am`
- `sync-google-calendar-cada-5-min` cuando se habilite
- `cronista-diario-21hs-argentina`
- `cronista-reporte-semanal-domingo-20hs-ar`
- `cronista-reporte-mensual-dia-1-08hs-ar`

### Señales de que todo quedó bien

- Se crean cobros recurrentes y eventos de recordatorio.
- Los cobros vencidos pasan a estado `vencido`.
- Las features completadas recalculan el avance del proyecto.
- Los toques de leads agendan el siguiente recordatorio automáticamente.
- El asesor financiero genera un análisis mensual sólo cuando su automatización está `activa=true`.
- Cronista crea una única fila diaria, genera entre 3 y 5 preguntas y deja el Markdown marcado como `sin contexto humano` hasta recibir una respuesta.
- `cronista_eventos_estado` empieza a registrar cambios reales después de aplicar la migración; no existe backfill inferido.
- Los reportes semanales y mensuales quedan `completado` con `resend_email_id`, o `fallido` con `error_detalle` después de un único reintento.

## 5. Nota sobre Google Calendar

La sincronización automática cada 5 minutos está preparada como job, pero la Edge Function `sync-google-calendar` quedó documentada como stub. Cuando se complete la integración bidireccional real, se puede descomentar el cron correspondiente.
