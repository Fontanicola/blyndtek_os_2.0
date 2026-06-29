# Decisions

## 2026-06-25 — Inicialización técnica base

- Se eligió Next.js 14 con App Router como base del proyecto.
- Se definió la estructura de carpetas `app/`, `lib/`, `components/` y `types/` en la raíz.
- Se separaron los clientes de Supabase en `lib/supabase/client.ts` para browser y `lib/supabase/server.ts` para Server Components y Route Handlers.
- El cliente server usa `createServerClient` con manejo de cookies vía `next/headers`, sin implementar todavía auth ni middleware.
- Tailwind CSS quedó configurado con `extend: {}` para reservar el design system para el siguiente paso.

## 2026-06-25 — Design system base

- Se definieron los tokens visuales en `tailwind.config.ts` usando `theme.extend` para no sobrescribir defaults de Tailwind.
- Se agregaron tokens suplementarios `line`, `line-soft` y `danger-hover` para expresar bordes y hover states pedidos por la spec sin hardcodear colores dentro de los componentes.
- Se usó `next/font/google` con Inter para centralizar la tipografía del sistema desde el layout raíz.
- El `Spinner` se implementó como SVG animado con `strokeDasharray` y rotación, en lugar de un border spinner por CSS, para lograr un arco más limpio y consistente entre tamaños.
- El `Modal` maneja cierre por backdrop, tecla Escape y una salida animada breve antes de desmontarse, para evitar cortes visuales bruscos.

## 2026-06-25 — Shell base de aplicación

- El layout de `app/(app)` se implementó como client component para manejar el estado `isOpen` del sidebar mobile sin incorporar auth todavía.
- La detección de ruta activa del sidebar usa `usePathname()` directamente en el componente para mantener el resaltado sincronizado con la URL actual.
- El título de la topbar se resuelve desde `lib/navigation.ts`, usando la misma fuente de verdad que el sidebar para evitar duplicación de labels.
- El sidebar desktop y el sidebar mobile comparten el mismo componente `Sidebar`, variando solo por props de visibilidad y cierre.

## 2026-06-25 — Autenticación y protección de rutas

- El middleware usa `redirect` y no `rewrite`: usuarios sin sesión van a `/login` y usuarios autenticados sin permiso son enviados a una ruta permitida.
- El refresh del token de Supabase se maneja en `middleware.ts` con `createServerClient` y `cookies.getAll/setAll`, que es el patrón recomendado por `@supabase/ssr`.
- La decisión anterior de hacer `app/(app)/layout.tsx` totalmente cliente quedó reemplazada por un layout server-side que carga el usuario real y delega el estado mobile a `components/layout/AppShell.tsx`.
- La ruta activa sigue resolviéndose con `usePathname()` en los componentes cliente del shell, mientras que el usuario se obtiene desde servidor con `getCurrentUser()`.
- El logout visible del sidebar se implementó con cliente browser (`supabase.auth.signOut()` + `router.push('/login')`) para feedback inmediato en UI; además se dejó `app/api/auth/logout/route.ts` como Route Handler de soporte.

## 2026-06-25 — Fix de redirect loop en middleware

- El middleware quedó ajustado para hacer early return sin tocar Supabase en rutas públicas y sensibles al loop: `/login`, `/roadmap/*`, `/_next/*`, `favicon.ico`, `api/auth/*` y archivos estáticos.
- En middleware se usa `supabase.auth.getSession()` y no `getUser()`, para respetar el patrón seguro de `@supabase/ssr` durante el refresh de cookies.
- La respuesta de middleware se crea antes de instanciar Supabase y se mantiene sincronizada mediante `cookies.setAll`, para que cualquier refresh de sesión viaje en el mismo `NextResponse`.
- La lógica final de redirects quedó ordenada así: sin sesión en ruta privada va a `/login`; con sesión en `/login` va a `/dashboard`; con sesión pero sin permiso va a la ruta fallback del rol.

## 2026-06-25 — Rol en JWT para middleware

- El middleware dejó de consultar `public.usuarios` para resolver permisos, porque esa lectura puede quedar bloqueada por RLS en el contexto del request y provocar loops de redirect después del login.
- La estrategia elegida es leer `user_rol` directamente del JWT, buscando primero en `session.user.user_metadata` y luego en `session.user.app_metadata`.
- Se agregó la migración `supabase/migrations/002_custom_access_token_hook.sql` para sincronizar `rol` hacia el access token mediante `custom_access_token_hook`.
- Mientras el hook no esté activado manualmente en Supabase Auth Hooks, el middleware aplica fallback temporal a `miembro` para romper el loop con el menor nivel de acceso posible.

