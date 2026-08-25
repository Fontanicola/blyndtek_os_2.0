# Control técnico de Blyndtek OS

## Objetivo

Centralizar el estado técnico de todos los productos, agrupar errores repetidos por causa raíz y mantener una bitácora auditable de cada guardia, diagnóstico y corrección realizada por Codex.

## Inventario vigilado

- Blyndtek OS
- Funes Exclusivos
- Control de Obra
- Trackit
- ARC
- Blyndtek Web

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
4. El panel `/software` consolida salud, latencia p95, disponibilidad, errores, incidentes, deploys, cobertura, guardias y acciones.
5. Supabase Realtime actualiza señales, guardias y acciones; un polling de respaldo refresca el tablero cada 30 segundos.
6. La guardia de Codex revisa cada dos horas, correlaciona evidencia y registra la ejecución completa.
7. Cada intervención registra sistema, incidente, actor, estado, branch, commit, deployment y evidencia no sensible.
8. Las correcciones seguras siguen la política de autonomía de la guardia; secretos, datos, permisos, dominios y presupuesto requieren aprobación explícita.

## Endpoints

- `POST /api/sistemas/observabilidad/ingest`: ingesta genérica con bearer `TECH_OPS_INGEST_SECRET`.
- `POST /api/webhooks/observabilidad/vercel`: ingesta de Log Drain validada con `x-vercel-signature` y `VERCEL_DRAIN_SECRET`.
- `GET /api/sistemas/operaciones`: resumen operativo autenticado para administradores.
- `GET|POST|PATCH /api/sistemas/guardias`: consulta y registro de ejecuciones de guardia.
- `GET|POST|PATCH /api/sistemas/acciones`: bitácora de diagnósticos, fixes, verificaciones y despliegues.

## Registro desde Codex

El helper carga el entorno local sin imprimir credenciales y sólo devuelve el identificador y estado creados:

```bash
npm run tech:record -- guardia --status saludable --systems 6 --incidents 0 --actions 0 --summary "Flota estable"
npm run tech:record -- accion --project prj_xxx --type correccion --status verificada --title "Fix verificado" --branch codex/fix --commit abc123
```

## Variables

Las variables y ejemplos viven en `.env.example`. Nunca registrar DSNs privados, tokens, cookies, authorization headers, query strings sensibles ni cuerpos de request completos.

## Migraciones

- `048_control_tecnico_observabilidad.sql`: tablas y extensiones del control técnico.
- `049_reparar_logs_diarios_seguro.sql`: reparación idempotente de `logs_diarios` sin ejecutar el cron histórico con placeholders.
- `050_registrar_blyndtek_os_control_tecnico.sql`: alta inicial de Blyndtek OS.
- `051_reparar_soporte_con_rls.sql`: reparación segura del módulo de soporte.
- `052_guardias_acciones_control_tecnico.sql`: inventario multiproyecto, guardias, acciones y canales Realtime.

El project ref de producción verificado es `gyspazxpnzwkzrqlikqw`. Confirmarlo antes de aplicar futuras migraciones.

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
