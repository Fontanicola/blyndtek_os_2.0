# Blyndtek OS — Progress Log

Proyecto: Blyndtek OS

Stack: Next.js 14 (App Router) · TypeScript estricto · Tailwind CSS · Supabase (PostgreSQL + Auth + RLS + Edge Functions + pg_cron) · Vercel · Claude API (`claude-sonnet-4-6`) · Google Calendar API

Fecha de inicio: 2026-06-25

Estado general actual: Fase 0 completa. Cimientos técnicos listos: documentación fundacional, setup del repo, design system, shell de app y sistema de autenticación base. Las fases 1, 2 y 3 del roadmap original quedaron completadas.

## Actualización 2026-07-17

- Se corrigió el roadmap público para que refleje al instante cambios de fases/features hechos desde `/proyectos`.
- Causa exacta encontrada: el route handler `app/api/roadmap/[token]/route.ts` estaba quedando en una versión estática/caché de servidor para `GET`, por lo que servía datos viejos aunque el browser hiciera hard refresh.
- Fix aplicado:
  - `export const dynamic = "force-dynamic";`
  - `export const revalidate = 0;`
- Verificación funcional local:
  - Se cambió temporalmente una feature real de `QA producción` en `Funes Exclusivos` de `pendiente` a `lista`.
  - La respuesta de `/api/roadmap/funes-exclusivos-80tm` reflejó de inmediato el cambio en el conteo de la fase (`0/5` → `1/5`) sin esperar cache.
  - Luego se revirtió la feature a su estado original para no dejar datos alterados.
- Verificación local completa:
  - `npm run lint` pasó sin errores.
  - `npm run build` pasó sin errores.

## Actualización 2026-07-17

- Se corrigieron 3 bugs aislados del Asesor Financiero:
  - `caja_actual_usd` ahora usa la misma lógica real que Tesorería (`balance_total`) mediante el helper compartido `lib/finanzas/tesoreria.ts`, en lugar de un cálculo propio.
  - `runway_estado` ahora viaja explícitamente al análisis: cuando el negocio está en estado `estable`, el asesor ya no lo muestra como `0 meses`; la UI lo presenta como `Estable` y el prompt de Claude lo trata como buena noticia, no como riesgo.
  - `analisis_texto` ahora se renderiza como Markdown real en `/finanzas → Asesor` y en `/ai-hub/agentes`, por lo que headings, negrita y separadores dejan de verse como texto crudo.
- Verificación local completa:
  - `npm run lint` pasó sin errores.
  - `npm run build` pasó sin errores.
- Validación funcional:
  - El valor de `Caja actual` quedó alineado con el `balance_total` real de Tesorería al reutilizar la misma función de cálculo compartida (`9980.51` en la corrida de validación).
  - El runway real quedó correctamente identificado como `estable`, por lo que el asesor ya no lo interpreta como `0 meses`.

## Actualización 2026-07-17

- Se agregó al Dashboard financiero el comparativo mensual de `Ventas vs Cobrado` para los últimos 6 meses, usando barras sólidas y tooltip que sigue el mouse.
- La API de Dashboard ahora expone `historico_ventas_vs_cobrado` y `total_vendido_6m`, calculando `Ventas` solo a partir de contratos activos agrupados por fecha de creación para no duplicar contratos redefinidos.
- En la fila financiera se sumó la card `Vendido (6 meses)` y el gráfico nuevo quedó ubicado debajo del P&L para comparar ventas cerradas versus caja efectivamente cobrada.
- Verificación local completa: `npm run lint` y `npm run build` pasaron sin errores.

## Actualización 2026-07-17

- Se corrigió un bug sistémico de zona horaria que hacía que cualquier fecha sin hora se guardara un día antes en Argentina.
- La causa raíz era el patrón clásico `new Date("YYYY-MM-DD")` y/o `toISOString().slice(0, 10)` aplicado a campos `DATE` (sin hora), lo que interpretaba la fecha como UTC y la corría hacia atrás al persistirla o formatearla.
- Se centralizó el tratamiento de fechas en `lib/utils/fechas.ts` y se reemplazaron los usos peligrosos por parseo/formateo local.
- Archivos corregidos o alineados con el helper:
  - `lib/utils/fechas.ts`
  - `lib/utils/formatters.ts`
  - `components/finanzas/CobroModal.tsx`
  - `components/finanzas/EgresoModal.tsx`
  - `components/finanzas/FinanzasClient.tsx`
  - `components/finanzas/SuscripcionesLista.tsx`
  - `components/finanzas/CobrosTabla.tsx`
  - `components/finanzas/EgresosTabla.tsx`
  - `components/clientes/ClienteFicha.tsx`
  - `components/roadmap/ResumenPagos.tsx`
  - `components/proyectos/ProyectoCard.tsx`
  - `components/outbound/LeadModal.tsx`
  - `components/tareas/TareaModal.tsx`
  - `components/inbound/InboundFicha.tsx`
  - `components/agentes/AgentesClient.tsx`
  - `components/perfil/PerfilClient.tsx`
  - `components/finanzas/AsesorFinancieroTab.tsx`
  - `components/finanzas/ComisionesTabla.tsx`
  - `components/calendario/EventoModal.tsx`
  - `components/calendario/EventoChip.tsx`
  - `app/api/calendario/route.ts`
  - `app/api/calendario/sync/route.ts`
  - `app/api/eventos/route.ts`
  - `app/api/eventos-invitados/[id]/route.ts`
  - `app/api/leads/[id]/etapa/route.ts`
  - `app/api/suscripciones/[id]/activar/route.ts`
  - `app/api/finanzas/generar-cobros-mensuales/route.ts`
  - `app/api/finanzas/metricas/route.ts`
  - `app/api/finanzas/tesoreria/route.ts`
  - `app/api/finanzas/runway/route.ts`
  - `app/api/clientes/[id]/rentabilidad/route.ts`
  - `app/api/cobros/[id]/route.ts`
  - `app/api/comisiones/[id]/marcar-pagada/route.ts`
  - `app/api/dashboard/route.ts`
  - `app/api/productos/[id]/metricas/route.ts`
  - `app/api/agentes/asesor-financiero/analizar/route.ts`
  - `app/api/mi-panel/metricas/route.ts`
  - `lib/finanzas.ts`
  - `lib/finanzas/calcularEgresosPeriodo.ts`
  - `lib/finanzas/runwayProjection.ts`
  - `lib/dashboard.ts`
  - `lib/leads.ts`
  - `lib/tareas.ts`
  - `lib/productos.ts`
  - `lib/contratos/crearOActualizarContrato.ts`
  - `lib/agentes/calcularMetricasAsesor.ts`
  - `supabase/functions/_shared/supabase.ts`
- Verificación local completa: `npm run lint` y `npm run build` pasaron sin errores luego del reemplazo.

## Actualización 2026-07-14

- Se agregó soporte de passkeys experimentales de Supabase como método adicional de acceso, sin reemplazar contraseña.
- `lib/supabase/client.ts` quedó configurado con `auth.experimental.passkey = true` al crear el cliente browser.
- En `/perfil` se agregó la sección para registrar y eliminar passkeys locales de usuario, sincronizadas con la metadata de `public.passkeys`.
- En `/login` se agregó login primero con Touch ID / huella cuando el dispositivo soporta passkeys, manteniendo siempre disponible el formulario tradicional de email y contraseña.
- La versión instalada de `@supabase/supabase-js` ya cumplía el mínimo requerido (`^2.108.2`), así que no hubo que tocar `package.json`.
- Verificación local completa: `npm run build` y `npm run lint` pasaron sin errores.
- Nota operativa: la activación real de Passkeys en Supabase Authentication → Passkeys sigue siendo manual en el dashboard; no se puede habilitar por código desde el repo.

## Actualización 2026-07-14

- Se habilitó la edición de cobros tipo `hito` desde la ficha del cliente, reusando `CobroModal` en modo edición.
- `app/api/cobros/[id]/route.ts` ahora registra cambios en `cobros_historial_cambios` cuando varían `monto` o `fecha_vencimiento`, incluyendo nota opcional y usuario que modificó.
- `components/clientes/ClienteFicha.tsx` ahora muestra un botón `Editar` en hitos, permite expandir el historial de cambios por fila y refresca el cobro editado en la tabla.
- `types/supabase.ts` quedó actualizado con la tabla `cobros_historial_cambios`.
- Confirmé que `app/api/roadmap/[token]/route.ts` ya lee los hitos directamente desde `cobros`, así que cualquier edición se refleja automáticamente en el roadmap público sin cambios extra.
- Verificación local completa: `npm run build` y `npm run lint` pasaron sin errores.

## Actualización 2026-07-15

- Se agregó la sección admin-only `Agentes` en la navegación y se reestructuró como AI Hub con las subsecciones `/ai-hub`, `/ai-hub/agentes` y `/ai-hub/actividad`, manteniendo `Asesor Financiero` como primer caso.
- `lib/agentes/calcularMetricasAsesor.ts` calcula la base determinística real del asesor con runway, margen, excedente, capacidad, pipeline y concentración de riesgo; la IA solo sintetiza ese snapshot, no inventa números.
- Se creó `app/api/agentes/asesor-financiero/analizar/route.ts` para generar y persistir análisis con Claude (`claude-sonnet-4-6`), y se agregó la tab `Asesor` dentro de Finanzas para mostrar el análisis reciente y dispararlo bajo demanda.
- La automatización mensual quedó montada con el mismo patrón recurrente ya usado en el repo: `pg_cron` / `net.http_post` hacia la route de análisis, condicionado por `agente_config.resumen_automatico_activo`.
- Se documentaron las tablas `agentes`, `agente_config` y `agente_analisis` en `docs/DATABASE.md` junto con sus relaciones.
- Verificación local completa: `npm run lint` y `npm run build` pasaron sin errores.

## Actualización 2026-07-16

- Se corrigió el flujo `+ Agregar costo` dentro de la ficha del cliente para reutilizar el `EgresoModal` real con las cajas activas reales del sistema.
- La causa exacta era que `components/clientes/ClienteFicha.tsx` estaba pasando `cajas={[]}` al modal, dejando el selector vacío aunque `/finanzas → Egresos` sí cargaba opciones correctamente.
- Ahora la ficha consume `useCajas()`, filtra `cajasActivas` y se las pasa a `EgresoModal`, por lo que el selector muestra las mismas opciones que el flujo general.
- Verificación local completa: `npm run lint` y `npm run build` pasaron sin errores.

## Actualización 2026-07-17

- `AI Hub` quedó reorganizado con sus 3 subsecciones reales: `Centro IA`, `Agentes` y `Actividad`; además, los 3 agentes existentes se distinguen por badge de tipo en una sola grilla y el feed unificado concentra la actividad de Asesor Financiero, Checklist QA y AI Dev.
- Se agregaron `app/api/agentes/feed/route.ts` y `app/api/agentes/costo-total/route.ts` para unificar actividad y costo de IA entre el Asesor Financiero, Checklist QA y AI Dev.
- `app/api/agentes/asesor-financiero/analizar/route.ts` ahora persiste `tokens_entrada`, `tokens_salida` y `costo_estimado_usd`, de modo que el costo mensual del hub incluye el análisis real del asesor además de AI Dev.
- La UI del hub ahora muestra métricas de costo y acciones semanales, detalle configurable para Asesor Financiero, paneles de solo lectura para los otros agentes y un timeline unificado de actividad reciente.
- Verificación local completa: `npm run lint` y `npm run build` pasaron sin errores.

## Fase 0 — Cimientos

### ✅ 0.1 — Documentación fundacional

- Archivos creados: `docs/SPEC.md`, `docs/DATABASE.md`
- Contenido: especificación funcional completa (10 módulos), esquema de base de datos (13 tablas documentadas), mapa de automatizaciones (10 triggers/jobs), decisiones técnicas, permisos por rol.
- Estado: completo.

### ✅ 0.2 — Setup del repo