## 2026-06-25 — Abandono del hook JWT para roles

- Se abandonó la estrategia de leer `user_rol` desde el JWT en middleware.
- Motivo: en el entorno de desarrollo, el `Custom Access Token Hook` de Supabase no terminó inyectando el claim de rol de forma confiable en el access token consumido por la app.
- La solución final fue usar un cliente puntual con `SUPABASE_SERVICE_ROLE_KEY` dentro de `middleware.ts` para leer solo `public.usuarios.rol` por `session.user.id`, bypassando RLS únicamente para esa comprobación de autorización.
- Este cliente admin queda restringido al middleware y a una lectura mínima del rol; no se usa para escrituras ni se expone al frontend.

## 2026-06-25 — Cierre de Fase 0: lectura de perfil con service role

- La misma estrategia de `SUPABASE_SERVICE_ROLE_KEY` se extendió a `lib/auth.ts` para `getCurrentUser()`, de modo que el shell visual y el middleware lean el rol desde la misma fuente de verdad.
- Razón arquitectural: en este entorno `auth.uid()` resultó inconsistente o `null` fuera de un contexto de sesión activa confiable en algunos Server Components, lo que hacía que la lectura de `public.usuarios` cayera en RLS y degradara el shell a permisos de `miembro`.
- La decisión final de Fase 0 es usar el cliente SSR únicamente para validar sesión y usar un cliente admin acotado para leer `public.usuarios` en `middleware.ts` y `lib/auth.ts`.
- El alcance del bypass queda deliberadamente limitado a lecturas internas de autorización/perfil. No se usa para escrituras ni para exponer datos al cliente.

## 2026-06-25 — Hooks cliente vía API routes

- Se abandonó la estrategia híbrida de consultar Supabase directamente desde hooks cliente para `leads`.
- Motivo: en browser, `useLeads()` y `useInboundLeads()` estaban recibiendo errores `500` por RLS al consultar `public.leads` con el cliente público.
- La decisión final es que `useLeads()`, `useInboundLeads()` y `useClientes()` usen `fetch` contra `app/api/*` como única vía de lectura y escritura.
- Las API routes quedan como intermediario server-side y resuelven el acceso con `SUPABASE_SERVICE_ROLE_KEY`, evitando fricción de RLS en el contexto browser.
- Esto sacrifica realtime directo desde Supabase en cliente, pero deja una estrategia consistente y confiable para los módulos admin del sistema.

## 2026-06-26 — Proyectos: clientes y nombres resueltos en servidor

- La página `/proyectos` obtiene la lista mínima de clientes (`id`, `empresa`, `estado`) desde servidor con `service_role`, en vez de depender de `useClientes()` en browser.
- Motivo: el módulo de Clientes sigue siendo admin-only, pero Proyectos es accesible también para miembros y necesita mostrar nombres de cliente sin exponerse a fallas de RLS en el cliente.
- El módulo de Proyectos usa `useProyectos()` y `useFeatures()` solo para operaciones de entrega y administración de features; la selección y visualización de clientes se resuelve en la página server del route group.
- Esta decisión mantiene la UX del split view sin acoplar el módulo de ENTREGA al ciclo de permisos del módulo de Clientes.

## 2026-06-25 — Parsing de contexto del Cotizador

- Los adjuntos Excel y CSV se transforman a texto plano en cliente con `xlsx` (SheetJS), serializando cada hoja como bloques de CSV legibles para la IA.
- Se limitó la salida a `50.000` caracteres para no saturar el contexto del paso `1.6`; si el contenido excede ese tamaño, se trunca con una nota explícita.
- Los PDFs no se parsean localmente: se convierten a base64 y se guardan así en `adjuntos.contenido_texto`, para enviarlos después como document block a Claude API.
- El paso 2 del Cotizador persiste `contexto_chat` y `adjuntos` por autosave sobre la misma cotización, manteniendo el contexto acumulado como fuente de verdad antes de la generación con IA.

## 2026-06-25 — Preview PDF con print del browser

- El paso 4 del Cotizador usa renderizado HTML/CSS dentro del browser y exportación vía `window.print()` en lugar de generación server-side con `jsPDF` o `Puppeteer`.
- Motivo: reduce dependencias, evita infraestructura extra y mantiene un flujo simple donde el mismo preview visible es el que se exporta.
- La calidad se consideró suficiente para propuestas comerciales, especialmente usando layout A4 fijo, page breaks explícitos y estilos dedicados dentro de `@media print`.
- La Propuesta y el Roadmap se renderizan como documentos separados por tabs; al imprimir, solo se expone el tab activo mediante el contenedor `#pdf-preview-container`.

