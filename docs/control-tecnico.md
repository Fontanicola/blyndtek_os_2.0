# Control técnico de Blyndtek OS

## Objetivo

Centralizar señales técnicas, agrupar errores repetidos en incidentes y permitir que Codex prepare correcciones verificadas sin desplegar ni modificar producción de forma autónoma.

## Fuentes

- Vercel: deploys, runtime logs, respuestas 5xx, crons, latencia, Web Analytics y Speed Insights.
- Sentry: excepciones de cliente, servidor y edge, con datos sensibles filtrados.
- PostHog: comportamiento de producto y session replay muestreado, con inputs enmascarados.
- Supabase: inventario de sistemas, eventos, incidentes, integraciones, SLOs y remediaciones.
- Linear: seguimiento humano de incidentes, deuda técnica y decisiones pendientes.
- Graphify: grafo local del código para reducir exploración y contexto antes de diagnosticar.

## Flujo

1. Una fuente envía o expone una señal.
2. El evento se normaliza, se redactan secretos y se calcula un fingerprint estable.
3. Los errores repetidos actualizan un único incidente abierto y aumentan su contador.
4. El panel `/software` presenta salud, volumen, incidentes activos y cobertura de integraciones.
5. La guardia de Codex revisa cada dos horas, correlaciona evidencia y puede preparar un fix en un worktree aislado.
6. Merge, deploy, cambios de datos, secretos, permisos y presupuesto requieren aprobación explícita.

## Endpoints

- `POST /api/sistemas/observabilidad/ingest`: ingesta genérica con bearer `TECH_OPS_INGEST_SECRET`.
- `POST /api/webhooks/observabilidad/vercel`: ingesta de Log Drain validada con `x-vercel-signature` y `VERCEL_DRAIN_SECRET`.
- `GET /api/sistemas/operaciones`: resumen operativo autenticado para administradores.

## Variables

Las variables y ejemplos viven en `.env.example`. Nunca registrar DSNs privados, tokens, cookies, authorization headers, query strings sensibles ni cuerpos de request completos.

## Migraciones

- `048_control_tecnico_observabilidad.sql`: tablas y extensiones del control técnico.
- `049_reparar_logs_diarios_seguro.sql`: reparación idempotente de `logs_diarios` sin ejecutar el cron histórico con placeholders.

Antes de aplicar una migración, confirmar que el project ref coincide con la base usada por el deployment. Actualmente existe una discrepancia entre el proyecto Supabase accesible y la instancia histórica aparente; no desplegar hasta resolverla.

## Operación externa

- Dashboard PostHog: <https://us.posthog.com/project/575415/dashboard/2029086>
- Proyecto Linear: <https://linear.app/blyndtek/project/blyndtek-os-control-tecnico-8e61ad8cc39b>

## Verificación mínima

```bash
npx tsc --noEmit
npm run lint
npm run build
graphify update .
```

Si el build local no tiene variables de Supabase, usar valores de placeholder únicamente para validar compilación. No subir placeholders ni usarlos en un deployment.