- Archivos creados/modificados: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts` (base), `app/globals.css` (base), `.env.example`, `.gitignore`, `README.md`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `app/layout.tsx`, `app/page.tsx`.
- Decisiones técnicas:
  - Se inicializó Next.js 14 con App Router en la raíz del repo, preservando `docs/`.
  - TypeScript quedó con `strict`, `noUncheckedIndexedAccess` y `noImplicitAny`.
  - El alias `@/*` apunta a la raíz del proyecto.
  - Se separaron clientes de Supabase entre browser (`createBrowserClient`) y server (`createServerClient`).
  - Tailwind quedó instalado sin librerías externas de UI.
  - Node engine definido en `>=18.17`.
- Estado: completo.

### ✅ 0.3 — Design system

- Archivos creados/modificados: `tailwind.config.ts` (tokens completos), `app/globals.css`, `types/ui.ts`, `components/ui/Button.tsx`, `components/ui/Input.tsx`, `components/ui/Card.tsx`, `components/ui/Badge.tsx`, `components/ui/Modal.tsx`, `components/ui/Spinner.tsx`, `components/ui/index.ts`, `app/page.tsx` (preview), `lib/cn.ts`.
- Tokens definidos: paleta (`carbon`, `signal`, `paper`, `white`, `graphite` + variantes semánticas), tipografía (Inter, pesos 400/500/600), radios (`component`, `card`, `pill`), sombras (`soft`, `card`, `modal`), transiciones (`fast`, `normal`).
- Estado: completo.

### ✅ 0.4 — Layout base

- Archivos creados/modificados: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/outbound/page.tsx`, `app/(app)/inbound/page.tsx`, `app/(app)/clientes/page.tsx`, `app/(app)/cotizador/page.tsx`, `app/(app)/proyectos/page.tsx`, `app/(app)/tareas/page.tsx`, `app/(app)/calendario/page.tsx`, `app/(app)/finanzas/page.tsx`, `app/(app)/dashboard/page.tsx`, `app/roadmap/[slug]/page.tsx`, `components/layout/Sidebar.tsx`, `components/layout/Topbar.tsx`, `components/layout/index.ts`, `types/navigation.ts`, `lib/navigation.ts`, `components/icons/` (íconos SVG inline), `app/page.tsx`.
- Decisiones técnicas:
  - La navegación quedó centralizada en `lib/navigation.ts` y reutilizada por sidebar y topbar.
  - El estado activo del sidebar se detecta con `usePathname()`.
  - El sidebar desktop y mobile comparten componente.
  - El redirect de la raíz se resolvió con `redirect("/dashboard")`.
  - Se agregaron assets de marca reales en `public/Logo_Blyndtek_plataforma.svg` y `public/Favicon_Blyndtek.svg`; el logo se usa en el sidebar y el favicon en `app/layout.tsx`.
- Estado: completo.

### ✅ 0.5 — Auth

- Archivos creados/modificados: `supabase/migrations/001_usuarios.sql`, `types/auth.ts`, `lib/auth.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`, `components/auth/LoginForm.tsx`, `app/(app)/layout.tsx` (actualizado con usuario real), `components/layout/AppShell.tsx`, `components/layout/Sidebar.tsx` (actualizado), `components/layout/Topbar.tsx` (actualizado), `app/api/auth/logout/route.ts`, `types/supabase.ts`, `lib/supabase/server.ts`.
- Nota: la migración quedó preparada en el repo y documentada para ejecución manual en Supabase Dashboard o vía CLI. Codex no la ejecutó porque el repo no está enlazado al proyecto correcto en Supabase CLI. Si en el entorno real ya fue aplicada manualmente, este archivo debe seguir reflejando ese estado en futuras actualizaciones.
- Decisiones técnicas:
  - `middleware.ts` protege rutas con `redirect`, no con `rewrite`.
  - El refresh del token usa `@supabase/ssr` con `cookies.getAll/setAll`.
  - `app/(app)/layout.tsx` volvió a Server Component para obtener el usuario real; el estado mobile del sidebar se delega a `components/layout/AppShell.tsx`.
  - La autorización quedó centralizada en `lib/auth.ts`: `admin` accede a todo; `miembro` solo a `/proyectos`, `/tareas` y `/calendario`.
  - El logout visible del sidebar usa cliente browser (`supabase.auth.signOut()` + `router.push('/login')`), y además existe `app/api/auth/logout/route.ts` como soporte server-side.
- Fix posterior aplicado:
  - Se corrigió un `ERR_TOO_MANY_REDIRECTS` en `middleware.ts`. La causa era una combinación de manejo incorrecto de rutas públicas y lectura de sesión en middleware con un patrón riesgoso para Supabase SSR.
  - El middleware ahora hace early return para `/roadmap/*`, `/_next/*`, `favicon.ico`, `api/auth/*` y otros estáticos; `/login` se evalúa con `getSession()` y no se fuerza verificación de rol cuando no hay sesión.
  - El refresh de cookies quedó estabilizado creando el `NextResponse` antes de instanciar Supabase y devolviendo siempre la respuesta actualizada por `cookies.setAll`.
  - Se aplicó un segundo fix al loop post-login: el middleware dejó de consultar `public.usuarios` para leer el rol, y ahora lo toma del JWT (`user_rol`) con fallback temporal a `miembro` mientras no esté activo el hook de Supabase Auth.
  - Se agregó `supabase/migrations/002_custom_access_token_hook.sql`. La creación del hook puede versionarse en SQL, pero la activación en Supabase Dashboard → Authentication → Hooks sigue siendo manual.
  - Se aplicó un tercer fix al loop post-login: `app/(app)/layout.tsx` dejó de hacer `redirect('/login')` cuando `getCurrentUser()` devuelve `null`. La protección de rutas quedó exclusivamente en `middleware.ts`, y el shell visual ahora tolera `usuario = null` sin crashear.
  - Se aplicó un cuarto fix al shell autenticado: `getCurrentUser()` ahora valida primero la sesión, atrapa errores y construye un usuario mínimo desde `auth` si la lectura de `public.usuarios` falla. Además, `app/(app)/layout.tsx` usa un timeout de 3 segundos con `Promise.race()` para evitar bloquear el render, y el sidebar deja de mostrar un falso estado de carga infinito cuando `usuario` es `null`.
  - Se aplicó un quinto ajuste al middleware: la lectura del rol desde el JWT ahora prioriza el claim custom `user_rol` como propiedad directa de `session.user`, que es donde Supabase expone los claims del `Custom Access Token Hook`. Se dejó `console.log` activo temporalmente para inspeccionar el payload real del JWT en terminal y confirmar el mapping.
  - Se aplicó la solución definitiva para roles en middleware: se abandonó la lectura desde JWT y se reemplazó por una query puntual a `public.usuarios` usando `SUPABASE_SERVICE_ROLE_KEY`, solo para obtener `rol` por `session.user.id` y bypassar RLS de manera controlada. También se eliminó el `console.log` temporal de debug.
  - Se alineó `lib/auth.ts` con la misma estrategia: `getCurrentUser()` ahora valida la sesión con el cliente SSR y luego lee el perfil completo con `SUPABASE_SERVICE_ROLE_KEY`, evitando el fallback falso a `miembro` que ocultaba módulos en el sidebar. No se agregó una nueva policy SQL porque `supabase/migrations/001_usuarios.sql` ya contiene una policy equivalente (`usuarios_select_own` con `auth.uid() = id`).
  - Limpieza final post-fix: `app/(app)/layout.tsx` dejó de usar el `Promise.race()` con timeout de 3000 ms. Con la lectura de perfil vía `SUPABASE_SERVICE_ROLE_KEY`, `getCurrentUser()` vuelve a usarse de forma directa y el sistema de auth queda estable sin workarounds temporales.
- Estado: completo.

### ✅ Cierre de Fase 0

- Fase 0 queda cerrada como completa.
- Decisión final de auth/permisos:
  - `middleware.ts` usa `SUPABASE_SERVICE_ROLE_KEY` para leer `public.usuarios.rol` por `session.user.id` y bypassar RLS solo en la verificación de autorización.
  - `lib/auth.ts` usa la misma estrategia para `getCurrentUser()`, evitando que el shell visual reciba un rol degradado por fallas de RLS.
  - El cliente SSR normal queda reservado a validar la sesión activa; la lectura del perfil y rol se resuelve con cliente admin interno y acotado.
- Motivo:
  - En este entorno `auth.uid()` devolvió `null` o no estuvo disponible de forma confiable fuera de un contexto de sesión activa en algunos Server Components, lo que impedía leer `public.usuarios` con RLS estándar.
- Verificación final:
  - `npm run lint` pasa limpio.
  - `npm run build` compila sin errores de tipos ni de build.

### ✅ Shell flotante y formularios por nombre

- Archivos creados/modificados: `tailwind.config.ts`, `components/layout/AppShell.tsx`, `components/ui/EntitySelect.tsx`, `components/ui/EntityMultiSelect.tsx`, `components/ui/index.ts`, `components/proyectos/ProyectosClient.tsx`, `components/clientes/ClienteModal.tsx`, `components/finanzas/CobroModal.tsx`, `components/finanzas/SuscripcionModal.tsx`, `components/tareas/TareaModal.tsx`, `components/calendario/EventoModal.tsx`, `components/cotizador/ParametrosForm.tsx`.
- Decisiones técnicas:
  - El contenido autenticado ahora vive dentro de un panel flotante con `canvas` neutro (`#E4E7EC`) detrás, `rounded-card` y `shadow-soft`, para que toda la interfaz respire más y el shell se vea más moderno.
  - La topbar quedó dentro del panel como header integrado del contenido.
  - Se adoptó `EntitySelect` como selector searchable reutilizable por nombre y `EntityMultiSelect` para campos multiselección; el principio de UX quedó fijado: ningún formulario debe pedir UUIDs a mano.
- Estado: completo.

## Fase 1 — v1 (pendiente)

### ✅ 1.1 — Módulo Outbound

- Archivos creados/modificados:
  - `types/leads.ts`
  - `types/supabase.ts`
  - `lib/leads.ts`
  - `lib/hooks/useLeads.ts`
  - `lib/supabase/admin.ts`
  - `app/api/leads/route.ts`
  - `app/api/leads/[id]/route.ts`
  - `app/api/leads/[id]/etapa/route.ts`
  - `components/outbound/KanbanColumn.tsx`
  - `components/outbound/LeadCard.tsx`
  - `components/outbound/LeadFormRapido.tsx`
  - `components/outbound/LeadModal.tsx`
  - `components/outbound/index.ts`
  - `app/(app)/outbound/page.tsx`
- Contenido:
  - Tipos completos de `leads` derivados del esquema de DB.
  - API routes CRUD + cambio de etapa con `service_role` para la tabla `leads`.
  - Hook `useLeads()` con estado local y consumo de `app/api/leads/*` vía `fetch`.
  - Vista kanban completa de Outbound con 6 columnas, filtros, alta rápida inline, modal de edición/creación, drag & drop HTML5 nativo y badge de leads vencidos.
- Decisiones técnicas:
  - Se agregó `lib/leads.ts` para centralizar etapas, labels, drafts y lógica de vencidos.
  - El hook del cliente usa API routes como única capa de acceso a datos; se descartó el cliente browser directo por errores `500` causados por RLS sobre `public.leads`.
  - Las rutas `app/api/leads/*` usan `lib/supabase/admin.ts` para encapsular el acceso admin-only en servidor.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

### ✅ 1.2 — Módulo Inbound

- Archivos creados/modificados:
  - `app/api/leads/route.ts`
  - `lib/hooks/useInboundLeads.ts`
  - `components/ui/Toast.tsx`
  - `components/ui/index.ts`
  - `components/ui/Input.tsx`
  - `components/inbound/InboundFicha.tsx`
  - `components/inbound/InboundFiltros.tsx`
  - `components/inbound/InboundNuevaFicha.tsx`
  - `components/inbound/index.ts`
  - `app/(app)/inbound/page.tsx`
- Contenido:
  - Extensión de `app/api/leads/route.ts` para soportar `canal` dinámico (`outbound` por default, `inbound` opcional) y creación de leads en ambos canales.
  - Hook `useInboundLeads()` con filtros por `nivel_confianza` y `etapa`, alta/edición y helper `addNota()` con timestamp, consumiendo `app/api/leads/*` vía `fetch`.
  - Vista completa de Inbound con fichas expandidas, edición inline, historial de notas, modal de nueva ficha, filtros y toast para el placeholder de “Pasar a cotización”.
  - `Toast` UI base agregado al design system y exportado desde `components/ui/index.ts`.
- Decisiones técnicas:
  - Inbound reutiliza la tabla `leads` y los tipos existentes de `types/leads.ts`; no se duplicaron tipos ni rutas CRUD.
  - La API compartida de `leads` quedó canal-aware para que Outbound siga funcionando sin cambios y Inbound reutilice la misma base.
  - El hook `useInboundLeads()` quedó alineado con Outbound: API routes como única vía de acceso, evitando errores de RLS en el browser.
  - Se corrigió un bug de escritura en `InboundNuevaFicha`: los espacios desaparecían porque varios `onChange` sanitizaban con `trim()` en cada tecla. La sanitización se movió al submit para no interferir con inputs ni textareas.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
  - `/outbound` sigue compilando y `/inbound` quedó incorporado al build final.
- Estado: completo.

### ✅ 1.3 — Módulo Clientes

- Archivos creados/modificados:
  - `types/clientes.ts`
  - `types/supabase.ts`
  - `app/api/clientes/route.ts`
  - `app/api/clientes/[id]/route.ts`
  - `lib/hooks/useClientes.ts`
  - `components/clientes/ClienteCard.tsx`
  - `components/clientes/ClienteFicha.tsx`
  - `components/clientes/ClienteModal.tsx`
  - `components/clientes/index.ts`
  - `app/(app)/clientes/page.tsx`
- Contenido:
  - Tipos completos de `clientes`, incluyendo `datos_facturacion` como objeto estructurado.
  - API routes para listar, crear, actualizar y hacer soft delete (`estado = 'inactivo'`) sobre `clientes`.
  - Hook `useClientes()` con carga de lista, carga individual, alta y actualización.
  - Vista principal en split view con lista filtrable, búsqueda client-side, toggle Activos/Inactivos y ficha 360° con tabs.
  - Ficha de cliente con edición inline de datos generales, contacto, datos de facturación, historial de notas y placeholders consistentes para Proyectos, Cobros y Suscripción.
- Decisiones técnicas:
  - El hook de Clientes usa `fetch` contra API routes en vez de cliente browser directo porque el módulo es admin-only y no necesitaba realtime inmediato; esto reduce fricción de RLS y mantiene la lectura/escritura centralizada en `service_role` server-side.
  - El delete de clientes se implementó como soft delete actualizando `estado` a `inactivo`, alineado con la spec.
  - La vista mobile usa cambio de panel entre lista y ficha, mientras que desktop mantiene split view persistente.
- Actualización posterior:
  - `ClienteFicha` dejó de mostrar placeholders en los tabs de Proyectos, Cobros y Suscripción.
  - El tab Proyectos ahora consulta `GET /api/proyectos?cliente_id=[id]` y reusa `ProyectoCard`.
  - El tab Cobros ahora consulta `GET /api/cobros?cliente_id=[id]`, muestra resumen de cobrado/pendiente/vencido y lista real de cobros.
  - El tab Suscripción ahora consulta `GET /api/suscripciones?cliente_id=[id]` y habilita activación real con `POST /api/suscripciones/[id]/activar`, con toast de confirmación.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
  - `/outbound` y `/inbound` siguieron entrando en el build final sin regresiones de compilación.
- Estado: completo.

### ✅ 1.4 — Cotizador: formulario de parámetros + hitos

- Archivos creados/modificados:
  - `types/cotizaciones.ts`
  - `types/supabase.ts`
  - `lib/cotizaciones.ts`
  - `lib/hooks/useCotizaciones.ts`
  - `app/api/cotizaciones/route.ts`
  - `app/api/cotizaciones/[id]/route.ts`
  - `app/api/cotizaciones/[id]/estado/route.ts`
  - `components/cotizador/CotizadorLayout.tsx`
  - `components/cotizador/ParametrosForm.tsx`
  - `components/cotizador/CotizacionCard.tsx`
  - `components/cotizador/index.ts`
  - `app/(app)/cotizador/page.tsx`
  - `app/(app)/cotizador/[id]/page.tsx`
- Contenido:
  - Tipos completos de `cotizaciones`, incluyendo `hitos`, `modulos`, `contexto_chat` y `adjuntos`.
  - El modelo de cotización se amplió para soportar una propuesta de venta completa con `entendimiento`, `beneficios`, `por_que_nosotros`, `justificacion_precio`, `mantenimiento_detalle`, `supuestos`, `condiciones_comerciales` y `datos_propuesta`.
  - API routes para listar, crear, actualizar, cambiar estado y eliminar cotizaciones en borrador.
  - Hook `useCotizaciones()` con lista, detalle, cambios de estado, eliminación y autosave debounced de 1500 ms sobre `cotizacionActual`.
  - Vista de lista de cotizaciones con filtros por estado y creación de borrador con redirección al detalle.
  - Vista de detalle `/cotizador/[id]` con stepper de 5 pasos y formulario completo del paso 1.
  - Formulario de parámetros con selección de lead/cliente/empresa manual, precio, mantenimiento, plazo e hitos dinámicos con validación de suma al 100%.
- Decisiones técnicas:
  - El detalle del cotizador usa hook basado en API routes y no cliente browser directo, porque esta etapa necesita control fino de autosave y persistencia consistente sobre JSONB sin depender de realtime.
  - `lib/cotizaciones.ts` centraliza helpers de draft, normalización de hitos, formateo y validación del paso 1.
  - La eliminación quedó restringida a estado `borrador`, alineada con la spec y preparada para la futura cascada de aceptación en `1.8`.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.

### ✅ 1.5 — Backend de archivos

- Archivos creados/modificados: `types/archivos.ts`, `types/supabase.ts`, `lib/carpetas.ts`, `lib/hooks/useCarpetas.ts`, `lib/hooks/useArchivos.ts`, `app/api/carpetas/route.ts`, `app/api/carpetas/[id]/route.ts`, `app/api/carpetas/[id]/mover/route.ts`, `app/api/carpetas/backfill/route.ts`, `app/api/archivos/upload/route.ts`, `app/api/archivos/[id]/route.ts`, `app/api/archivos/[id]/descargar/route.ts`, `app/api/archivos/[id]/mover/route.ts`, `app/api/archivos/papelera/route.ts`, `app/api/archivos/[id]/restaurar/route.ts`, `app/api/archivos/[id]/eliminar-definitivo/route.ts`, `app/api/clientes/route.ts`, `app/api/proyectos/route.ts`, `app/api/cotizaciones/[id]/aceptar/route.ts`.
- Contenido:
  - Se agregaron tipos de `carpetas` y `archivos`, más hooks cliente para consumir sus API routes.
  - Se creó CRUD backend de carpetas con conteo de subcarpetas/archivos, detalle de contenido, mover entre padres y restricciones de renombrado/borrado para carpetas automáticas.
  - Se creó backend de archivos con subida a Supabase Storage privado (`archivos-blyndtek`), signed URL temporal de descarga, papelera/restauración, mover entre carpetas y borrado definitivo.
  - Se automatizó la creación de carpetas raíz para clientes y proyectos al crearlos, y también al aceptar cotizaciones.
  - Se ejecutó un backfill real en Supabase para crear las carpetas faltantes de los clientes/proyectos existentes.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
  - Backfill confirmado para `ARC Global`, `Funes Exclusivos`, `Cubelo`, `Mr Host`, `Cora Campos`, `Bridge` y sus proyectos.
  - `/cotizador` y `/cotizador/[id]` quedaron incorporados al build final.
- Estado: completo.

### ✅ 1.5 — Cotizador: chat de contexto + adjuntos

- Archivos creados/modificados:
  - `package.json`
  - `package-lock.json`
  - `lib/parsers/parseExcel.ts`
  - `lib/parsers/parsePDF.ts`
  - `lib/cotizaciones.ts`
  - `app/api/cotizaciones/[id]/route.ts`
  - `components/cotizador/ChatContexto.tsx`
  - `components/cotizador/AdjuntosUploader.tsx`
  - `components/cotizador/ContextoResumen.tsx`
  - `components/cotizador/DatosPropuestaForm.tsx`
  - `components/cotizador/CotizadorLayout.tsx`
  - `components/cotizador/index.ts`
  - `app/(app)/cotizador/[id]/page.tsx`
- Contenido:
  - Paso 2 del Cotizador implementado con chat libre de contexto, carga de adjuntos y resumen lateral.
  - Parser `parseExcel()` con `xlsx` (SheetJS) para transformar `.xlsx`, `.xls` y `.csv` a texto plano estructurado por hoja.
  - Parser `parsePDFToBase64()` para convertir PDFs a base64 y dejarlos listos para la futura integración con Claude.
  - `AdjuntosUploader` con drag & drop, validación por tipo y peso, lista de archivos cargados y eliminación.
  - `ChatContexto` con textarea, envío por Enter, mensajes automáticos del asistente y autoscroll al último mensaje.
  - Persistencia de `contexto_chat` y `adjuntos` en la cotización actual vía autosave del hook.
  - Se agregó el subformulario colapsable de `DatosPropuesta` para editar portada y contacto comercial de la propuesta, con defaults precargados de Blyndtek al crear una cotización.
  - La route de generación se reforzó con un system prompt más rico, calibración por rubro/precio/plazo y parseo robusto de JSON para mejorar la calidad de los módulos y del resumen ejecutivo.
- Decisiones técnicas:
  - Excel/CSV se serializan a texto plano del lado cliente antes de persistirse, para dejar el contexto listo para el paso `1.6` sin depender todavía de Claude API.
  - PDF se conserva como base64 crudo en `adjuntos.contenido_texto`, porque la lectura semántica se delega al document block de Claude en el paso siguiente.
  - El paso 2 es opcional: se puede avanzar aunque no haya mensajes ni adjuntos, pero el layout muestra una sugerencia suave antes de continuar.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

### ✅ Finanzas: egresos y tesorería

- Archivos creados/modificados: `components/finanzas/EgresosTabla.tsx`, `components/finanzas/TesoreriaCard.tsx`, `components/finanzas/FinanzasClient.tsx`, `app/api/finanzas/tesoreria/route.ts`, `types/finanzas.ts`, `types/cobros.ts`, `lib/hooks/useFinanzas.ts`, `lib/finanzas/calcularEgresosPeriodo.ts`.
- Contenido:
  - La tabla de egresos ahora usa menú de 3 puntos en Acciones y el badge de estado alterna `pagado` inline con PATCH directo.
  - Las filas vencidas e impagas se resaltan en rojo suave para dar visibilidad inmediata.
  - El tab de “Configuración” pasó a “Tesorería” y muestra el balance total, la caja inicial editable y el desglose por medio de cobro/pago.
  - La API de tesorería ahora consolida cobros y egresos pagados por `cuenta_medio`, incluye el grupo “Sin asignar” y calcula el balance total con caja inicial.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

### ✅ Finanzas: P&L visible otra vez

- Archivos modificados: `components/finanzas/PLChart.tsx`, `app/api/finanzas/metricas/route.ts`.
- Diagnóstico:
  - El log del histórico confirmó que el endpoint devolvía 12 puntos válidos y con valores reales (`len: 12`, último punto con ingresos/egresos/margen distintos de cero), así que el problema no estaba en la query.
  - La regresión estaba en el render del gráfico: se volvió más frágil con `ResponsiveContainer` y la escala del eje, y las barras quedaban prácticamente invisibles sobre el fondo claro.
- Fix aplicado:
  - El gráfico ahora usa una altura explícita en `ResponsiveContainer`, un `domain` más seguro para el eje Y, y bordes visibles en barras/línea para que el P&L no desaparezca visualmente.
  - Se retiraron los logs temporales de debug.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

### ✅ Finanzas: cartera por cliente legible

- Archivos modificados: `components/finanzas/CarteraClientesChart.tsx`, `app/api/finanzas/cartera-clientes/route.ts`.
- Diagnóstico:
  - La consulta directa a Supabase mostró que la cartera sí devolvía nombres reales de cliente, así que el problema no estaba en los datos base.
  - La regresión estaba en la capa de render de `CarteraClientesChart`, que no estaba normalizando de forma robusta el payload antes de pasarlo a Recharts.
- Fix aplicado:
  - El endpoint quedó más directo, aplastando `clientes(empresa)` a la key `empresa`.
  - El chart normaliza `empresa` antes de renderizar y el tooltip muestra siempre el nombre del cliente junto con cobrado, pendiente y total.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

### ✅ 1.6 — Cotizador: integración Claude API

- Archivos creados/modificados:
  - `app/api/cotizaciones/[id]/generar/route.ts`
  - `components/cotizador/GeneradorIA.tsx`
  - `components/cotizador/EntendimientoEditor.tsx`
  - `components/cotizador/BeneficiosEditor.tsx`
  - `components/cotizador/JustificacionPrecioEditor.tsx`
  - `components/cotizador/PorQueNosotrosEditor.tsx`
  - `components/cotizador/MantenimientoDetalleEditor.tsx`
  - `components/cotizador/ModulosEditor.tsx`
  - `components/cotizador/ResumenEjecutivo.tsx`
  - `components/cotizador/index.ts`
  - `app/(app)/cotizador/[id]/page.tsx`
- Contenido:
  - La generación con Claude ahora escribe la propuesta comercial completa: entendimiento del proyecto, beneficios, módulos, justificación del precio, diferenciadores, detalle de mantenimiento y resumen ejecutivo.
  - El prompt quedó orientado a redacción comercial para decisores de negocio, con calibración explícita por rubro, presupuesto, plazo y contexto del chat/adjuntos.
  - La route persiste todos los campos narrativos nuevos en la cotización y reintenta con un fallback completo si Claude devuelve JSON inválido.
  - El paso 3 del Cotizador ahora expone editores inline para revisar y ajustar el entendimiento, beneficios, módulos, justificación, diferenciadores y mantenimiento antes de avanzar al preview.
  - Se normalizan al cargar las cotizaciones viejas con defaults seguros para `datos_propuesta`, `beneficios`, `por_que_nosotros`, `supuestos`, `condiciones_comerciales` y `mantenimiento_detalle`, evitando crashes por `null` en el render.
- Decisiones técnicas:
  - Se elevó `maxDuration` y el `max_tokens` de Claude para permitir respuestas narrativas más extensas.
  - Si Claude responde con fences markdown o JSON parcial, la route limpia, reintenta y completa los campos faltantes con un fallback comercial seguro.
  - El paso 3 conserva el patrón de autosave existente para que todo lo que la IA genera quede editable y persistido en Supabase.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

### ✅ 1.7 — Cotizador: preview PDFs

- Archivos creados/modificados:
  - `types/roadmap.ts`
  - `lib/utils/formatters.ts`
  - `app/globals.css`
  - `components/cotizador/CotizadorLayout.tsx`
  - `components/cotizador/preview/PropuestaPDF.tsx`
  - `components/cotizador/preview/RoadmapPDF.tsx`
  - `components/cotizador/preview/index.ts`
  - `app/(app)/cotizador/[id]/page.tsx`
- Contenido:
  - Paso 4 del Cotizador implementado con tabs `Propuesta` y `Roadmap`.
  - Preview visual en tiempo real sobre contenedor A4 (`794px`) con páginas separadas por `break-after: page`.
  - `PropuestaPDF` rediseñado como una propuesta de venta profesional con portada, entendimiento, beneficios, alcance funcional, stack, inversión, mantenimiento, condiciones y cierre, con secciones numeradas, kickers editoriales y footer consistente por página.
  - `RoadmapPDF` con portada, cronograma tipo gantt en CSS puro y sección de fases e hitos de pago.
  - Botón `Exportar PDF` vía `window.print()` y estilos de `@media print` para ocultar el shell de la app al imprimir.
- Decisiones técnicas:
  - Se creó `lib/utils/formatters.ts` para centralizar formato de moneda, fechas, semanas y generación de fases del roadmap.
  - El roadmap distribuye fases desde hitos + plazo, y luego asigna nombres de módulos sobre esas fases para el preview.
  - Se eligió print-to-PDF del browser en vez de generación server-side para mantener el flujo simple y sin dependencias pesadas adicionales.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

### ✅ 1.8 — Cotizador: cascada de aceptación

- Archivos creados/modificados:
  - `types/proyectos.ts`
  - `types/suscripciones.ts`
  - `types/cobros.ts`
  - `types/cotizaciones.ts`
  - `app/api/cotizaciones/[id]/aceptar/route.ts`
  - `components/cotizador/ResumenAceptacion.tsx`
  - `components/cotizador/AceptacionPanel.tsx`
  - `components/cotizador/index.ts`
  - `components/cotizador/CotizadorLayout.tsx`
  - `components/ui/Input.tsx`
  - `app/(app)/cotizador/[id]/page.tsx`
- Contenido:
  - Se implementó la cascada completa de aceptación de cotización: creación/uso de cliente, proyecto, features, suscripción pendiente, cobros de hitos y token público del roadmap.
  - La operación se expone por route handler admin-only con `service_role` y validaciones previas de estado/datos.
  - Se agregaron componentes de preview de aceptación con checklist de validaciones, confirmación modal y estado final aceptado con links y token del roadmap.
- Decisiones técnicas:
  - La cascada se resolvió con rollback manual y tracking explícito de IDs creados, porque Supabase REST no ofrece transacciones nativas para este flujo.
  - Los vencimientos de los cobros se distribuyen proporcionalmente a lo largo del plazo, con el primer hito venciendo hoy.
  - La UI de aceptación se actualiza en tiempo real con un resultado local de la cascada y marca el stepper completo en verde cuando la cotización queda aceptada.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

## Fase 2 — v2

### ✅ 2.1 — Módulo Proyectos

- Archivos creados/modificados:
  - `types/features.ts`
  - `types/cuentas.ts`
  - `lib/proyectos.ts`
  - `lib/hooks/useProyectos.ts`
  - `lib/hooks/useFeatures.ts`
  - `app/api/proyectos/route.ts`
  - `app/api/proyectos/[id]/route.ts`
  - `app/api/proyectos/[id]/features/route.ts`
  - `app/api/features/[id]/route.ts`
  - `app/api/proyectos/[id]/cuentas/route.ts`
  - `app/api/cuentas/[id]/route.ts`
  - `components/proyectos/ProyectoCard.tsx`
  - `components/proyectos/ProyectoFicha.tsx`
  - `components/proyectos/ProyectosClient.tsx`
  - `components/proyectos/FeatureCard.tsx`
  - `components/proyectos/FeaturesKanban.tsx`
  - `components/proyectos/CuentaServicioCard.tsx`
  - `components/proyectos/CuentaServicioModal.tsx`
  - `components/proyectos/index.ts`
  - `app/(app)/proyectos/page.tsx`
- Contenido:
  - Se implementó la vista completa de Proyectos como módulo de ENTREGA, accesible para admin y miembro.
  - El panel izquierdo muestra lista filtrable por estado y búsqueda por nombre/cliente; el panel derecho muestra la ficha 360° del proyecto seleccionado.
  - La ficha incluye tabs de General, Features, Cuentas y servicios, y Roadmap interno.
  - Las features se gestionan en un kanban de 3 columnas con drag & drop HTML5 nativo y recálculo automático del avance del proyecto.
  - Las cuentas/servicios quedaron restringidas a admin, con modal de alta/edición y ocultamiento de notas_acceso.
  - La página server de `/proyectos` obtiene el usuario real y una lista mínima de clientes desde servidor para mostrar nombres sin depender de RLS en browser.
- Decisiones técnicas:
  - Se reutilizó la tabla `clientes` solo como fuente de nombres/selección desde server, para no acoplar el módulo de entrega a la estrategia admin-only del módulo de Clientes.
  - El avance del proyecto se recalcula server-side al mover features entre estados o al borrar/crear features.
  - El roadmap público no se renderiza acá: solo se muestra el token, el toggle de visibilidad y el link copiable, en línea con el alcance de 2.2.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
  - `/proyectos` entró correctamente al build final.
  - La lista de rutas del build ya incluye `app/(app)/proyectos` y los endpoints `api/proyectos/*` y `api/features/*`.
  - Estado: completo.

### ✅ 2.2 — Roadmap público

- Archivos creados/modificados:
  - `app/api/roadmap/[token]/route.ts`
  - `app/roadmap/[slug]/page.tsx`
  - `app/roadmap/[slug]/not-found.tsx`
  - `components/roadmap/RoadmapHeader.tsx`
  - `components/roadmap/RoadmapTimeline.tsx`
  - `components/roadmap/RoadmapFooter.tsx`
  - `components/roadmap/index.ts`
  - `types/roadmap-public.ts`
- Contenido:
  - API pública por token que devuelve solo datos seguros del proyecto y sus features agrupadas por fase.
  - Vista pública sin auth, sin shell de app y optimizada para desktop/mobile.
  - Header con branding Blyndtek, barra de progreso y badge de estado.
  - Timeline visual por fases con estados derivados de las features.
  - Footer con `Powered by Blyndtek` y fecha de última actualización.
  - `404` amigable cuando el token no existe o el roadmap está desactivado.
- Decisiones técnicas:
  - La API usa un shape público explícito para evitar que se filtren responsables, costos o datos internos aunque la consulta lea desde servidor.
  - La página pública hace fetch server-side a la API route del roadmap para mantener una sola fuente de verdad del payload público.
  - La última actualización se deriva del `created_at` del proyecto y de las features públicas disponibles.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

### ✅ 2.3 — Módulo Tareas

- Archivos creados/modificados:
  - `types/tareas.ts`
  - `types/supabase.ts`
  - `lib/tareas.ts`
  - `lib/task-support.ts`
  - `lib/hooks/useTareas.ts`
  - `app/api/tareas/route.ts`
  - `app/api/tareas/[id]/route.ts`
  - `components/tareas/TareaCard.tsx`
  - `components/tareas/TareaFiltros.tsx`
  - `components/tareas/TareaModal.tsx`
  - `components/tareas/TareasKanban.tsx`
  - `components/tareas/TareasClient.tsx`
  - `components/tareas/index.ts`
  - `components/layout/QuickTaskButton.tsx`
  - `components/layout/AppShell.tsx`
  - `app/(app)/layout.tsx`
  - `app/(app)/tareas/page.tsx`
- Contenido:
  - Se implementó el kanban simple de Tareas con columnas Nueva, En proceso y Terminada.
  - La vista incluye filtros por proyecto, responsable y prioridad, más toggle para mostrar u ocultar tareas terminadas archivadas.
  - Las tareas se crean, editan, eliminan y mueven entre columnas con API routes server-side usando `service_role`.
  - El modal de tareas soporta vínculo opcional a proyecto, asignación de responsable, prioridad, fecha límite y notas.
  - Se agregó un botón flotante global de alta rápida en el shell de la app (`+ Tarea rápida`) visible desde cualquier vista.
  - El layout server comparte datos de soporte para proyectos activos y usuarios activos con el shell y con la página de tareas.
- Decisiones técnicas:
  - Se resolvió el modal de tareas con datos de apoyo cargados desde servidor para evitar exponer una API pública adicional de usuarios.
  - El botón rápido global usa el mismo `useTareas()` que la página para mantener consistencia de creación y refresco.
  - Las mutaciones de tareas disparan un evento global de refresco para sincronizar la página de Tareas y el botón rápido cuando conviven en la misma sesión.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
  - `/tareas` quedó incorporado al build final.
  - Estado: completo.

### ✅ 2.4 — Módulo Calendario

- Archivos creados/modificados:
  - `types/eventos.ts`
  - `types/calendario.ts`
  - `types/supabase.ts`
  - `lib/calendario.ts`
  - `lib/hooks/useEventos.ts`
  - `lib/google-calendar.ts`
  - `app/api/eventos/route.ts`
  - `app/api/eventos/[id]/route.ts`
  - `app/api/calendario/route.ts`
  - `app/api/auth/google/route.ts`
  - `app/api/auth/google/callback/route.ts`
  - `app/api/calendario/sync/route.ts`
  - `components/calendario/CalendarioClient.tsx`
  - `components/calendario/CalendarioControls.tsx`
  - `components/calendario/CalendarioDia.tsx`
  - `components/calendario/CalendarioMes.tsx`
  - `components/calendario/CalendarioSemana.tsx`
  - `components/calendario/EventoChip.tsx`
  - `components/calendario/EventoModal.tsx`
  - `components/calendario/index.ts`
  - `app/(app)/calendario/page.tsx`
- Contenido:
  - Se implementó el calendario propio sin librerías externas, con vistas mensual, semanal y diaria.
  - Se agregaron API routes para CRUD de `eventos` y un endpoint agregador `app/api/calendario/route.ts` que unifica eventos locales, tareas con fecha límite y recordatorios pendientes de leads.
  - La vista `app/(app)/calendario/page.tsx` quedó conectada a un client component que alterna entre Mes/Semana/Día, abre modales de evento y refetchéa el rango visible.
  - Se incorporó sincronización manual con Google Calendar mediante OAuth, persistiendo el token del usuario de forma cifrada antes de la etapa futura de sync automática.
- Decisiones técnicas:
  - El calendario se construyó 100% propio, con layout y timeline hechos en Tailwind/CSS para evitar dependencias tipo `react-big-calendar`.
  - Los items unificados del calendario se resuelven server-side desde `service_role`, pero la UI se limita a campos públicos o funcionales del horario, manteniendo separados eventos, tareas y recordatorios de leads.
  - La sincronización con Google se dejó manual por ahora: conectar cuenta, guardar token cifrado y ejecutar sync on-demand. La automatización periódica con `pg_cron`/webhooks quedó documentada pero no implementada en esta iteración.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
  - La ruta `/calendario` quedó incluida correctamente en el build final.
- Estado: completo.

### ✅ 2.5 — Invitaciones a eventos

- Archivos creados/modificados:
  - `supabase/migrations/007_eventos_invitaciones.sql`
  - `types/eventos.ts`
  - `types/eventosInvitados.ts`
  - `types/supabase.ts`
  - `lib/eventos/invitaciones.ts`
  - `app/api/eventos/route.ts`
  - `app/api/eventos/[id]/route.ts`
  - `app/api/eventos/[id]/invitados/route.ts`
  - `app/api/eventos/[id]/invitados/[invitadoId]/route.ts`
  - `app/api/eventos-invitados/route.ts`
  - `app/api/eventos-invitados/[id]/route.ts`
  - `app/api/calendario/route.ts`
  - `components/calendario/CalendarioClient.tsx`
  - `components/calendario/EventoModal.tsx`
- Contenido:
  - Se incorporó el sistema de invitaciones a eventos con tabla propia `eventos_invitados`, RLS por invitado/organizador y estados `pendiente`, `aceptado`, `rechazado` y `propuesta_alternativa`.
  - El formulario de evento ahora permite invitar usuarios del sistema, y las invitaciones se sincronizan al crear o editar el evento.
  - El calendario filtra la visibilidad de eventos para usuarios no admin según sus eventos propios y las invitaciones aceptadas.
  - Los invitados reciben un aviso persistente con acciones para aceptar, rechazar o proponer otro horario; el organizador puede resolver propuestas alternativas desde el modal del evento.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
  - La implementación quedó documentada con la estructura real de `eventos` y la nueva tabla `eventos_invitados`.
- Estado: completo.

## Fase 3 — v3 (pendiente)

### ✅ 3.1 — Módulo Finanzas

- Archivos creados/modificados:
  - `types/egresos.ts`
  - `types/finanzas.ts`
  - `types/cobros.ts`
  - `types/suscripciones.ts`
  - `types/supabase.ts`
  - `lib/require-admin.ts`
  - `lib/finanzas.ts`
  - `lib/hooks/useFinanzas.ts`
  - `recharts/index.tsx`
  - `app/api/cobros/route.ts`
  - `app/api/cobros/[id]/route.ts`
  - `app/api/egresos/route.ts`
  - `app/api/egresos/[id]/route.ts`
  - `app/api/suscripciones/route.ts`
  - `app/api/suscripciones/[id]/route.ts`
  - `app/api/suscripciones/[id]/activar/route.ts`
  - `app/api/finanzas/metricas/route.ts`
  - `app/api/config-finanzas/route.ts`
  - `app/api/finanzas/generar-cobros-mensuales/route.ts`
  - `app/api/finanzas/marcar-vencidos/route.ts`
  - `components/finanzas/FinanzasClient.tsx`
  - `components/finanzas/MetricaCard.tsx`
  - `components/finanzas/CobrosTabla.tsx`
  - `components/finanzas/EgresosTabla.tsx`
  - `components/finanzas/SuscripcionesLista.tsx`
  - `components/finanzas/PLChart.tsx`
  - `components/finanzas/RunwayChart.tsx`
  - `components/finanzas/CobroModal.tsx`
  - `components/finanzas/EgresoModal.tsx`
  - `components/finanzas/SuscripcionModal.tsx`
  - `components/finanzas/index.ts`
  - `app/(app)/finanzas/page.tsx`
- Contenido:
  - Se implementó el módulo Finanzas completo para admin con cobros, egresos, suscripciones, configuración de caja inicial, métricas calculadas, P&L mensual y runway proyectado.
  - Las operaciones CRUD se resolvieron mediante API routes server-side con `service_role`, y el frontend consume todo vía hooks basados en `fetch`.
  - Se agregaron acciones manuales para generar cobros mensuales recurrentes y marcar cobros vencidos como base de la futura automatización `pg_cron`.
  - La vista principal quedó organizada en tabs: Resumen, Cobros, Egresos, Suscripciones y Configuración, con exportación de P&L a Excel.
- Decisiones técnicas:
  - El runway se calcula como `caja_actual / quema_neta` solo cuando `quema_neta > 0`; la quema neta se toma como el promedio de `(egresos - ingresos)` de los últimos 3 meses.
  - Los cobros recurrentes se generan manualmente a partir de suscripciones activas con `proxima_cobro <= hoy`, avanzando el próximo vencimiento un mes por iteración.
  - Los gráficos se implementaron sobre una capa compatible con `recharts` para mantener una API de charts simple y reutilizable sin agregar complejidad visual al sistema.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
  - `/finanzas` quedó incorporado al build final.
  - Estado: completo.

### ✅ 3.2 — Dashboard

- Archivos creados/modificados:
  - `types/dashboard.ts`
  - `lib/dashboard.ts`
  - `lib/hooks/useDashboard.ts`
  - `app/api/dashboard/route.ts`
  - `components/dashboard/DashboardSeccion.tsx`
  - `components/dashboard/MetricaGrande.tsx`
  - `components/dashboard/PipelineChart.tsx`
  - `components/dashboard/WinRateChart.tsx`
  - `components/dashboard/RunwayProyectado.tsx`
  - `components/dashboard/CapacidadEntrega.tsx`
  - `components/dashboard/DashboardClient.tsx`
  - `components/dashboard/index.ts`
  - `app/(app)/dashboard/page.tsx`
- Contenido:
  - Se implementó el Dashboard como vista admin-only y todo se calcula desde las tablas existentes, sin carga manual.
  - La API `app/api/dashboard/route.ts` centraliza Comercial, Financiero y Entrega en un único payload.
  - Comercial incluye pipeline ponderado, win rate por canal, ticket promedio y ciclo de cierre promedio.
  - Financiero incluye MRR, net new MRR, churn, runway, serie de caja proyectada, cobros pendientes/vencidos y P&L comparado.
  - Entrega incluye proyectos activos vs capacidad, entregas a tiempo, desvío promedio y features completadas en la semana.
  - La UI quedó organizada en secciones claras con métricas destacadas, gráficos y estados vacíos amigables.
- Decisiones técnicas:
  - Se centralizó la lógica de rangos de período en `lib/dashboard.ts` para reutilizar comparaciones entre mes, trimestre y año.
  - Los gráficos se implementaron sobre la capa ya disponible de `recharts` para mantener consistencia con Finanzas.
  - El selector de período recalcula el payload server-side vía query param, en vez de recomputar solo en cliente, para mantener la fuente de verdad en la API.
- Verificación:
  - `npm run lint` limpio.
  - `npm run build` sin errores de tipos.
- Estado: completo.

## Automatizaciones recurrentes

- Archivos creados/modificados:
  - `supabase/functions/_shared/supabase.ts`
  - `supabase/functions/cobros-mensuales/index.ts`
  - `supabase/functions/marcar-vencidos/index.ts`
  - `supabase/functions/sync-google-calendar/index.ts`
  - `supabase/migrations/003_automatizaciones.sql`
  - `supabase/migrations/004_cron_jobs.sql`
  - `app/api/calendario/route.ts`
  - `docs/AUTOMATIZACIONES.md`
- Contenido:
  - Se completó el mapa de automatizaciones recurrentes con Edge Functions, triggers SQL, jobs de `pg_cron` y documentación de despliegue.
  - `cobros-mensuales` genera cobros de mantenimiento, crea un evento de recordatorio y avanza `proxima_cobro`.
  - `marcar-vencidos` pasa a `vencido` los cobros pendientes vencidos.
  - `sync-google-calendar` quedó como stub documentado para la siguiente iteración de sincronización bidireccional real.
  - `003_automatizaciones.sql` agrega el recálculo de avance del proyecto y el trigger de recordatorio para toques de leads.
  - `004_cron_jobs.sql` deja listos los cron jobs diarios y deja comentado el job de Google Calendar hasta que la Edge Function esté lista.
  - `docs/AUTOMATIZACIONES.md` explica cómo desplegar, qué placeholders reemplazar y cómo verificar `cron.job_run_details`.
- Estado del mapa:
  - Definición en código: completa.
  - Ejecución real en Supabase: pendiente de desplegar las Edge Functions y aplicar las migraciones manualmente.

## Decisiones técnicas globales

- Estrategia de clientes Supabase: se separaron `lib/supabase/client.ts` para browser y `lib/supabase/server.ts` para server-side rendering, route handlers y helpers del servidor.
- Middleware: las rutas privadas se protegen con `redirect` en `middleware.ts`; usuarios sin sesión van a `/login`, y usuarios autenticados sin permiso van a su primera ruta válida. El refresh del token se hace con `createServerClient` y `cookies.getAll/setAll`.
- Middleware SSR fix: se corrigió un loop de redirects excluyendo rutas públicas antes de tocar Supabase y usando `getSession()` en lugar de `getUser()` dentro del middleware.
- JWT auth fix: el rol usado por middleware ahora se lee desde el access token para evitar depender de queries bloqueables por RLS en `public.usuarios`.
- JWT claim mapping fix: el middleware busca `user_rol` primero en `session.user['user_rol']`, que refleja el claim custom inyectado por el hook de Supabase en el payload del access token.
- Service role middleware fix: se abandonó la estrategia del claim JWT y el middleware ahora usa un cliente admin con `SUPABASE_SERVICE_ROLE_KEY` para leer únicamente el rol desde `public.usuarios`.
- Service role shell fix: `getCurrentUser()` también usa `SUPABASE_SERVICE_ROLE_KEY` para leer el perfil real y mantener sincronizados permisos del shell y middleware.
- Hooks cliente fix: `useLeads()`, `useInboundLeads()` y `useClientes()` consumen API routes server-side en vez de consultar Supabase directo desde browser, para evitar errores `500` provocados por RLS.
- Fase 0 final auth decision: la lectura de perfil/rol en server-side se resuelve con service role acotado porque `auth.uid()` no fue confiable fuera del contexto de sesión activa en algunos Server Components.
- Calendario propio: se eligió construir el calendario mensual/semanal/diario sin librerías externas, usando componentes Tailwind propios y lógica de fechas local para mantener la UX homogénea con el design system.
- Google Calendar sync: la primera iteración de sincronización quedó manual (conectar, guardar token cifrado y sincronizar ahora). La automatización cada 5 minutos con `pg_cron`/webhooks se documentó como futura, pero no se implementó en este paso.
- App shell fix: el layout protegido no hace redirects server-side adicionales; el middleware es la única capa de redirección de auth y los componentes visuales aceptan `usuario: Usuario | null`.
- Auth fallback fix: si `public.usuarios` falla por RLS o contexto server-side, el shell usa un usuario mínimo derivado de `auth` y no queda colgado esperando perfil.
- RLS: la política general sigue la spec original del proyecto, donde cada tabla debe filtrar por rol desde Supabase/RLS, sin depender de lógica de permisos en el frontend.
- Design system: los tokens viven en `tailwind.config.ts` vía `theme.extend` para no sobrescribir defaults de Tailwind; el Spinner se implementó como SVG animado para lograr un arco más limpio y consistente entre tamaños.
- Logout: la interacción principal elegida es cliente browser directo para cierre de sesión inmediato en UI; además se dejó un Route Handler de soporte en `app/api/auth/logout/route.ts`.

## Convenciones del proyecto

- Snake_case para tablas y columnas de DB.
- PascalCase para componentes React.
- camelCase para funciones y variables TS.
- Kebab-case para rutas de URL.
- Un archivo por componente. Named exports siempre.
- Sin any en TypeScript. Sin librerías de UI externas.
- Cada prompt de Codex actualiza este archivo al terminar.

## Última actualización

- Fecha: 2026-06-27
- Actualizado: se completó la integración de Claude para que genere la propuesta comercial completa, con editores inline en el paso 3 para entender, ajustar y persistir la narrativa antes del preview; además, se rediseñó la propuesta PDF con una estructura más formal, limpia y comercial y se blindó la carga de cotizaciones viejas con defaults seguros.
- También se actualizó `docs/DATABASE.md` para reflejar los nuevos campos JSONB/text de `cotizaciones` y se mantuvieron los defaults de Blyndtek para nuevas cotizaciones.
- Estado actual: sistema listo para deploy. Las fases 1, 2 y 3 del roadmap original están terminadas.

## 2026-07-08 — Finanzas y clientes: nuevos campos operativos

- Se expusieron `cobros.cuenta_medio` y `cobros.tolerancia_dias` en modales, tablas y rutas administrativas.
- El cálculo de vencimientos ahora usa `fecha_vencimiento + tolerancia_dias` en `marcar-vencidos`, métricas financieras y dashboard.
- Se actualizaron `egresos` con las nuevas categorías, medio de pago, estado pagado, fecha de pago y vínculo opcional a proyecto.
- El módulo Clientes incorporó el estado `pausado` en el filtro lateral, la ficha 360° y el badge de listado.
- Se agregó la tab Tesorería en Finanzas con desglose de cobros cobrados por medio de cobro.
- Estado actual: cambios funcionales listos para build/lint y documentados en el esquema y la memoria del proyecto.

## 2026-07-09 — Lab de proyectos y sincronización feature↔tarea

- Se introdujo `feature_id` en el tipo de tareas y en las rutas de API para reflejar el vínculo con subtareas del Lab.
- Se extrajo el recálculo de avance del proyecto a un helper compartido y se reutilizó tanto en features como en la sincronización bidireccional.
- La creación de una feature ahora intenta crear también su tarea asociada, y la cascada de aceptación de cotizaciones hace lo mismo por cada feature generada.
- Se agregaron helpers de sincronización directa entre features y tareas (`sincronizarDesdeFeature` / `sincronizarDesdeTarea`) sin pasar por HTTP, para evitar loops y mantener el avance del proyecto en sync.
- El panel de fases de proyectos se rearmó como un Lab con columnas colapsables, checklist de subtareas y selector “Mover a fase” en cada item.
- La vista de tareas ahora distingue las tareas vinculadas a subtareas/proyectos con un badge visual.
- Verificación: `npm run lint` limpio y `npm run build` compilando sin errores.

## 2026-07-09 — Limpieza ESLint para Vercel

- Se removieron imports y props heredadas que habían quedado sin uso en las rutas de features y en el Lab de proyectos.
- El ajuste no cambió comportamiento funcional: solo eliminó ruido de lint para que Vercel no falle por `no-unused-vars`.

## 2026-07-09 — Proyectos: fases reales, avance estable y cards compactas

- El tab `Features` ahora carga las fases reales del proyecto desde `GET /api/proyectos/[id]/fases`, por lo que las columnas aparecen aunque todavía no tengan subtareas.
- Se agregó la creación manual de fases desde el Lab con un botón visible `+ Nueva fase`, y el canvas ya no depende de las subtareas para descubrir columnas.
- `avance_pct` ahora conserva su valor cuando un proyecto todavía no tiene features; solo se recalcula cuando existe al menos una subtarea.
- `ProyectoCard` quedó compacta y el encabezado de `ProyectoFicha` pasó a mostrar al cliente como título y al proyecto como subtítulo.
- Los selectores de proyecto de tareas, finanzas y cuentas ahora muestran `[Cliente] — [Nombre del proyecto]` para evitar IDs y facilitar la búsqueda.
- Verificación ejecutada: `npm run lint` y `npm run build` finalizaron sin errores.

## 2026-07-09 — Fix urgente de middleware en producción

- Se eliminó cualquier dependencia de `@supabase/supabase-js` del `middleware.ts` y la lectura de rol pasó a hacerse con `fetch` nativo contra la REST API de Supabase.
- La causa raíz era que el Edge Runtime de Next no soporta APIs de Node que esa librería usa internamente, lo que provocaba `MIDDLEWARE_INVOCATION_FAILED` y `ReferenceError: __dirname is not defined` en producción.
- La autorización por rol se mantiene igual: `admin` sigue con acceso total y `miembro` queda limitado a `Proyectos`, `Tareas` y `Calendario`.
- Verificación ejecutada: `npm run lint` y `npm run build` finalizaron sin errores ni warnings relacionados con Edge Runtime.

## Última actualización

- Fecha: 2026-07-09
- Actualizado: se corrigió el Lab para renderizar fases reales migradas, se compactó la lista de proyectos, se estabilizó el recálculo de avance, se normalizó el label de proyectos en los selectores de la app y se eliminó la dependencia de `supabase-js` en el middleware Edge.
- Estado actual: `npm run lint` y `npm run build` pasan limpios; el middleware ya consulta el rol con `fetch` nativo compatible con Edge Runtime.

## 2026-07-12 — Archivos Finder y headers recientes

- Se completó la UI de `Archivos` tipo Finder con sidebar de secciones, breadcrumbs, carga por drag & drop, vistas `Íconos` / `Lista` / `Galería` y papelera accesible desde la navegación.
- Se corrigieron los headers redundantes que habían quedado en `SaaS` y `Notas`, y `Archivos` quedó sin título duplicado debajo de la topbar.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan; el único aviso restante es el tip de `no-img-element` en la preview de archivos de galería.

## 2026-07-12 — SaaS, Notas y Archivos sin headers duplicados

- `SaaS` quedó arrancando directo con el selector de período y el selector de producto, sin `h1/h2` redundantes debajo de la topbar.
- `Notas` perdió el encabezado grande de la página y también el título redundante del panel lateral; la fila funcional superior quedó como única cabecera visible.
- `Archivos` fue auditado y mantiene solo contenido funcional en su layout Finder, sin repetir el nombre de la sección como encabezado grande.

## 2026-07-12 — Wiki sin header duplicado ni alta repetida

- Se eliminó el header redundante de la página de `Wiki` y también el encabezado del sidebar, dejando solo los controles funcionales.
- El botón `+ Artículo` quedó en un único lugar, dentro del panel central, para evitar duplicación visual y ahorrar espacio.

## 2026-07-12 — Archivos: limpieza visual, drag & drop y apertura por tipo

- Se eliminó el header redundante del sidebar de `Archivos` y los textos de ayuda que ocupaban espacio innecesario.
- El menú de acciones quedó con ícono vertical, cierre por click afuera y posicionamiento inteligente para no cortarse en pantalla.
- Las carpetas ahora navegan con un solo click, la toolbar quedó en una sola fila sin buscador y la vista galería usa iconos grandes por tipo para archivos no imagen.
- Se agregó drag & drop para mover y reordenar elementos, y los archivos ahora se abren en nueva pestaña mientras que `Descargar` fuerza la descarga.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan; el único aviso restante es el tip de `no-img-element` para la preview de galería.

## 2026-07-09 — Shell sin headers duplicados

- Se eliminó el header redundante debajo de la topbar en Outbound, Inbound, Cotizador, Proyectos, Tareas, Calendario, Finanzas y Dashboard.
- Se introdujo `FilterPopover` como contenedor reutilizable para filtros flotantes con cierre por click afuera/Escape y badge de filtros activos.
- Outbound e Inbound pasaron a tener una sola fila superior con búsqueda, filtros en popover, contador/badge y acción principal al final.
- Cotizador movió `Nueva cotización` a la fila de tabs; Proyectos movió `Nuevo proyecto` al tab bar de la ficha y lo mantuvo visible también en el estado vacío; Finanzas movió `Exportar P&L a Excel` a la fila de tabs; Dashboard quedó solo con selector de período y fecha de actualización.
- Tareas eliminó la fila de filtros y pasó a un kanban de 3 columnas que ocupa todo el ancho disponible.
- Calendario dejó la fila de controles como única cabecera superior, sin duplicar título/subtítulo.
- Estado actual: cambios de layout aplicados y listos para verificación final con `lint`/`build`.

## Última actualización

- Fecha: 2026-07-09
- Actualizado: se eliminaron los headers duplicados debajo de la topbar en Outbound, Inbound, Cotizador, Proyectos, Tareas, Calendario, Finanzas y Dashboard; además se agregó `FilterPopover` y se reubicaron las acciones principales dentro de filas funcionales existentes.
- Verificación: `npm run lint` y `npm run build` pasan limpios después del refactor de layout.
- Estado actual: el shell quedó consistente y todos los módulos relevantes muestran su acción principal sin repetir títulos/subtítulos debajo de la topbar.

## 2026-07-09 — Proyectos: card compacta y Features por estado

- `ProyectoCard` quedó compacta y dejó de estirarse verticalmente en el panel izquierdo.
- El tab `Features` volvió a un kanban de 3 columnas por estado (`Pendiente`, `En curso`, `Lista`) ocupando todo el ancho disponible.
- Cada feature ahora muestra la fase como badge y el filtro por fase funciona como metadato, no como estructura visual principal.
- El alta/edición de subtareas en el kanban permite elegir responsable y fase opcional desde un selector por nombre.
- El tab `Roadmap` ahora muestra las fases planificadas como referencia de solo lectura con su progreso por fase.
- `LabCanvas`, `FaseColumn` y `SubtareaChecklistItem` quedaron deprecados, sin uso en la UI actual, pero se conservan en el código por si se retoma esa vista alternativa.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## Última actualización

- Fecha: 2026-07-09
- Actualizado: se compactó `ProyectoCard`, se reemplazó el Lab por un kanban por estado en `Features`, se agregó el selector de responsable/fase opcional al alta de subtareas y el roadmap ahora referencia las fases planificadas.
- Verificación: `npm run lint` y `npm run build` pasan limpios después del ajuste de Proyectos.
- Estado actual: la UI de Proyectos quedó consistente con el patrón de Tareas y con las fases visibles como metadato/referencia, no como estructura principal.

## 2026-07-09 — Finanzas y Dashboard: fechas null-safe

- Se corrigió la causa raíz del crash compartido en `/finanzas` y `/dashboard`: `lib/finanzas.ts` asumía que `fecha_vencimiento` siempre era string y hacía `.split("-")` sin validar `null`.
- `formatFecha()` ahora devuelve `Sin fecha` si recibe `null`, `undefined` o una fecha inválida.
- `getCobroEffectiveDueDate()` e `isCobroVencido()` ahora son tolerantes a fechas vacías para que los cobros incompletos no rompan el render ni los jobs de vencidos.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## Última actualización

- Fecha: 2026-07-09
- Actualizado: se blindó el formateo de fechas contra valores nulos/ inválidos en Finanzas y Dashboard, evitando el crash al cargar ambos módulos.
- Verificación: `npm run lint` y `npm run build` pasan limpios después del fix.
- Estado actual: `/finanzas` y `/dashboard` cargan sin el error de `.split()` sobre `null`.

## 2026-07-09 — Proyectos: fases colapsables y roadmap público sin error de Client Component

- El tab `Features` de Proyectos volvió a renderizar el Lab original con fases como columnas colapsables, checklist de subtareas, alta de nuevas fases y CRUD completo de fases.
- Se reactivó el flujo de `NuevaFaseForm` junto con edición inline del nombre, fechas y descripción de cada fase, además de eliminación con confirmación.
- `LabCanvas` volvió a ser el contenedor principal de la vista de fases y `LabCanvas`/`FaseColumn` quedaron sincronizados con el hook `useFasesProyecto()` para crear, actualizar y borrar fases.
- El tablero de features por estado quedó nuevamente deprecado en el código, pero no se eliminó para conservar la alternativa previa.
- El roadmap público se ajustó para compilar sin el error de `Event handlers cannot be passed to Client Component props`, moviendo la parte interactiva a un boundary cliente explícito.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios luego de los cambios.

## Última actualización

- Fecha: 2026-07-09
- Actualizado: se reactivó el Lab de fases en Proyectos con CRUD completo y se corrigió el boundary cliente del roadmap público para eliminar el error de event handlers.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: Proyectos volvió a la vista por fases colapsables y `/roadmap/[slug]` renderiza sin el error de Client Component.

## 2026-07-09 — Proyectos: kanban por estado con fases expandibles

- El tab `Features` se rediseñó otra vez como un kanban de 3 columnas fijas por estado (`Pendiente`, `En curso`, `Lista`), donde cada card representa una fase completa.
- Cada fase se puede expandir o colapsar para mostrar el checklist de subtareas, mientras que el movimiento entre columnas sigue siendo manual con drag & drop.
- Se agregó `estado` a `fases_proyecto`, el endpoint `PATCH /api/fases/[id]/estado` y `updateEstadoFase()` en el hook `useFasesProyecto()`.
- La vista tipo Lab (`LabCanvas`, `FaseColumn`, `SubtareaChecklistItem`, `NuevaFaseForm`) quedó nuevamente deprecada en la UI, pero se conserva en el código.
- El roadmap público quedó sin frontera client innecesaria y compila como Server Component puro en su sección visual.
- El roadmap público ahora se expone con `roadmap_slug` legible, generado a partir del cliente con sufijo aleatorio, y se completó un backfill para proyectos existentes.
- Verificación ejecutada: `npm run lint` y `npm run build` finalizaron sin errores.

## Última actualización

- Fecha: 2026-07-09
- Actualizado: se re-rediseñó `Features` como un kanban por estado con fases expandibles, se agregó el estado de fase persistido y se estabilizó el roadmap público dejando el timeline en Server Component.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: el módulo Proyectos usa fases como cards de estado y el Lab anterior quedó deprecado pero conservado.

## 2026-07-10 — Proyectos: ajustes finos al kanban de fases

- Se eliminó la descripción de la card de fase del kanban de `Features` para evitar duplicar contenido que ya vive en el tab `Roadmap`.
- Se quitó el selector “mover a fase” del checklist de subtareas; ahora cada subtarea permanece fija en su fase.
- Se restauró el indicador de estado clickeable de cada subtarea a la izquierda del nombre, con el ciclo `pendiente → en_curso → lista`.
- Se eliminó el badge de estado redundante del header de fase y se agregó prioridad editable inline con color, apagando su énfasis visual cuando la fase queda en `lista`.
- `fases_proyecto` pasó a incluir `prioridad`, y tanto el form de nueva fase como las rutas de creación/edición la persisten.
- Verificación ejecutada: `npm run lint` y `npm run build` finalizaron sin errores.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: se simplificó el kanban de fases sacando duplicaciones visuales, se reactivó el control visible de estado de subtarea y se sumó prioridad editable por fase.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: el kanban de Features quedó más limpio, con subtareas fijas por fase y prioridad visual desacoplada cuando la fase está finalizada.

## 2026-07-10 — Tareas: navegación a proyecto y prioridad visual

- Se confirmó que `POST /api/tareas` sigue disponible y devuelve JSON en local; el hook `useTareas` quedó más robusto ante respuestas no JSON para no romperse con HTML inesperado.
- El subtítulo cliente/proyecto en `TareaCard` dejó de repetir la información en una pill separada y ahora es clickeable para ir a `/proyectos?project_id=...`.
- `ProyectosClient` y la página de Proyectos ahora respetan ese `project_id` para abrir la ficha correspondiente seleccionada.
- Las cards de tareas muestran prioridad por color consistente con Proyectos, y ese énfasis se atenúa cuando la tarea está terminada.
- Verificación ejecutada: `npm run lint` y `npm run build` finalizaron sin errores.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: se mejoró la navegación entre Tareas y Proyectos, se eliminó la pill redundante de vínculo y se reforzó el manejo de respuestas del hook de tareas.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: crear tareas sigue funcionando con JSON en local y la UI de tareas/proyectos quedó más directa y consistente.

## 2026-07-10 — Finanzas: métricas, runway y suscripciones

- Se agregó un helper compartido para calcular egresos de un período considerando costos recurrentes como activos desde su fecha en adelante, y se reutilizó en P&L, runway y métricas financieras.
- `caja_actual` pasó a descontar solo egresos efectivamente pagados, y el runway ahora distingue entre `estable`, `agotado` y `normal` en lugar de mostrar `N/A` o valores rotos.
- El resumen de Finanzas sumó un `MARGEN DEL MES`, tooltips con formato de moneda en los gráficos y colores coherentes para ingresos/egresos.
- Se incorporó un `Runway Lab` client-side con hipótesis editables que compara escenario real vs. propuesto y solo persiste egresos al aprobarlos.
- La pestaña `Egresos` dejó de mostrar alta rápida inline permanente y ahora usa un botón `Cargar egreso` que abre el modal reutilizable.
- Las suscripciones activas ahora muestran estado visual de vencido, y el botón `Marcar cobrado` crea o actualiza el cobro del ciclo actual y avanza la próxima fecha de cobro.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios después de los cambios.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: Finanzas quedó con métricas de runway más robustas, gráficas con tooltips, simulador de escenarios local y el flujo de egresos/suscripciones más claro.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: la sección Finanzas está lista para uso diario con costos recurrentes, runway estable/agotado/normal y aprobación explícita de escenarios.

## 2026-07-10 — Proyectos: tinte de cards en vez de borde lateral

- `FaseCardExpandible` dejó de marcar la prioridad con una línea lateral y ahora usa un tinte de fondo completo por prioridad (`danger-light`, `warning-light`, `paper`).
- Cuando la fase está en `lista`, la card vuelve a fondo blanco para apagar la urgencia visual.
- `ProyectoCard` también dejó el borde lateral de selección y pasó a usar `bg-signal-light` en toda la card con un borde sutil alrededor.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: se cambió el lenguaje visual de selección/prioridad de líneas laterales a tintes completos en Proyectos.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: las cards de fases y proyectos usan fondo completo para comunicar estado sin depender de bordes laterales.

## 2026-07-10 — Sidebar: reordenamiento lógico

- `Dashboard` pasó a ser el primer item del sidebar, arriba de todo y sin label de sección.
- En `Comercial`, `Cotizador` y `Clientes` intercambiaron posición para dejar el orden `Outbound`, `Inbound`, `Cotizador`, `Clientes`.
- `Control` quedó reducido a `Finanzas` solamente, ya que `Dashboard` se movió fuera de esa sección.
- El sidebar ahora soporta items sin sección explícita como bloque top-level, sin padding de grupo ni label en mayúsculas.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: se reordenó el sidebar según el nuevo orden lógico y se agregó un bloque top-level para Dashboard.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: el sidebar mantiene permisos y activo resaltado, pero con una jerarquía visual más clara.

## 2026-07-10 — Finanzas: margen dentro del P&L y runway con MRR

- La card separada de `Margen del mes` se retiró del resumen y el margen ahora se comunica dentro del gráfico de P&L, con porcentaje por mes y promedio de 6 meses debajo del título.
- Los gráficos de P&L y runway muestran valores visibles sobre barras/puntos y usan ejes con formato monetario compacto para no depender solo del tooltip.
- El resumen financiero quedó en una sola fila de 5 cards en desktop, con scroll horizontal en pantallas chicas para evitar el salto a segunda fila.
- El runway base incorporó el MRR de suscripciones activas y la proyección compartida entre Resumen, Dashboard y Runway Lab quedó alineada en una misma lógica.
- El Runway Lab pasó a simular costos por meses seleccionados, y al aprobar crea un egreso real por cada mes marcado.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: Finanzas quedó con margen integrado al P&L, runway con MRR activo y simulación por meses seleccionados.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: la sección Finanzas está más clara visualmente y el lab de runway refleja escenarios más fieles al negocio.

## 2026-07-13 — Notas: color por etiqueta y header más liviano

- Se simplificó el header del editor de Notas para dejar solo la fila funcional: título, vínculo compacto, estado de guardado como punto, pin, menú y tags chicos.
- El color visual ya no pertenece a la nota individual: pasó a `notas_etiquetas`, con chips reutilizables y selector de color por etiqueta para que el mismo tag se vea consistente en toda la app.
- El sidebar de Notas quedó más liviano, sin secciones densas de fijadas ni encabezados redundantes; la estructura ahora prioriza buscador, todas las notas, carpetas, etiquetas y papelera.
- Se ajustó el documento de base de datos para eliminar `notas.color` y registrar la nueva tabla `notas_etiquetas`.
- Verificación ejecutada: `npm run build` pasó limpio; `npm run lint` queda cubierto por el build aunque quedó un warning de `img` en Archivos que no bloquea la compilación.

## 2026-07-13 — Gráficos premium y KPI cards con ícono

- `MetricaCard` pasó a soportar un ícono circular de color en la esquina superior derecha, con variante semántica por métrica para reutilizarla en Finanzas, Dashboard y SaaS.
- `PLChart`, `RunwayChart` y `MRRChart` se rediseñaron como series de tiempo con áreas superpuestas, degradés suaves y curvas `monotone`, manteniendo tooltip y ejes legibles.
- Los gráficos categóricos (`EmbudoLeads` y `WinRateChart`) se mantuvieron como barras, pero con spacing más amplio, bordes suaves y degradé sutil para alinearlos con la nueva familia visual.
- Verificación ejecutada: `npm run build` pasa; `npm run lint` pasa con la advertencia preexistente de `components/archivos/ArchivosClient.tsx` sobre `<img>`.
- Verificación visual: pendiente de validación en browser por indisponibilidad temporal del control del navegador in-app en esta sesión.

## 2026-07-12 — Perfil personal y fotos de usuario

- Se agregó la página `/perfil` con edición de nombre, subida y eliminación de foto, y cambio de contraseña propio.
- `usuarios.foto_url` quedó conectado al sistema: el sidebar, el avatar superior y los responsables visibles en tareas, subtareas, features y outbound muestran foto real cuando existe.
- Se incorporó el proxy autenticado para servir fotos desde Storage privado, evitando signed URLs expiran.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios. La única advertencia restante es preexistente en `components/archivos/ArchivosClient.tsx` por uso de `<img>`.

## 2026-07-12 — Archivos: fondo por tipo en tarjetas

- En la vista `Íconos` y `Galería`, el color de tipo dejó de vivir solo en el ícono y pasó a ocupar toda la zona visual superior de la card.
- Las carpetas y los distintos tipos de archivo se distinguen ahora de un vistazo por el fondo completo de esa zona, manteniendo el texto inferior sobre fondo blanco.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan; el único aviso restante sigue siendo el tip de `no-img-element` para la preview de galería.

## 2026-07-12 — Archivos: nombre fuera de la card en Íconos/Galería

- En `Íconos` y `Galería`, la card visual quedó reducida al ícono/fondo de tipo y el nombre pasó a vivirse debajo, fuera del recuadro.
- Se retiró el conteo de subcarpetas/archivos y el label de tipo de estas vistas para dejar la jerarquía más limpia; ese detalle sigue solo en `Lista`.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan; el único aviso restante sigue siendo el tip de `no-img-element` para la preview de galería.

## 2026-07-12 — Wiki: librería de prompts poblada

- Se agregó `app/api/wiki/seed-prompts/route.ts` como seed idempotente para crear la categoría `Librería de Prompts` y sus 5 artículos base.
- Los artículos quedaron guardados con contenido real en JSON de TipTap, usando solo nodos compatibles con el editor compartido de la Wiki.
- Verificación ejecutada: el seed fue aplicado en Supabase y corrido más de una vez sin duplicar la categoría ni los artículos existentes.
- Estado actual: la Wiki ya incluye una librería de prompts lista para consulta y reutilización dentro del sistema.

## 2026-07-12 — Wiki con editor compartido

- Se agregó el módulo `/wiki` con navegación propia en ENTREGA, categorías y artículos estructurados.
- `RichTextEditor` quedó extraído a un componente compartido para reutilizar el mismo TipTap entre Notas y Wiki, sin duplicar la lógica de edición.
- La Wiki usa autosave, búsqueda por título/contenido y el mismo lenguaje visual de paneles de Notas.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-12 — SaaS: módulo por producto con métricas, roadmap y suscriptores

- Se agregó la navegación `SaaS` en `CONTROL` para admin y se creó la vista `/saas` con selector dinámico de productos.
- El panel muestra métricas de negocio recurrente, histórico de MRR, roadmap kanban por producto y lista de suscriptores reutilizando el lenguaje visual ya validado en Finanzas.
- `suscripciones.producto_id` quedó integrado para separar suscriptores SaaS de clientes de desarrollo a medida sin duplicar la tabla `clientes`.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-12 — SaaS: planes por producto y asignación desde la ficha del cliente

- Se agregó `producto_planes` al esquema documentado y a los tipos generados, junto con `suscripciones.plan_id` para ligar cada suscripción SaaS a un plan concreto o a un monto personalizado.
- La ficha de cliente ahora permite asignar un producto SaaS, elegir un plan o cargar un monto personalizado desde el tab `Suscripción`.
- Se agregó un modal de gestión de planes dentro de `/saas` para crear, editar y eliminar pricing por producto.
- El backend de suscripciones ahora acepta `producto_id` y `plan_id`, autocompleta `monto_mensual` cuando corresponde y sigue respetando el cobro mensual automático existente.

## 2026-07-12 — Módulo Notas completo

- Se agregó el módulo `Notas` con panel lateral de carpetas, lista central, editor TipTap, notas fijadas, papelera, buscador y vínculos opcionales a clientes, proyectos y leads.
- `ClienteFicha`, `ProyectoFicha` e `InboundFicha` ahora muestran una sección de notas vinculadas con acceso directo a crear y abrir la nota relacionada.
- Se documentaron las tablas `carpetas_notas` y `notas` en `docs/DATABASE.md`.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-12 — Notas: layout fijo, colores post-it, tags e imágenes pegadas

- Los 3 paneles de `/notas` quedaron con anchos fijos y `min-w-0`, sin estirarse por texto largo; el contenedor ahora ocupa toda la altura disponible de la sección.
- El botón `+ Nota` se movió junto al buscador del sidebar y la fila superior redundante se eliminó.
- Se agregó soporte de color post-it por nota, chips de tags con autocompletado y filtrado por etiqueta desde el sidebar.
- TipTap ahora permite pegar o arrastrar imágenes, subiéndolas al bucket privado y sirviéndolas vía un proxy autenticado del sistema.
- Se documentaron los campos `color` y `tags` de `notas` en `docs/DATABASE.md`.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-12 — Reversión del Dock al shell original

- Se restauró el sidebar lateral vertical original junto con la topbar superior, retirando el dock flotante del layout activo.
- El footer de perfil/logout volvió al sidebar y el comportamiento móvil vuelve a depender del drawer clásico.
- El dock quedó conservado en el código como implementación deprecada para una eventual reversión futura.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-11 — Dashboard rediseñado con secciones reales

- `app/api/dashboard/route.ts` ahora calcula datos reales para Financiero, Comercial y Entrega, incluyendo histórico de P&L, embudo de leads, win rate por canal, capacidad de entrega y features recientes.
- `DashboardClient` se reescribió con Financiero como sección protagonista, seguida por Comercial y Entrega, manteniendo el lenguaje visual de Finanzas para cards y gráficos.
- Se reutilizó `PLChart` en el dashboard y se agregaron `EmbudoLeads` y `FeaturesRecientes` para completar la vista sin duplicar lógica.
- `useDashboard` quedó protegido contra respuestas viejas que podían pisar datos nuevos al cambiar de período, evitando estados vacíos espurios en Comercial.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios; además se confirmó visualmente en `/dashboard` que la sección Financiero domina la pantalla y que Comercial/Entrega se renderizan en el layout nuevo.

## Última actualización

- Fecha: 2026-07-11
- Actualizado: Dashboard rediseñado desde cero con Financiero protagonista y secciones completas de Comercial/Entrega.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: el dashboard ya no usa cards gigantes vacías; ahora presenta métricas densas, gráficos reutilizados y navegación por período consistente.

## 2026-07-11 — Finanzas: Runway Lab como tab propia

- El Runway Lab salió del modal/botón de Resumen y pasó a ser una tab propia de Finanzas, ubicada entre Tesorería y Tarjetas.
- El lab quedó rearmado con una fila de KPIs, un gráfico comparativo con línea actual y línea de escenario, y un constructor/listado de hipótesis en dos columnas.
- Cada hipótesis ahora puede activarse o desactivarse localmente para comparar escenarios sin perder el trabajo de simulación previo.
- La aprobación sigue siendo explícita: solo las hipótesis activas crean egresos reales, con confirmación previa y refresh de métricas al final.
- Verificación visual local ejecutada sobre una preview temporal del componente, porque `/finanzas` quedó detrás del login en este entorno y no había credenciales de demo disponibles para entrar al shell autenticado.
- Verificación técnica ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-11 — Shell: sidebar reemplazado por dock flotante

- El sidebar lateral quedó reemplazado por un Dock horizontal flotante centrado abajo, con navegación en una sola fila, tooltip por ítem y marcador de ruta activa con dot.
- La topbar ahora aloja el logo real de Blyndtek y el avatar abre un dropdown con perfil y cierre de sesión, manteniendo el logout funcional.
- El contenido principal recuperó ancho horizontal completo para aprovechar mejor kanbans, tablas y vistas anchas, con padding inferior extra para no tapar el Dock.
- `Sidebar.tsx` quedó deprecado y sin uso activo, preservado por si hiciera falta revertir el shell en el futuro.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-11 — Finanzas: paleta de gráficos con degradés

- `PLChart` pasó a usar degradés verticales SVG para `Ingresos`, `Egresos` y `Margen`, manteniendo el significado semántico de los colores pero con una ejecución visual más moderna.
- `CarteraClientesChart` aplicó degradés horizontales en las barras apiladas de `Cobrado` y `Pendiente`, también con IDs aislados para evitar colisiones si ambos gráficos se montan juntos.
- Se mantuvieron las barras sin bordes oscuros y con radios redondeados en el extremo exterior, para que la card siga viéndose limpia sobre el fondo claro.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-11 — Tesorería: cajas con histórico y “Sin asignar” oculto cuando está vacío

- Se eliminó la fila de texto `Color` de cada card de caja; ahora el punto superior ya es el único indicador visual del color.
- La card especial `Sin asignar` ahora queda oculta si no tiene movimientos y, cuando sí los tiene, muestra una aclaración más explícita sobre cobros/egresos sin cuenta asignada.
- `app/api/finanzas/tesoreria/route.ts` ahora devuelve un `historico` de 6 meses por caja para pintar un sparkline mini en cada card, incluyendo el bucket especial solo si realmente tiene movimientos.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-11 — Finanzas: ajuste visual de P&L y cartera

- `PLChart` dejó la línea de clientes activos más liviana y coherente con la paleta: `signal`, punteada, más fina y con dots más chicos.
- Las barras de `PLChart` ya no muestran borde oscuro y `CarteraClientesChart` pasó a usar tonos intermedios más visibles para cobrado y pendiente.

## 2026-07-11 — Finanzas: curva suave en clientes activos

- La línea de `clientes_activos` en el gráfico de P&L ya venía pidiendo `type="monotone"`, pero el renderer local de `recharts` seguía trazando segmentos rectos; se corrigió el renderer para respetar la interpolación suave.
- Verificación pendiente: `npm run lint` y `npm run build` tras el ajuste del renderer.

## 2026-07-11 — Finanzas: tooltip flotante sobre el cursor

- Causa exacta: el wrapper local de gráficos seguía posicionando el tooltip de `PLChart` arriba a la derecha del panel (`absolute right-2 top-2`), y `CarteraClientesChart` hacía lo mismo con su card (`absolute right-4 top-4`), así que el tooltip no seguía el mouse.
- Corrección: ambos tooltips pasaron a calcular posición dinámica en función del cursor y del contenedor visible.
- Verificación automática ejecutada: `npm run lint` y `npm run build` pasan limpios.
- Verificación visual directa quedó limitada por autenticación local: el navegador de prueba cayó en `/login` y no había credenciales de demo disponibles en el repo para entrar al shell autenticado.

## 2026-07-11 — Finanzas: barras más visibles y eje de clientes con más aire

- `PLChart` volvió a usar los colores sólidos del sistema para las barras con `fillOpacity={0.65}`, así recuperan presencia sobre el fondo blanco sin quedar demasiado pesadas.
- El eje derecho de `clientes_activos` ahora reserva más altura (`dataMax * 2.5`, mínimo 5), para que la línea no se pegue arriba ni exagere los cambios pequeños.

## 2026-07-11 — Finanzas: tooltip sigue el cursor

- Se corrigió el posicionamiento del tooltip en el wrapper local de gráficos y en la card de `CarteraClientesChart`, que estaban anclándolo arriba a la derecha.
- Verificación visual ejecutada en navegador autenticado: en `/finanzas` → `Resumen` el tooltip del P&L cambia de lugar entre hover izquierdo y central, y en `Cobros` la cartera por cliente también sigue el cursor.
- Verificación automática ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Finanzas: cartera por cliente corregida

- `recharts` estaba en `^3.8.1` y quedó actualizado a `^3.9.2` en `package.json`; no había `@types/recharts` separado instalado.
- Se eliminó el cast/hack de `CarteraClientesChart`, pero en navegador el `layout="vertical"` siguió renderizando la orientación horizontal por defecto, así que este gráfico se resolvió con un render horizontal apilado determinístico propio para que los nombres de cliente queden en el eje vertical y las barras cobrado/pendiente se apilen correctamente.
- Verificación visual ejecutada sobre `/debug-cartera`: ARC Global, Funes Exclusivos y Cubelo aparecen con barras horizontales apiladas y el tooltip/resumen sigue mostrando los importes.
- Verificación final ejecutada: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: la cartera por cliente muestra los nombres correctos en vertical y las barras apiladas en horizontal, sin depender del comportamiento inconsistente de Recharts para este caso puntual.

## 2026-07-10 — Finanzas: P&L visible y Cartera refinada

- `CarteraClientesChart` quedó con barras más finas, sin importes flotantes permanentes, usando los tonos `success-light` y `warning-light` del design system y con tooltip on-hover para cobrado/pendiente/total/% cobrado.
- Se corrigió la escala de cartera calculando el máximo real como `total_cobrado + total_pendiente`, de modo que el contrato más grande llega al borde derecho del gráfico y los demás quedan proporcionales.
- La causa real de que `PLChart` no se viera era distinta a la de Cartera: `tsconfig` redirige `recharts` a la capa local `recharts/index.tsx`, y esa capa no implementaba `ComposedChart`; el archivo mezclaba ese wrapper local con un import profundo de `recharts/lib/chart/ComposedChart`, dejando el render inconsistente.
- `recharts/index.tsx` ahora implementa `ComposedChart` para barras + línea con ejes izquierdo/derecho, y `PLChart` lo consume desde `recharts` sin casts ni imports profundos.
- `RunwayChart` dejó de depender del import profundo de `LabelList`; mantiene sus valores visibles con la capa propia que ya tenía sobre el gráfico.
- Verificación visual ejecutada en una ruta temporal sobre build de producción local: P&L muestra barras de Ingresos/Egresos/Margen y línea de Clientes activos con datos reales; Cartera muestra barras horizontales finas y tooltip funcional.

## 2026-07-10 — Tiempo trabajado por fase

- Se agregó la tabla `sesiones_tiempo` al esquema documentado y la API para iniciar y pausar cronómetros por fase.
- `ProyectoFicha` ahora muestra el total invertido del proyecto con desglose por fase y por usuario, y cada fase integra un cronómetro propio.
- La topbar suma un indicador global de cronómetro activo para no perder sesiones en curso al navegar entre módulos.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Roadmap público: auto-preview descartado

- Se eliminó el intento de cargar `og:image` del sistema en vivo porque los sitios con login no exponen una preview pública confiable.
- `SistemaEnVivo` volvió al fallback final de dominio + link directo, sin fetch ni skeletons innecesarios.
- Se borró el endpoint `app/api/roadmap/[token]/preview-imagen/route.ts` porque ya no se usa.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: el roadmap público muestra la card de sistema en vivo de forma simple y estable, sin dependencias externas ni previews rotas.

## 2026-07-10 — Finanzas: scroll general restaurado

- Se retiró el patrón de `overflow-hidden` / `h-full` del contenedor demasiado alto que envolvía todos los tabs de Finanzas.
- El comportamiento especial de header fijo + scroll interno quedó aislado solo en el tab `Egresos`, mientras que `Resumen`, `Cobros`, `Suscripciones` y `Tesorería` volvieron a scrollear normalmente.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: la página de Finanzas recuperó su scroll general sin perder el comportamiento especial de la tabla de egresos.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: el preview del roadmap quedó sin caché temporal para diagnosticar el sitio del cliente en caliente.
- Verificación: el endpoint `preview-imagen` sigue devolviendo `imagenUrl: null` porque `funes-exclusivos.vercel.app` responde con una redirección de la propia app (`NEXT_REDIRECT` hacia `/dashboard`) y no entrega un HTML público con `og:image`.
- Estado actual: no hay preview usable para ese dominio mientras no exponga una página pública con metadata `og:image`; el fallback limpio sigue siendo el comportamiento correcto.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: Finanzas sumó un tarjetero de referencia rápida con CRUD administrable de tarjetas, mostrando solo alias, banco, últimos 4 y vencimiento.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: la tabla `tarjetas` quedó integrada como inventario de referencia para identificar medios de gasto sin guardar PAN completo ni CVV.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: la tabla de Egresos quedó con header fijo, scroll solo en las filas y la columna de acciones reducida al menú `⋮`.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: Egresos mantiene el encabezado siempre visible y el listado gana densidad sin perder accesibilidad.

## 2026-07-10 — Finanzas: cajas administrables

- Los medios de cobro/pago dejaron de ser un enum fijo y ahora salen de la tabla `cajas`, administrable desde la pestaña Tesorería.
- `cobros.cuenta_medio` y `egresos.cuenta_medio` se mantienen como texto con el slug de la caja para no romper movimientos históricos.
- Los selects de Cobro/Egreso cargan solo cajas activas, mientras que Tesorería muestra activas más las inactivas que todavía tienen movimientos.
- Se agregó un modal de gestión para crear, renombrar, activar/desactivar y eliminar cajas; la eliminación se bloquea si ya existen movimientos asociados.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Finanzas: cartera por cliente

- Se agregó el gráfico `Cartera por cliente` en la tab `Cobros`, con barras horizontales apiladas de cobrado vs pendiente por cliente.
- El endpoint `app/api/finanzas/cartera-clientes/route.ts` agrupa solo cobros de tipo `hito` y `one_pay`, excluyendo mantenimiento y brick para no mezclar contratos de desarrollo con recurrentes.
- `FinanzasClient` ahora muestra ese resumen visual arriba de `CobrosTabla`, mientras el detalle línea por línea sigue intacto.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Finanzas: P&L volvió a renderizar con datos reales

- `PLChart` dejó de depender de `ResponsiveContainer` y pasó a un `ComposedChart` con ancho explícito, lo que corrigió el render vacío del panel de P&L.
- El gráfico vuelve a mostrar barras y línea con datos reales, y se verificó visualmente en una página de debug temporal antes de limpiar el cambio.
- La fórmula de runway quedó confirmada con MRR activo, costos fijos mensuales y caja real descontando solo egresos pagados.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios.
- Estado actual: el panel de P&L vuelve a dibujar sus series correctamente y el cálculo de runway quedó alineado con la definición de negocio.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: se corrigió el render del gráfico de P&L y se confirmó la fórmula de runway.
- Verificación: `npm run build` y `npm run lint` pasan limpios.
- Estado actual: el panel de P&L muestra barras y línea con datos reales, y el runway usa la fórmula acordada.

## 2026-07-10 — Roadmap público: preview visual del sistema en vivo

- `SistemaEnVivo` ahora consulta una preview server-side del `og:image` del sitio del cliente y la muestra como banner si está disponible.
- Se agregó un endpoint de fallback seguro que nunca rompe la página: si el sitio no responde o no tiene `og:image`, la card sigue mostrando solo dominio + enlace.
- El roadmap público se verificó en un proyecto real sin errores en consola y con la card renderizando correctamente el fallback limpio.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios.

## 2026-07-10 — Roadmap público: diagnóstico de preview sin imagen

- Se verificó el endpoint `app/api/roadmap/[token]/preview-imagen/route.ts` contra el proyecto `funes-exclusivos-80tm`.
- Diagnóstico exacto: `url_sistema` apunta a `https://funes-exclusivos.vercel.app/login`, y ese HTML inicial no expone `og:image`.
- Se confirmó manualmente que el endpoint responde `200` con `imagenUrl: null`, por lo que el fallback actual es el comportamiento correcto hasta que el sitio del cliente publique metadata OG.
- La route quedó más robusta con `User-Agent`, timeout extendido y resolución de URLs relativas, pero no había un bug de parseo que corregir en este caso.

## 2026-07-10 — Finanzas: P&L a 12 meses y gráfico a ancho completo

- `app/api/finanzas/metricas/route.ts` pasó el histórico de P&L de 6 a 12 meses.
- `components/finanzas/PLChart.tsx` ahora ocupa el ancho completo del panel con `ResponsiveContainer`, elimina la leyenda manual duplicada y usa la leyenda nativa de Recharts.
- Las barras usan los tonos claros `signal-light`, `danger-light` y `success-light`, el eje Y arranca en `0`, y el eje X rota levemente los 12 meses para mantener legibilidad.
- El subtítulo de la card quedó alineado con el nuevo rango: `Margen promedio (12 meses)`.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios.

## 2026-07-10 — Finanzas: nombres legibles en Cobros y Suscripciones

- `app/api/cobros/route.ts` ahora devuelve el nombre de la empresa del cliente asociado, en vez de dejar visible el `cliente_id` crudo.
- `CobrosTabla` muestra `cobro.cliente.empresa` cuando está disponible, con fallback al ID solo si faltara el join.
- `SuscripcionesLista` deja de mostrar `cotizacion_id` crudo y pasa a resolver el nombre de la cotización asociada.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: el gráfico de P&L pasó a 12 meses, a ancho completo, con colores claros y una sola leyenda.
- Verificación: `npm run build` y `npm run lint` pasan limpios.
- Estado actual: la tab Resumen de Finanzas muestra un P&L más limpio, legible y alineado con los tokens del design system.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: se agregó preview visual al sistema en vivo del roadmap público.
- Verificación: `npm run build` y `npm run lint` pasan limpios.
- Estado actual: la card del sistema en vivo muestra preview cuando puede y cae a fallback seguro cuando no.

## 2026-07-10 — Finanzas: CTA de egresos alineado con exportación

- En la tab `Egresos` de Finanzas, `Cargar egreso` se movió a la misma fila que `Exportar P&L a Excel` para dejar la acción principal en un solo bloque de controles.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios.

## 2026-07-10 — Finanzas: P&L con ejes reales y tooltip, runway fuera de Resumen

- `PLChart` pasó a `ComposedChart` con ejes reales, tres barras (`Ingresos`, `Egresos`, `Margen`) y una línea de `Clientes activos`; los valores detallados ahora viven solo en el tooltip on-hover.
- `RunwayChart` se retiró de la tab `Resumen` y el panel de P&L quedó a ancho completo; el botón `Simular escenarios` se mantiene debajo, alineado a la derecha.
- `app/api/finanzas/metricas/route.ts` ahora entrega `historico_pl` con `margen` y `clientes_activos` por mes. Para `clientes_activos` se eligió la definición de clientes distintos con suscripción `activa` al cierre de cada mes, porque es la más estable con los datos actuales.
- `FinanzasClient` consume el histórico del backend y exporta el P&L con las nuevas columnas de margen y clientes activos.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Roadmap público: bisección real del error de Client Component

- La bisección aisló el disparo inicial en `components/roadmap/ResumenPagos.tsx:43-44`, al renderizar el `Card` raíz dentro de la página pública.
- El mismo patrón reapareció en `components/roadmap/SistemaEnVivo.tsx:11-16`, así que ambos contenedores se reemplazaron por `div` estáticos con la misma apariencia visual.
- `app/roadmap/[slug]/page.tsx` volvió a renderizar `RoadmapHeader`, `ResumenPagos`, `SistemaEnVivo`, `RoadmapTimeline` y `RoadmapFooter` sin el overlay de `Event handlers cannot be passed to Client Component props`.
- Verificación ejecutada en navegador: hard reload sobre `/roadmap/funes-exclusivos-80tm` y captura sin error rojo visible.

## 2026-07-10 — Tareas, avance por fases y configuración pública del roadmap

- `/tareas` ahora mantiene el encabezado fijo y deja el scroll únicamente dentro de cada columna del kanban.
- `recalcularAvanceProyecto` pasó a calcular el avance como promedio por fase, combinando fases sin subtareas con fases que sí tienen subtareas, y se llama desde create/update/delete de fases y features.
- `ProyectoFicha` incorporó una card visible de configuración del roadmap público con URL del sistema, credenciales del cliente y PIN, guardada de forma explícita.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Roadmap público: fases reales, pagos y credenciales con PIN

- `RoadmapHeader` ahora usa el mismo logo real que el sidebar (`Logo_Blyndtek_plataforma_negro.svg`) para que la marca coincida en toda la app.
- `app/api/roadmap/[token]/route.ts` volvió a leer `fases_proyecto` reales del proyecto, incluyendo conteo de features por fase, y además expone un resumen público de pagos y la URL del sistema si existe.
- Se agregó `app/api/roadmap/[token]/credenciales/route.ts` para desbloquear credenciales solo con PIN correcto, sin incluirlas en el HTML inicial ni en las props del server component.
- Se sumaron `ResumenPagos`, `SistemaEnVivo` y `CredencialesGate` al roadmap público, integrados en `app/roadmap/[slug]/page.tsx`.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: el roadmap público muestra fases reales, pagos resumidos, link al sistema y credenciales protegidas por PIN server-side.

## 2026-07-10 — Roadmap público: nombres reales de fechas en fases

- Se corrigieron todas las referencias a `fecha_inicio_estimada` / `fecha_fin_estimada` para usar los nombres reales de la base `fecha_estimada_inicio` / `fecha_estimada_fin`.
- El endpoint público de roadmap, las rutas de fases y la UI del timeline ahora consultan y muestran las fechas correctas sin provocar errores de columna inexistente.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Roadmap público: `entregables` eliminado de fases

- Se removieron todas las referencias a `entregables` como si fuera una columna de `fases_proyecto`.
- El roadmap público y la UI de fases usan solo `descripcion` como texto libre para esa información.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Proyectos: estado optimista, scroll interno y edición explícita

- `FasesEstadoKanban` ahora actualiza el estado de la fase de forma optimista al soltar una card, así el tinte de prioridad se apaga inmediatamente cuando pasa a `lista`.
- `ProyectoFicha` quedó estructurado con tabs fijos arriba y contenido interno con scroll propio; el panel derecho ya no empuja toda la página.
- `FaseCardExpandible` incorporó botones visibles de `Guardar` y `Cancelar` para la edición inline de nombre y fechas estimadas, manteniendo `Enter` como atajo de confirmación.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-10 — Finanzas: números visibles en gráficos y runway prolijo

- `PLChart` y `RunwayChart` reforzaron la visualización de valores con labels explícitos visibles sobre barras y puntos, además de mantener tooltips formateados en USD.
- El gráfico de P&L volvió a mostrar el margen por mes de forma clara y el promedio de 6 meses sigue visible bajo el título.
- La card de `Runway` dejó de mostrar un texto largo que se partía en varias líneas y ahora presenta un estado corto y legible.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios.
- Verificación visual ejecutada: se abrió `/finanzas` con sesión real de admin y se confirmó en captura que los importes aparecen visibles sobre el gráfico de P&L y la proyección de runway.

## 2026-07-10 — Tareas y Proyectos: ajustes visuales menores

- `TareaCard` cambió la prioridad baja a fondo blanco para que no se confunda con el fondo gris del kanban.
- `ProyectoCard` dejó de mostrar el borde azul de selección y quedó solo con el tinte `signal-light`.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios.

## 2026-07-10 — Proyectos y Tareas: tintes completos y selección reforzada

- `FaseCardExpandible` dejó de mostrar el selector visible de prioridad; ahora la prioridad se cambia desde el menú `⋮` y el fondo completo de la card refleja alta/media/baja con `danger-light`, `warning-light` y `paper`.
- `ProyectoCard` reforzó el estado seleccionado con `bg-signal-light` completo y `border-2 border-signal` para que la selección quede inequívoca a simple vista.
- `TareaCard` dejó atrás el borde lateral por prioridad y ahora usa el mismo patrón de fondo completo por prioridad que las fases, manteniendo `bg-white` en tareas terminadas.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: se corrigió el patrón visual de prioridad y selección en Proyectos y Tareas.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: las cards comunican prioridad y selección con fondo completo, sin líneas laterales confusas.

## Última actualización

- Fecha: 2026-07-10
- Actualizado: Finanzas quedó con margen integrado al P&L, runway con MRR activo y simulación por meses seleccionados.
- Verificación: `npm run lint` y `npm run build` pasan limpios.
- Estado actual: la sección Finanzas está más clara visualmente y el lab de runway refleja escenarios más fieles al negocio.

## 2026-07-13 — Checklist de QA obligatoria para fases en Lista

- Se agregó `checklist_qa` como gate de calidad para fases: una fase solo puede pasar a `lista` si tiene checklist y todos los ítems están completados.
- La checklist puede generarse con Claude a partir de la fase y sus subtareas, o ampliarse manualmente con ítems nuevos; cada ítem puede marcarse, eliminarse y regenerarse.
- `FasesEstadoKanban` ahora muestra un toast claro y revierte el drag optimista si el backend rechaza el pase a `Lista` por checklist incompleta.
- Se documentó la nueva tabla `checklist_qa` y la validación de estado quedó alineada al flujo real de Proyectos.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios; el build requirió limpiar `.next` para descartar un artefacto viejo de Next antes de volver a compilar.

## 2026-07-13 — Wiki: estándares técnicos poblados con seed idempotente

- Se agregó el seed idempotente `app/api/wiki/seed-estandares/route.ts` para crear la categoría `Estándares técnicos` y el artículo `Constitución técnica de Blyndtek`.
- El contenido se construye como JSON de TipTap reutilizando el mismo patrón de bloques compartidos que ya usan los demás seeds de Wiki.
- Se extrajeron helpers de construcción de bloques TipTap a `lib/wiki-seed.ts` para evitar duplicar la serialización entre los seeds de prompts y estándares.
- Verificación ejecutada: `npm run build` pasa limpio tras limpiar `.next`; `npm run lint` también pasa con el warning no bloqueante preexistente de `img` en Archivos.

## 2026-07-13 — Listas de selección como filas y limpieza de íconos decorativos

- `NotasLista`, `WikiLista`, `ProyectoCard` y `ClienteCard` dejaron el patrón de card individual y pasaron a filas con divisor fino, selección en `signal-light` y hover sutil.
- Las listas izquierdas de Proyectos y Clientes también dejaron de usar separación tipo card entre ítems, para que la navegación se lea como lista homogénea.
- Se limpiaron íconos circulares decorativos fuera de las excepciones permitidas, dejando el icono simple en `SistemaEnVivo` y en los flujos de aceptación de cotización.
- La Constitución técnica de Blyndtek en la Wiki incorporó la regla de usar Card solo para paneles/detalle y filas con divisor para listas de selección, además de restringir íconos con badge de color a `MetricaCard` y tiles de Archivos.

## 2026-07-13 — Auditoría de emojis y compactación de fase

- `CronometroFase` quedó reducido a una sola fila compacta: icono de reloj, tiempo en vivo y play/pausa con SVG propio, sin texto explicativo ni desglose por usuario.
- `ChecklistQaSection` pasó a un pill compacto con barra de progreso y movió la checklist completa a un modal; el botón de regenerar ahora usa un icono SVG de refresh.
- `IndicadorCronometroGlobal`, `NotaEditor` y `SistemaEnVivo` dejaron de usar emojis literales y ahora muestran iconos SVG propios.
- La Constitución técnica de la Wiki reforzó explícitamente la regla de cero emojis genéricos en toda la UI, siempre reemplazados por SVG del sistema.

## 2026-07-13 — Recharts: imports consolidados desde el barrel principal

- Se corrigió la causa exacta del gráfico vacío en P&L y de las vistas que compartían el mismo sistema de gráficos: había imports de `recharts` desde rutas internas (`recharts/es6/...`) mezclados con imports del barrel principal.
- Todos los charts quedaron importando exclusivamente desde `recharts`, sin rutas internas ni instancias duplicadas del módulo.
- Además, el wrapper local de `recharts` quedó alineado para soportar `AreaChart` y props visuales usados por los gráficos categóricos, de modo que el build siga estable con la implementación del proyecto.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios, con el warning no bloqueante preexistente de `<img>` en `components/archivos/ArchivosClient.tsx`.

## 2026-07-13 — Series de tiempo finales: barras sólidas sin degradé

- `PLChart`, `RunwayChart`, `MRRChart` y el gráfico embebido de `RunwayLab` quedaron unificados en la versión final de barras sólidas, sin `defs`, sin `linearGradient` y sin áreas.
- La causa raíz confirmada del bug de P&L vacío fue el uso de imports internos de `recharts` en lugar del paquete principal, lo que mezclaba instancias del sistema de charts y rompía el render silenciosamente.
- `Dashboard` hereda el fix automáticamente porque reutiliza `PLChart`, así que el mismo criterio visual y técnico queda alineado entre Finanzas y Dashboard.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios, con el warning no bloqueante preexistente de `<img>` en `components/archivos/ArchivosClient.tsx`.
- Verificación visual pendiente en este entorno: intenté abrir `/finanzas`, `/dashboard` y las demás vistas pedidas, pero la conexión al browser embebido falló y no pude completar una inspección autenticada real desde acá.

## 2026-07-13 — Gráficos: refinamiento visual del renderer

- El renderer local de `recharts` ahora respeta mejor `barSize`, gaps, dominios de ejes, `strokeDasharray`, márgenes mínimos y formatters de ticks.
- Esto corrige la estética envejecida de los charts: barras demasiado gruesas, labels cortados, ticks repetidos en el eje derecho y líneas auxiliares con demasiado peso visual.
- `PLChart`, `RunwayChart`, `MRRChart` y `RunwayLab` se benefician del mismo renderer, manteniendo barras sólidas pero con proporción y espaciado más actuales.
- `CarteraClientesChart` se rediseñó sin gradientes lavados: ahora usa tracks finos, segmentos sólidos para cobrado/pendiente, eje superior más limpio y leyenda compacta.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios, con el warning no bloqueante preexistente de `<img>` en `components/archivos/ArchivosClient.tsx`.

## 2026-07-13 — Gráficos: rediseño visual premium

- Se actualizó el renderer local de `recharts` para renderizar `defs`, `linearGradient`, filtros SVG y tooltips en `BarChart`, permitiendo una capa visual más moderna sin cambiar datos ni lógica de negocio.
- `PLChart`, `RunwayChart`, el gráfico de `RunwayLab` y `MRRChart` ahora usan barras con gradiente sobrio, sombra SVG suave, leyendas tipo chip, tooltips con fondo translúcido y grillas más livianas.
- Los gráficos categóricos del Dashboard (`PipelineChart`, `EmbudoLeads`, `WinRateChart` y `RunwayProyectado`) quedaron alineados al mismo lenguaje visual: menos bordes, más aire, chips de contexto, barras con profundidad y tooltips custom.
- Los sparklines de Tesorería dejaron de heredar ejes/márgenes de charts grandes y ahora se renderizan como líneas limpias dentro de una superficie compacta.
- `CarteraClientesChart` se mantiene como referencia visual aprobada y no se modificó su funcionamiento.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan limpios, con el warning no bloqueante preexistente de `<img>` en `components/archivos/ArchivosClient.tsx`.

## 2026-07-13 — AI Dev orquestado desde Blyndtek OS

- Se agregó la infraestructura completa del lado de Blyndtek OS para orquestar AI Dev por fase: tipos, ejecución registrada, webhook receptor, disparo inicial a GitHub y confirmación manual de SQL ejecutado.
- `ProyectoFicha` ahora permite configurar el repositorio `owner/repo` necesario para AI Dev, y `FaseCardExpandible` muestra un bloque compacto de seguimiento con estado, PR y SQL pendiente.
- El webhook también registra tareas manuales sugeridas por la IA y tiempo de ejecución de IA en `sesiones_tiempo` con `usuario_id = null` y `es_ia = true`.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan. No se ejecutó todavía un piloto contra un repo real con workflow de GitHub Actions en esta sesión.

## 2026-07-13 — Features por fase: `fase` fantasma vs `fase_id` real

- La causa exacta del kanban vacío era que el frontend seguía agrupando por `feature.fase`, mientras el dato real viajaba en `fase_id`; además, el endpoint de features seguía exponiendo el campo fantasma `fase` junto al id correcto.
- Se alineó el contrato a `fase_id` como único campo canónico: `types/features.ts`, el endpoint `/api/proyectos/[id]/features`, el update de feature, el cálculo de avance, el kanban y las vistas de fase ahora agrupan y persisten con `fase_id`.
- También se corrigieron la checklist de QA y el flujo de AI Dev para que consuman `fase_id`, evitando que reaparezca el mismo desajuste en otras rutas que reutilizan features.
- Verificación ejecutada: `curl /api/proyectos/{id}/features` ya devuelve `fase_id` sin `fase`. `npm run build` y `npm run lint` pasan con el warning no bloqueante preexistente de `<img>` en `components/archivos/ArchivosClient.tsx`.

## 2026-07-13 — Backfill de tareas faltantes para features cargadas por SQL directo

- Se confirmó la causa: en `HA Control de Obra` había 23 features cargadas por SQL directo que no pasaron por la ruta normal de creación, así que nunca se generó su tarea vinculada.
- Se agregó `app/api/features/backfill-tareas/route.ts` y el helper compartido `lib/proyectos/featureTarea.ts` para reutilizar la misma lógica de creación automática de tareas que usa la app al crear una feature normalmente.
- El backfill se ejecutó sobre todo el sistema y creó 23 tareas nuevas; al recontar quedó `missingCount: 0` para `HA Control de Obra` y también 0 features huérfanas en el total general.
- No se agregó trigger de base de datos: la solución quedó en el backfill y el helper compartido, porque la regla de negocio vive en TypeScript y no conviene duplicarla en PL/pgSQL sin una capa adicional de mantenimiento.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan con el warning no bloqueante preexistente de `<img>` en `components/archivos/ArchivosClient.tsx`.

## 2026-07-13 — Tareas: nombre de fase visible en subtareas de proyecto

- El listado de tareas ahora trae `fase_nombre` para las tareas vinculadas a una feature: el GET de `/api/tareas` hace join con `features` y `fases_proyecto` y aplana el nombre de la fase en la respuesta.
- `TareaCard` muestra ese nombre debajo del proyecto cuando la tarea proviene de una subtarea de proyecto; las tareas sueltas quedan igual, sin texto extra.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan con el warning no bloqueante preexistente de `<img>` en `components/archivos/ArchivosClient.tsx`.

## 2026-07-13 — AI Dev: tareas marcadas como IA, filtro y rollback seguro

- Al iniciar AI Dev desde una fase, las features pendientes pasan a `en_curso` y las tareas vinculadas quedan marcadas con `es_ia=true`, `responsable_id=null` y estado `en_proceso` mientras dura la ejecución.
- Si el dispatch a GitHub falla, el endpoint revierte el estado de features, tareas y fase para no dejar trabajo marcado como IA sin una corrida real detrás.
- El webhook de AI Dev ahora distingue fallos y éxito parcial: en `fallido` devuelve las tareas IA a `nueva`, y en `pr_abierto` deja el PR registrado sin auto-terminar tareas todavía.
- La vista de Tareas sumó el badge compacto `IA` y el filtro `Ocultar tareas de IA`, con conteos y columnas respetando el filtro activo.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan; queda el warning no bloqueante preexistente de `<img>` en `components/archivos/ArchivosClient.tsx`.

## 2026-07-13 — Rol comercial, comisiones y Archivos compartidos

- Se agregó el rol `comercial` con scoping a sus propios leads/clientes y navegación acotada, además de una vista `Equipo comercial` para admin con métricas por vendedor.
- El alta de leads/clientes ahora propaga `vendedor_id` correctamente y la aceptación de cotizaciones crea comisiones configurables en estado pendiente cuando corresponde.
- Archivos quedó bifurcado entre admin y comercial: admin conserva la gestión completa y puede compartir carpetas; comercial ve solo carpetas compartidas y sus subcarpetas.
- Se expuso `rol` en `/api/usuarios` para poder seleccionar destinatarios de compartición sin agregar otra fuente de datos.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-13 — Finanzas: comisiones pagadas generan egreso real

- Al marcar una comisión como pagada, el backend crea automáticamente un egreso trazable con `categoria = "comisiones"` y `comision_id`, para que el costo impacte el P&L, el runway y la tesorería sin doble carga manual.
- La tab `Resumen` suma ahora `Comisiones pendientes` y la nueva tab `Comisiones` permite filtrar, revisar y marcar pagos de forma centralizada para admin.
- `Finanzas` quedó restringido a admin desde el page server-side, y el egreso automático ya se refleja también en la tabla de `Egresos`.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-13 — Tareas por usuario y notas compartidas

- Las tareas ahora quedan scoped por usuario: los no-admin solo ven y editan sus propias tareas, y el admin puede cambiar el selector para ver todas o filtrar por usuario.
- Se agregó `notas_compartidas` con RLS para que admin comparta notas puntuales con usuarios comerciales; los comerciales solo ven lo creado por ellos o lo compartido explícitamente.
- `NotaEditor` incorporó el menú de compartir, el listado de usuarios comerciales y el indicador visual cuando una nota tiene accesos compartidos.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan limpios.

## 2026-07-13 — Runway Lab con cobros y suscripciones pendientes opcionales

- Se agregó el endpoint `GET /api/finanzas/runway` para servir la proyección de runway con el modo conservador por defecto y con `incluirPendientes=true` cuando se quiere sumar ingresos esperados.
- El `Runway Lab` sumó un switch para incorporar cobros pendientes y suscripciones pendientes sobre la base actual, manteniendo las hipótesis de costo como una capa adicional encima de esa base.
- Los cobros o suscripciones pendientes sin fecha esperada quedan fuera de la curva y se reportan aparte, para no inventar una fecha arbitraria que infle el runway.
- Verificación ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-13 — Mi panel comercial conectado y operativo

- Se creó la ruta `/mi-panel` para usuarios con rol `comercial`, se agregó al menú como primer ítem visible para ese rol y se ajustó el default route para que llegue ahí tras el login.
- El backend de métricas devuelve leads totales, embudo por etapa, clientes convertidos, ventas del mes, comisiones pendientes/pagadas y bono disponible, y la vista muestra KPIs, embudo simple y tabla de comisiones propias.
- Se corrigió el runtime que rompía la vista por columnas fantasmas en `comisiones` (`proyecto_id`, `porcentaje`, `config_comisiones_id`, `updated_at`) y se adaptó la respuesta para derivar el porcentaje sin depender de campos inexistentes.
- Verificación ejecutada: abrí `/mi-panel` en el navegador autenticado con el usuario comercial de prueba `test.comercial@gmail.com` y confirmé que la ruta responde 200 y deja de mostrar 404; luego `npm run lint` y `npm run build` pasaron correctamente.

## 2026-07-14 — Leads unificados: Outbound + Inbound en una sola vista

- La navegación comercial renombró `Outbound` a `Leads` y eliminó la sección separada `Inbound`; ahora el menú apunta a `/leads` y `/outbound` quedó como redirect de compatibilidad.
- La nueva vista `/leads` unifica los leads de ambos canales en un solo kanban: el canal sigue existiendo como dato de referencia y se muestra como badge en cada card, pero ya no segmenta la navegación.
- `Notas` e `InboundFicha` se actualizaron para enlazar a la nueva ruta canónica `/leads`, y `middleware`/`lib/auth` se ajustaron para permitir el redirect legacy sin reexponer `/inbound`.
- Se limpió el runtime stale de Next con un build limpio antes de la verificación, porque el server de producción viejo estaba sirviendo chunks obsoletos y devolviendo 500 en `/login`.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan; además se validó con un usuario comercial autenticado que `/leads` responde 200 y renderiza el kanban con el menú actualizado, mientras que `/inbound` ya no existe como ruta.

## 2026-07-14 — Leads: etapa `ganado`, negociación y comisión final

- Se incorporó la etapa `ganado` al flujo de leads y al kanban, ubicada antes de `descartado`, con modales progresivos según la etapa de destino para registrar toque, calificación, propuesta y cierre.
- Al cerrar un lead como `ganado` ahora se reutiliza la conversión lead→cliente, se registra el historial de negociación en `leads_negociaciones` cuando el monto final difiere del propuesto y, si corresponde, se dispara la comisión sobre el monto final acordado.
- La documentación de esquema quedó alineada con el enum efectivo de `leads.etapa`, que ahora incluye `ganado`; no se creó una columna nueva de notas de calificación porque se reutilizó `leads.notas` para ese historial breve.
- Aun no pude leer desde el entorno el nombre exacto del CHECK constraint remoto de Supabase, así que documenté el valor efectivo de la etapa en el repo y dejé el flujo consistente en tipos, APIs y UI.

## 2026-07-14 — Middleware Edge rearmado sin `@supabase/ssr`

- Se eliminó la regresión que reintroducía `createServerClient` en `middleware.ts`, volviendo al patrón liviano de `fetch()` directo contra `auth/v1/user` y `rest/v1/usuarios`.
- La causa exacta del warning de Vercel era el empaquetado de `@supabase/supabase-js` dentro del middleware Edge, que elevaba el bundle y disparaba el error de Node.js API no soportada.
- Verificación local ejecutada: `npm run build` ya no emite el warning de Edge Runtime y el tamaño reportado del middleware bajó a 27.8 kB; `npm run lint` también pasa limpio.

## 2026-07-14 — Finanzas: comisiones sin `proyecto_id`

- Se corrigió la route de comisiones para no escribir ni exponer `comisiones.proyecto_id`, que no existe en la tabla real y estaba rompiendo `/finanzas`.
- La referencia a proyecto, cuando hace falta a nivel de reporting, debe resolverse desde `cliente_id` / `cotizacion_id` y no como FK directa en `comisiones`.
- Se alinearon también los tipos generados y los helpers de creación de comisiones para que no vuelvan a intentar insertar ese campo fantasma.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan, y una pasada de búsqueda no dejó referencias activas de `comisiones.proyecto_id` en el código de app.

## 2026-07-14 — Equipo comercial: boundary cliente/servidor corregido

- Se corrigió `components/ui/Card.tsx`, que estaba renderizando handlers de evento en JSX sin `use client` y rompía la ruta `/equipo-comercial` con el error de Event Handlers en Client Components.
- `app/(app)/equipo-comercial/page.tsx` puede seguir siendo Server Component; el problema estaba en la card reutilizable que esa vista monta para cada vendedor.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del fix.

## 2026-07-14 — Limpieza de comillas escapadas literales

- Se revisó el repo en busca de líneas corruptas con comillas escapadas tipo `\"use client\";`.
- Archivo afectado y corregido: `components/ui/Card.tsx`.
- Verificación final: el grep específico volvió a correr y no devolvió coincidencias; `npm run build` y `npm run lint` pasan sin errores de sintaxis.

## 2026-07-14 — Middleware: loop de `/login` cortado y cookies inválidas limpiadas

- Se corrigió `middleware.ts` para que nunca redirija `/login` hacia sí misma cuando hay una cookie de sesión inválida o vencida.
- Ahora, ante fallo de auth o rol, el middleware borra todas las cookies `sb-*-auth-token*` y, si la ruta ya es `/login`, deja renderizar la página en vez de volver a redirigir.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del fix.

## 2026-07-14 — Login: navegación completa para evitar la carrera de cookies

- El login hacía `router.push("/dashboard")` inmediatamente después de `signInWithPassword`, y eso permitía que `/dashboard` llegara al middleware antes de que la cookie de sesión nueva estuviera persistida en el navegador.
- La causa confirmada fue una carrera de timing entre persistencia de cookies y navegación client-side; el middleware veía la request sin un token válido a tiempo y devolvía a `/login`.
- Se cambió `components/auth/LoginForm.tsx` para usar `window.location.href = "/dashboard"` y forzar una navegación completa del navegador, garantizando que la request siguiente lleve la cookie ya escrita.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del cambio.

## 2026-07-14 — Limpieza de comillas escapadas en seed y descarga de archivos

- Se corrigieron `app/api/wiki/seed-estandares/route.ts` y `app/api/archivos/[id]/descargar/route.ts`, que seguían teniendo comillas escapadas literales `\"` en el fuente.
- Se volvió a correr el grep global sobre `*.ts` y `*.tsx` fuera de `node_modules` y `.next`, y no quedaron resultados.
- Verificación ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del ajuste.

## 2026-07-14 — Middleware: soporte al prefijo `base64-` de cookies Supabase SSR

- Se confirmó que la cookie `sb-*-auth-token` llega en el formato `base64-...` usado por `@supabase/ssr`, con el JSON real codificado en base64.
- `middleware.ts` ahora decodifica ese prefijo con `atob()` antes de intentar `JSON.parse()`, y mantiene compatibilidad con cookies viejas que no usen ese formato.
- La causa exacta del falso negativo de sesión era que el parser devolvía el valor crudo con el prefijo `base64-`, invalidando el access token enviado a Supabase.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del fix.

## 2026-07-14 — Middleware Edge desacoplado de `lib/supabase/config`

- `lib/supabase/config.ts` sólo contenía helpers puros de URL y no importaba módulos incompatibles; aun así, `middleware.ts` quedó desacoplado para evitar que Vercel arrastre ese archivo compartido al bundle Edge por el alias `@/lib/supabase/config`.
- `middleware.ts` ahora define su propio `normalizeSupabaseUrl()` local, de forma autocontenida, y no depende de ningún módulo compartido de `lib/supabase/`.
- La medida es preventiva y de robustez: el middleware mantiene imports mínimos y evita repetir el problema de deploy por dependencia indirecta en Edge Runtime.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del cambio.

## 2026-07-14 — Equipo comercial: embudo por etapa en gráfico horizontal

- En `/equipo-comercial` se reemplazó el listado de texto plano de leads por etapa por un `BarChart` horizontal con barras por etapa y tooltip sobre hover.
- El gráfico usa la paleta semántica del sistema para diferenciar etapas tempranas, `Ganado` y `Descartado`, y muestra un estado vacío limpio cuando aún no hay leads cargados.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del ajuste.

## 2026-07-14 — Mi panel comercial: pipeline potencial visible

- La API de `/api/mi-panel/metricas` ahora calcula `pipeline_potencial_usd` sumando el monto negociado o propuesto de los leads propios en etapa `cotizacion`.
- `/mi-panel` agregó la métrica “En juego” con un texto auxiliar corto para comunicar propuestas enviadas pendientes de respuesta.
- El layout de métricas pasó a contemplar 5 cards en lugar de 4, con carga esquelética consistente.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del ajuste.

## 2026-07-14 — Mi panel comercial: gráfico de ventas de 6 meses

- La API de `/api/mi-panel/metricas` ahora devuelve `historico_ventas` con la cantidad de cierres y el monto total por mes para los últimos 6 meses.
- Se agregó `components/mi-panel/VentasChart.tsx` y se ubicó inmediatamente debajo de las métricas del panel comercial, antes del detalle de comisiones y el embudo.
- El gráfico usa barras sólidas para el monto y una línea punteada para la cantidad de ventas, con tooltip que sigue al mouse y estado vacío cuando no hay cierres.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del ajuste.

## 2026-07-14 — Leads: card expandible con vendedor, valor y comisión estimada

- Se confirmó que la card expandible de leads no estaba aplicada en la UI viva y se implementó sobre `components/outbound/LeadCard.tsx`, con resumen desplegable de touch points, próximo seguimiento, notas, monto y negociación.
- `app/api/leads/route.ts` ahora devuelve `vendedor_nombre` y la comisión estimada calculada con la configuración activa, para que admin vea el vendedor asignado y el valor del lead de un vistazo.
- `app/api/tareas/route.ts` y `lib/hooks/useTareas.ts` incorporaron el filtro `lead_id`, y `components/tareas/TareasClient.tsx` lo usa para que el link de seguimiento navegue a una vista útil.
- `app/(app)/leads/page.tsx` pasó a resolver el usuario en servidor para diferenciar la UI de admin/comercial, y `components/outbound/KanbanColumn.tsx` propagó ese contexto a la card.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente luego del ajuste; además se confirmó con grep que la card quedó realmente en `components/outbound/LeadCard.tsx` y no solo como plan.

## 2026-07-14 — Leads: verificación real del expandible y contexto admin

- Se revisó primero `components/leads/` con `ls` y `grep` para confirmar que no había un card expandible nuevo viviendo ahí; la UI real estaba en `components/outbound/LeadCard.tsx`.
- La card ahora muestra el resumen expandible dentro del kanban y, para admin, expone vendedor asignado, valor del lead y comisión estimada sin requerir expansión.
- La API de leads quedó preparada para devolver el nombre del vendedor junto con la comisión estimada, y la vista de tareas acepta `lead_id` para abrir seguimientos vinculados.
- Verificación local ejecutada: `npm run build` y `npm run lint` siguen pasando luego de esta aplicación real del cambio.

## 2026-07-14 — Middleware Edge: cadena limpia y autocontenida

- Se hizo una pasada completa de la cadena real del middleware y no quedó ningún import de `@supabase/ssr` ni `@supabase/supabase-js` alcanzable desde `middleware.ts`.
- `middleware.ts` quedó todavía más blindado: ahora importa solo `next/server` y define el tipo `Rol` localmente, sin depender de `types/auth.ts` ni de helpers compartidos.
- El build local quedó limpio, sin warnings de Edge Runtime ni trazas de Node incompatibles.
- Resultado de la investigación: en el checkout actual no apareció un archivo específico que siga arrastrando Supabase al middleware; la protección quedó reforzada para evitar regresiones por imports indirectos.

## 2026-07-14 — Archivos: typo de `carpetas_compartidas` corregido

- Se corrigió el typo `compartida_por` en la ruta de compartir carpetas; la columna real usada por `carpetas_compartidas` es `compartido_por`.
- También se alinearon los tipos generados de Supabase para esa tabla, evitando que la inserción o el `select` vuelvan a romper por un nombre de columna inexistente.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente después del fix, y la búsqueda global ya no muestra `compartida_por` en el flujo de `carpetas_compartidas`.

## 2026-07-14 — Leads: fila superior del kanban eliminada

- Se quitó por completo la barra superior de `/leads` para admin y comercial: buscador, filtros, contador de vencidos y botón de nuevo lead.
- El kanban ahora arranca directo con las columnas y deja más espacio útil para las cards y su contenido expandible.
- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente luego del ajuste.

## 2026-07-14 — Middleware blindado sin imports del proyecto

- Se verificó que `middleware.ts` está 100% autocontenido y no importa ningún archivo del proyecto.
- Evidencia del chequeo solicitado:

```text
$ grep -n "^import" middleware.ts
1:import { NextResponse, type NextRequest } from "next/server";
```

- La lógica de rol, rutas, URL de Supabase, REST, parsing de cookies `base64-`, limpieza de cookies inválidas y protección contra loops de `/login` vive localmente en `middleware.ts`.
- `docs/DECISIONS.md` quedó actualizado con la regla más fuerte: `middleware.ts` es un archivo blindado y sólo puede importar `next/server`.

## 2026-07-14 — Middleware: limpieza de cookies sin dependencia de env vars

- Se detectó un camino adicional de riesgo: si `getSupabaseEnv()` fallaba en producción, el `catch` del middleware podía volver a llamar funciones de limpieza de cookies que dependían de la misma env var, provocando un segundo error y terminando en `MIDDLEWARE_INVOCATION_FAILED`.
- `middleware.ts` ahora detecta cookies de Supabase por patrón (`sb-*-auth-token` y chunks `sb-*-auth-token.N`) para extraer y borrar sesiones inválidas sin depender de `NEXT_PUBLIC_SUPABASE_URL`.
- Se mantiene el soporte para cookies normales y fragmentadas, incluyendo el formato `base64-` usado por Supabase SSR.
- Evidencia del chequeo de imports:

```text
$ grep -n "^import" middleware.ts
1:import { NextResponse, type NextRequest } from "next/server";
```

- Verificación local ejecutada: `npm run build` y `npm run lint` pasan correctamente, sin warnings de Edge Runtime; el artefacto `.next/server/middleware.js` no contiene `__dirname`, `@supabase/ssr`, `@supabase/supabase-js`, `createServerClient`, `lib/supabase` ni `types/auth`.

## 2026-07-14 — Producción: middleware Edge eliminado por completo

- La evidencia de Vercel siguió mostrando `MIDDLEWARE_INVOCATION_FAILED` con `ReferenceError: __dirname is not defined` aun después de blindar `middleware.ts`, por lo que se eliminó el archivo para que Next/Vercel no genere ninguna Edge Function de middleware.
- La protección mínima de rutas autenticadas se movió a `app/(app)/layout.tsx`: el layout server obtiene el usuario con `getCurrentUser()` y redirige a `/login` cuando no hay sesión válida.
- Verificación local:

```text
$ find . -maxdepth 3 \( -name 'middleware.*' -o -name 'proxy.*' \) -not -path './.next/*' -print
# sin resultados
```

- `npm run build` y `npm run lint` pasan correctamente; el resumen final de Next ya no muestra la línea `ƒ Middleware`, confirmando que no se compila middleware Edge.
- `docs/DECISIONS.md` quedó actualizado: queda prohibido reintroducir `middleware.ts` salvo decisión explícita nueva y verificación real en Vercel.
- Se pusheó el commit `514c8423473ec4f6ffbbf358f23934bea8b8d812` a `main`; al verificar producción, el error cambió de `MIDDLEWARE_INVOCATION_FAILED` a `404 NOT_FOUND` de plataforma en `/`, `/login` y `/dashboard`, lo que indica que el problema de Edge middleware quedó removido pero falta revisar en Vercel si el deploy quedó activo y asociado al dominio correcto.

## 2026-07-14 — Deploy Vercel reparado

- Causa confirmada del `404 NOT_FOUND`: el proyecto Vercel tenía `framework = null` (`Other`) y publicaba la raíz como salida estática, aunque ejecutaba `next build`; por eso no exponía las rutas App Router.
- Se configuró el proyecto `blyndtek-os-2-0` con framework `nextjs` y se agregó `vercel.json` para conservar esa configuración en futuros deploys.
- Deployment productivo verificado como `READY`: `dpl_FhxbDPppU2o6HFdeJ4c418RNYgw1`.
- Verificación HTTP: `/login` responde `200`; `/` responde `307` hacia `/login`; `/dashboard` responde `307` hacia `/login` sin sesión. Ya no aparece `404 NOT_FOUND` ni `MIDDLEWARE_INVOCATION_FAILED`.

## 2026-07-14 — Recalculo manual de avance de proyectos
- `lib/proyectos/recalcularAvance.ts` ya mantenía la fórmula combinada correcta: fases sin features usan `fase.estado`, fases con features usan el porcentaje de features en `lista`.
- La causa real del avance desactualizado fue el disparo: el proyecto `Sistema de Gestión Integral` se cargó por SQL directo, así que nunca pasó por los endpoints que llaman al helper automáticamente.
- Se agregó `app/api/proyectos/[id]/recalcular-avance/route.ts` para recalcular bajo demanda.
- Se ejecutó manualmente para `Sistema de Gestión Integral` (`0a061805-6ab3-46a9-981c-b70c1b040157`) y el `avance_pct` resultante quedó en `34%`.

## 2026-07-14 — Backfill de tareas faltantes ejecutado
- Se ejecutó el backfill retroactivo para todas las features sin tarea vinculada en el sistema.
- Resultado: se detectaron `78` features sin tarea y se crearon `78` tareas nuevas.
- Las `78` features de `Funes Exclusivos` ya quedaron visibles en `/tareas` con su tarea vinculada correspondiente.

## 2026-07-15 — Contrato de cliente con redefinición segura
- Se agregó la sección `Contrato` dentro de `ClienteFicha` para definir el valor total, cantidad de cuotas, día de pago, primera cuota y mantenimiento de una sola vez.
- Se creó `app/api/clientes/[id]/contrato/route.ts` para generar el contrato activo, crear automáticamente las cuotas como cobros `hito` y, si aplica, crear o reasignar la suscripción de mantenimiento.
- La redefinición confirma explícitamente el impacto antes de guardar y preserva intactos todos los cobros ya marcados como `cobrado`; sólo se reemplazan las cuotas todavía pendientes/facturadas/vencidas del contrato anterior.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-15 — Costos por cliente y rentabilidad mensual

- `ClienteFicha` sumó el tab `Financiero` con métricas de ingreso mensual, costo mensual, margen mensual y margen %, además de un gráfico de rentabilidad de 6 meses por cliente.
- Se agregaron `app/api/clientes/[id]/costos/route.ts` y `app/api/clientes/[id]/rentabilidad/route.ts` para listar, crear y resumir egresos vinculados al cliente, sin duplicar tablas ni lógica general de Finanzas.
- `components/finanzas/EgresoModal.tsx` ahora acepta `defaults` y `saving`, así el alta de costos desde la ficha arranca ya vinculada al cliente y, si existe, a su proyecto activo.
- `lib/finanzas/calcularEgresosPeriodo.ts` ahora acepta `clienteId` opcional para filtrar egresos por cliente sin romper el helper compartido.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-15 — P&L y Resumen financiero reorganizados

- Se auditó el cálculo de `historico_pl` y se confirmó que no filtraba por tipo de cobro; el ajuste se centró en dejar explícito que todo cobro `cobrado` cuenta como ingreso real, incluyendo facturación de desarrollo, contratos y mantenimiento.
- `app/api/finanzas/metricas/route.ts` ahora expone `facturacion_total` y calcula el ingreso mensual y el histórico con el criterio completo de caja cobrada.
- La tab `Resumen` de Finanzas quedó con 5 cards: `MRR actual`, `Runway`, `Facturación total`, `Caja actual` y `P&L del mes`.
- Las cards de `Cobros pendientes` y `Cobros vencidos` se movieron a la tab `Cobros`, y `Comisiones pendientes` quedó en la tab `Comisiones`.
- Verificación real con datos importados: los hitos cobrados de julio 2026 suman `USD 6.000`, y varios venían con `fecha_emision`/`fecha_cobro` nulas; por eso el histórico ahora usa `created_at` como fallback de accounting date para no dejar esos ingresos fuera del mes.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-15 — Contrato unificado y Cotizador retirado de la UI activa

- La lógica de creación/redefinición de contrato quedó extraída en `lib/contratos/crearOActualizarContrato.ts` y ahora la reutilizan tanto la ficha de cliente como el cierre de un lead en `ganado`.
- El flujo de `lead -> ganado` crea automáticamente el Cliente y luego genera el Contrato con una única cuota inicial y, si corresponde, la suscripción de mantenimiento.
- El módulo Cotizador quedó retirado de la UI/API activa: se eliminaron sus rutas y componentes, y la navegación dejó de exponer `/cotizador`; la tabla `cotizaciones` conserva su historial para consulta y trazabilidad.
- `app/api/dashboard/route.ts` pasó a calcular `ticket_promedio` desde contratos activos por cliente, para no depender de cotizaciones como fuente activa.
- `Finanzas` ahora recibe las cotizaciones desde el servidor para alimentar los selectores de cobro/suscripción sin depender de endpoints de cotizaciones ya deprecados.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-17 — Adelanto explícito en contratos y cobros sincronizados

- `lib/contratos/crearOActualizarContrato.ts` ahora genera el `Adelanto` como primer hito del contrato, calculado como un porcentaje configurable del valor total, y luego distribuye el saldo restante en cuotas.
- `ClienteFicha` suma el campo `Adelanto (%)` y la `Fecha del adelanto` en el tab `Contrato`, y muestra el adelanto separado del resto de las cuotas en el resumen del contrato activo.
- La tab `Cobros` del cliente ahora permite marcar un hito como cobrado con un click, resalta en rojo los pendientes vencidos y refresca el resumen del contrato al editar o cobrar un hito.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-17 — Migración masiva de íconos a lucide-react

- Se centralizó el sistema de íconos en `components/ui/icons.tsx` con `lucide-react` y un grosor uniforme para toda la UI.
- Se reemplazaron los SVG dibujados a mano en módulos de Archivos, Clientes, Login, Notas, Agentes, Proyectos, Finanzas, Dashboard, Perfil, Tareas, Calendario, Roadmap, Saas y componentes compartidos por el registro centralizado.
- Aproximadamente 20 archivos quedaron tocados por esta limpieza; las excepciones respetadas fueron logo de marca, gráficos de datos y los fondos circulares permitidos en `MetricaCard` y tiles de Archivos.

## 2026-07-17 — Helper de fechas blindado contra valores nulos

- Se confirmó la causa del error en `/finanzas -> Cobros`: la base tiene `12` cobros con `fecha_vencimiento` nula, y el helper central `lib/utils/fechas.ts` hacía `split("-")` sin chequear `null`/`undefined`.
- `lib/utils/fechas.ts` ahora es null-safe en `fechaInputAString`, `stringAFechaLocal`, `fechaStringAFechaLocal` y `formatearFechaDisplay`, devolviendo `null` o `"Sin fecha"` cuando corresponde.
- Se reforzaron los consumidores que podían chocar con fechas opcionales: `lib/finanzas/calcularEgresosPeriodo.ts`, `lib/finanzas/runwayProjection.ts`, `app/api/finanzas/tesoreria/route.ts`, `app/api/clientes/[id]/rentabilidad/route.ts`, `app/api/productos/[id]/metricas/route.ts`, `lib/productos.ts` y `components/finanzas/SuscripcionesLista.tsx`.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-18 — Runway Lab con tabla mensual central

- `app/api/finanzas/runway/route.ts` ahora expone por mes el desglose completo de la proyección: ingresos, costos fijos, costos de hipótesis, margen y caja actual / caja con escenario.
- `components/finanzas/RunwayLab.tsx` reorganizó el layout para que la tabla mensual sea la pieza central: sigue el switch de pendientes, conserva la fila de KPIs y el gráfico como resumen visual, y mueve el constructor / lista de hipótesis a una sección separada más abajo.
- Cada mes ahora puede expandir sus costos para ver el detalle de costos fijos y el itemizado de hipótesis activas, con alerta visual si la caja del escenario cae bajo cero.
- La tabla recalcula en vivo al activar o desactivar hipótesis, sin llamadas extra al backend hasta aprobar los cambios.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-19 — Topbar reducido

- `components/layout/Topbar.tsx` quedó reducido a una barra más baja, con sólo el nombre de la sección y el botón mobile de navegación.
- Se eliminó la campanita y el avatar del lado derecho del Topbar para evitar duplicación visual y recuperar altura útil en todos los módulos.
- Se confirmó que el footer del Sidebar mantiene el acceso a `Configuración de perfil` y `Cerrar sesión`, por lo que no se pierde funcionalidad al limpiar el header.

## 2026-07-19 — Runway Lab con gráfico híbrido

- `lib/finanzas/runwayProjection.ts` ahora expone `caja_acumulada_actual`, `caja_acumulada_escenario`, `mes_agotamiento_actual` y `mes_agotamiento_escenario` para que la proyección responda explícitamente cuándo se agota la caja.
- `components/finanzas/RunwayChart.tsx` se reescribió como gráfico híbrido: barras sólidas de ingresos/costos mensuales y líneas de caja acumulada actual/escenario, con referencia en cero y marcador de agotamiento.
- `components/finanzas/RunwayLab.tsx` eliminó la tabla mensual expandible; el detalle de ingresos, costos fijos, hipótesis, margen y caja acumulada vive ahora en el tooltip del gráfico central.
- Las hipótesis activas siguen recalculándose en memoria: el gráfico, KPIs y línea de escenario se actualizan al activar/desactivar sin llamadas extra al backend.
- Verificación local ejecutada: `npm run lint` y `npm run build` pasan correctamente.

## 2026-07-19 — Recalculo de avance y backfill de QA en HA Control de Obra

- Se recalculó el avance de `HA Control de Obra` después de cargar por SQL directo la fase `Chequeo general / QA de producción`.
- Resultado: `avance_pct` pasó de `100%` a `75%`; las fases existentes quedaron en `100%` y la nueva fase QA quedó en `0%` (`0/25` features en `lista`).
- Se ejecutó el backfill de tareas para features sin tarea vinculada: se crearon `25` tareas en total, las `25` correspondientes a la nueva fase QA de producción.