## 2026-06-26 — Seguridad del roadmap público

- La vista pública del roadmap se sirve por token único en `/roadmap/[token]`, sin autenticación de usuario.
- La API pública expone únicamente campos seguros para cliente: nombre del proyecto, estado, avance, fechas visibles y features agrupadas por fase.
- Quedan excluidos deliberadamente costos, valores, responsables, notas internas, credenciales y cualquier otro dato operativo sensible.
- La consulta exige `roadmap_publico_activo = true` además del `roadmap_token`, y la página pública devuelve `404` si el token no existe o el roadmap fue desactivado.
- Aunque el acceso real puede apoyarse en `service_role` o RLS por token, la respuesta queda recortada server-side a un shape público explícito para evitar filtraciones accidentales.

## 2026-06-26 — Cascada de aceptación con rollback manual

- La aceptación de una cotización se implementó en `app/api/cotizaciones/[id]/aceptar/route.ts` como un flujo server-side admin-only con `service_role`.
- Se eligió rollback manual con tracking explícito de IDs creados para `features`, `cobros`, `suscripciones`, `proyectos` y `clientes`, porque Supabase REST no ofrece transacciones nativas para este caso.
- El lead original también se revierte si la cascada falla después de actualizar sus notas o su etapa.
- La distribución de vencimientos de los cobros de hitos se hace proporcional al plazo total, dejando el primer hito con vencimiento en la fecha de aceptación.
- Si la cotización ya está aceptada, la route responde `400` y no vuelve a ejecutar la cascada.

## 2026-06-26 — Calendario propio y sync manual con Google

- El calendario se construyó con componentes y lógica de fechas propios, sin librerías externas como `react-big-calendar`, para mantener la misma gramática visual del design system en las vistas mensual, semanal y diaria.
- Los eventos del calendario se resuelven en server con una API agregadora que unifica `eventos`, `tareas` y recordatorios de `leads` sin duplicar la fuente de verdad de cada módulo.
- La sincronización con Google Calendar quedó en una primera iteración manual: iniciar OAuth, guardar el token cifrado en `usuarios.google_calendar_token` y ejecutar `Sincronizar ahora` desde la UI.
- El token de Google se cifra del lado servidor antes de persistirlo, usando un helper local AES-GCM para mantener la tabla de usuarios sin exponer credenciales en claro.
- La automatización periódica cada 5 minutos mediante `pg_cron`/webhooks se dejó documentada como siguiente paso de infraestructura, pero no se implementó en este avance.

## 2026-06-26 — Finanzas: runway, cobros recurrentes y charts

- El runway se calculó como `caja_actual / quema_neta` solo cuando `quema_neta > 0`; si la quema es nula o negativa, el runway se considera no aplicable.
- La quema neta se definió como el promedio de `(egresos - ingresos)` de los últimos 3 meses, para suavizar variaciones puntuales y obtener una lectura más estable.
- Los cobros recurrentes se generan manualmente con un endpoint server-side que recorre suscripciones activas vencidas y avanza `proxima_cobro` un mes en cada ciclo; ese endpoint es el que luego se enchufará a `pg_cron`.
- La activación de una suscripción pendiente crea el primer cobro de mantenimiento y deja el próximo cobro calculado para el mes siguiente, manteniendo la suscripción como fuente de verdad.
- Los gráficos del módulo Finanzas se implementaron sobre una capa compatible con `recharts`, para conservar una API de charts estándar y mantener aislado el layout visual del dominio financiero.

## 2026-06-26 — Dashboard: métricas calculadas y gráficos

- El Dashboard se implementó como una route admin-only que calcula Comercial, Financiero y Entrega desde las tablas existentes, sin permitir carga manual de métricas.
- El selector de período (`mes`, `trimestre`, `año`) se resuelve server-side vía query param para que el payload de métricas llegue ya agregado desde una sola fuente de verdad.
- Los gráficos del Dashboard reutilizan la misma estrategia de `recharts` adoptada en Finanzas, para mantener consistencia visual y bajar el costo de mantenimiento del sistema de charts.
- La API del Dashboard devuelve un objeto único con métricas de negocio, serie de runway y lectura de capacidad de entrega, de modo que la UI solo consume y presenta datos ya calculados.

## 2026-06-27 — Automatizaciones recurrentes con pg_cron y Edge Functions

