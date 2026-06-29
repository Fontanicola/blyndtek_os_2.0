# Automatizaciones

Este documento explica cómo desplegar las automatizaciones recurrentes de Blyndtek OS con Supabase Edge Functions, triggers SQL y `pg_cron`.

## 1. Deploy de Edge Functions

Las funciones viven en `supabase/functions/`:

- `cobros-mensuales`
- `marcar-vencidos`
- `sync-google-calendar`

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

Hay dos migraciones nuevas:

- `supabase/migrations/003_automatizaciones.sql`
- `supabase/migrations/004_cron_jobs.sql`

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

## 3. Placeholders a reemplazar

Antes de correr `004_cron_jobs.sql`, reemplazá:

- `YOUR_PROJECT_REF`
- `YOUR_SERVICE_ROLE_KEY`

Usá el ref real del proyecto Supabase y una service role key válida.

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

### Señales de que todo quedó bien

- Se crean cobros recurrentes y eventos de recordatorio.
- Los cobros vencidos pasan a estado `vencido`.
- Las features completadas recalculan el avance del proyecto.
- Los toques de leads agendan el siguiente recordatorio automáticamente.

## 5. Nota sobre Google Calendar

La sincronización automática cada 5 minutos está preparada como job, pero la Edge Function `sync-google-calendar` quedó documentada como stub. Cuando se complete la integración bidireccional real, se puede descomentar el cron correspondiente.