- Las automatizaciones recurrentes se separaron en Edge Functions en `supabase/functions/` y jobs de `pg_cron` en migraciones SQL, para que el despliegue sea declarativo y fácil de auditar.
- `cobros-mensuales` crea cobros de mantenimiento, agenda un recordatorio y avanza `proxima_cobro`; `marcar-vencidos` marca vencidos los cobros atrasados.
- El trigger de features recalcula `proyectos.avance_pct` directamente en la base, mientras que el recordatorio de leads crea un evento cuando un toque pasa a hecho.
- El estado de completitud de fase del roadmap público quedó como cálculo de lectura y no como trigger persistido, para evitar duplicar estado derivado.
- `sync-google-calendar` se dejó como stub documentado hasta que la sincronización bidireccional completa quede consolidada en un runtime compartido.
- Los cron jobs quedaron definidos en SQL con placeholders explícitos para `YOUR_PROJECT_REF` y `YOUR_SERVICE_ROLE_KEY`, para que el usuario los active manualmente con la configuración real del proyecto.
- El calendario agregado deduplica recordatorios de leads cuando ya existe un evento generado por trigger, para evitar que el mismo seguimiento aparezca dos veces en la UI.

## 2026-06-27 — Preparación de producción y Vercel

- La configuración de Next se mantiene en `next.config.mjs` en lugar de introducir `vercel.json`, porque los `maxDuration` necesarios ya se resuelven por route handler y la app no necesita otra capa de despliegue para compilar.
- Se agregaron headers básicos de seguridad globales desde Next, con una excepción explícita para `/roadmap` para no bloquear potenciales embeds del roadmap público.
- Se permitió el dominio de Supabase en `images.remotePatterns` para que futuras cargas remotas desde storage no requieran otro cambio de configuración.
- El link público del roadmap sigue usando `window.location.origin`, así que adopta automáticamente el dominio que entregue Vercel sin hardcodear URLs de producción.

## 2026-06-27 — Cotizador: prompt de generación más rico

- La generación de módulos del Cotizador ahora usa un system prompt más específico sobre Blyndtek, el tipo de clientes y el nivel de granularidad esperado, para evitar módulos vagos o genéricos.
- El prompt también fuerza una estructura más comercial para el resumen ejecutivo, dirigida al decisor del negocio y sin lenguaje técnico.
- El alcance se calibra con `precio_total`, `plazo_semanas` y `rubro` asociado a la cotización, para que la IA produzca propuestas realistas al presupuesto y al tiempo disponibles.
- El parseo de la salida de Claude se robusteció para limpiar fences ```json, reintentar extrayendo el bloque entre la primera `{` y la última `}`, y registrar la respuesta cruda si el JSON no se puede interpretar.

## 2026-06-27 — Cotizador: propuesta comercial completa

- La generación con Claude pasó de producir solo módulos + resumen ejecutivo a escribir toda la narrativa comercial de la propuesta: entendimiento, beneficios, módulos, justificación de precio, diferenciadores y detalle de mantenimiento.
- El prompt ahora está orientado explícitamente a un redactor comercial y no a un arquitecto técnico, con foco en valor de negocio, lenguaje cercano y alcance realista según presupuesto/plazo.
- El paso 3 del Cotizador expone editores inline para ajustar cada una de esas secciones antes de exportar, preservando el autosave como fuente de verdad.
- Si Claude devuelve JSON parcial o inválido, la route completa los campos faltantes con un fallback comercial seguro para no dejar la cotización en un estado incompleto.

## 2026-06-27 — Propuesta PDF más editorial

- La propuesta PDF se rediseñó con un punto medio entre brochure y documento plano: jerarquía clara, secciones numeradas, kickers en signal y un footer repetido por página para reforzar identidad y contexto.
- Se priorizó la legibilidad comercial sobre la densidad visual: secciones condicionales, separación por bordes sutiles y sin sombras para que el documento imprima limpio en A4.
- Los beneficios se renderizan con iconografía simple embebida en SVG y las secciones vacías se omiten para evitar huecos o ruido visual.

## 2026-06-29 — Shell flotante y UX por nombre

- El shell autenticado quedó rearmado como un panel flotante: el área de contenido vive sobre un `canvas` neutro (`#E4E7EC`) y se contiene en un panel blanco con `rounded-card`, `shadow-soft` y margen perimetral, para que toda la app respire más y no quede pegada borde a borde.
- La topbar quedó integrada dentro de ese panel flotante como header interno del contenido, en lugar de quedar fuera como barra global separada.
- Se incorporó `EntitySelect` como selector reusable searchable por nombre, y el principio general pasó a ser que ningún formulario del sistema pide UUIDs manuales; los IDs se resuelven por detrás a partir de selecciones legibles.
- Para selección múltiple se agregó una variante `EntityMultiSelect`, usada sobre todo en asignación de devs y otros campos multivalor.
