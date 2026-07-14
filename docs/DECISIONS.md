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

- La vista pública del roadmap se sirve por slug legible en `/roadmap/[slug]`, sin autenticación de usuario.
- La API pública expone únicamente campos seguros para cliente: nombre del proyecto, estado, avance, fechas visibles y features agrupadas por fase.
- Quedan excluidos deliberadamente costos, valores, responsables, notas internas, credenciales y cualquier otro dato operativo sensible.
- La consulta exige `roadmap_publico_activo = true` además del `roadmap_slug`, con fallback de compatibilidad por `roadmap_token`, y la página pública devuelve `404` si el slug no existe o el roadmap fue desactivado.
- Aunque el acceso real puede apoyarse en `service_role` o RLS por token, la respuesta queda recortada server-side a un shape público explícito para evitar filtraciones accidentales.
- El slug se genera a partir del nombre del cliente en kebab-case con un sufijo aleatorio corto, para evitar URLs adivinables sin exponer el UUID crudo.

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
- La detección de cobros vencidos se centralizó sobre `fecha_vencimiento + tolerancia_dias` para que UI, métricas y jobs compartan la misma definición de vencimiento real.

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

## 2026-07-09 — Sync bidireccional entre features y tareas

- Se decidió vincular cada feature del Lab con una tarea automática mediante `tareas.feature_id`, para que el trabajo técnico y la visualización de proyecto compartan la misma unidad de seguimiento.
- La sincronización quedó bidireccional y directa contra Supabase con `service_role`, no por HTTP, para evitar loops entre routes y mantener el avance del proyecto consistente.
- El estado se mapea entre ambos módulos de forma determinística: `pendiente ↔ nueva`, `en_curso ↔ en_proceso`, `lista ↔ terminada`.
- El recálculo de `proyectos.avance_pct` se centralizó en un helper compartido para que tanto el PATCH de features como la sync desde tareas usen la misma lógica.
- El drag & drop entre fases se reemplazó por un selector “Mover a fase” dentro de cada subtarea, porque el flujo real es más claro cuando la fase se cambia explícitamente y no por arrastre.
- La cascada de aceptación del Cotizador también crea la tarea vinculada por cada feature generada, para que el proyecto arranque con trabajo trazable desde el día uno.

## 2026-07-09 — Middleware Edge compatible con fetch nativo

- El middleware de Next debe consultar Supabase con `fetch` nativo cuando corre en Edge Runtime, en lugar de usar `@supabase/supabase-js`, porque esa librería depende de APIs de Node que no están disponibles allí y pueden disparar `ReferenceError: __dirname is not defined`.
- La lectura puntual del rol se hace contra la REST API de Supabase con `apikey` y `Authorization` del `service_role`, manteniendo el control de acceso por rol sin acoplar el middleware a una librería incompatible con Edge.

## 2026-07-09 — Proyectos: kanban por estado con fase como metadato

- Se revirtió la vista tipo Lab del tab `Features` a un kanban simple de 3 columnas por estado (`Pendiente`, `En curso`, `Lista`).
- La fase pasó a tratarse como metadato y filtro, no como la estructura visual principal del tablero.
- Motivo: este patrón es más consistente con `Tareas`, más fácil de operar en el día a día y evita sobrecargar la UI con columnas horizontales adicionales.
- El Lab queda deprecado como vista alternativa no usada, por si en el futuro se recupera como modo secundario dentro de `Roadmap` o de una vista de laboratorio.

## 2026-07-09 — Proyectos: fases como cards expandibles por estado

- El tab `Features` terminó usando fases completas como cards en un kanban de 3 columnas por estado, con expansión interna para ver el checklist de subtareas.
- Esta forma mantiene el patrón visual de kanban, pero preserva la organización temporal por fase y la edición más granular dentro de cada card.
- El roadmap público se dejó sin una frontera client innecesaria en su timeline visual, porque no tiene interacción propia y así se evita ruido de serialización entre Server Components y Client Components.

## 2026-07-10 — Proyectos: prioridad visual y checklist sin reasignación

- La prioridad de fase se mostró como un control inline liviano y su énfasis visual desaparece cuando la fase está en `lista`, para que la urgencia solo destaque mientras el trabajo sigue activo.
- El checklist de subtareas dejó de ofrecer reasignación de fase desde cada fila; la fase se considera fija una vez creada y el foco queda en avanzar el estado de la subtarea.
- La descripción de la fase se removió del kanban porque el detalle narrativo ya pertenece al tab `Roadmap`, evitando duplicar información en dos vistas distintas.

## 2026-07-10 — Tareas: navegación por proyecto y resiliencia del hook

- El vínculo cliente/proyecto en `TareaCard` se resolvió como texto clickeable que navega a `/proyectos?project_id=...`, para evitar duplicar una pill visual y llevar al usuario directo a la ficha correcta.
- `useTareas` ahora valida que la respuesta sea JSON antes de parsearla, para degradar mejor si algún entorno devuelve HTML inesperado en lugar de un payload de API.

## 2026-07-10 — Finanzas: runway y costos recurrentes

- Se centralizó la lógica de egresos de período en `lib/finanzas/calcularEgresosPeriodo.ts` para que P&L, burn rate y runway traten los egresos recurrentes como costos activos desde su fecha en adelante.
- El runway financiero quedó modelado con estados explícitos: `estable` cuando no hay quema neta, `agotado` cuando la caja ya no alcanza, y `normal` cuando todavía queda margen y tiene sentido mostrar meses restantes.
- `caja_actual` pasó a reflejar caja real, descontando solo egresos pagados y no egresos pendientes.
- El `Runway Lab` se implementó como simulación client-side: las hipótesis viven en estado local y solo se persisten al aprobar, donde se crean egresos reales por API.
- La aprobación del escenario no intenta transacciones simuladas; se asume persistencia secuencial por API y se refrescan métricas al final para reflejar el nuevo costo fijo mensual.

## 2026-07-11 — Sistema de archivos privado

- Los archivos se suben a Supabase Storage en un bucket privado y se guardan con `storage_path` que incluye un `uuid` en el nombre, para evitar colisiones entre archivos con el mismo nombre original.
- La descarga no expone el bucket como público: el backend genera una signed URL temporal de 60 segundos y redirige allí.
- La eliminación de archivos es primero soft-delete a papelera y recién después existe un borrado definitivo del objeto en Storage, para permitir restauración y reducir riesgo de pérdida accidental.
- Las carpetas automáticas de clientes y proyectos se crean al alta de la entidad y en el flujo de aceptación de cotización; si faltan carpetas históricas, un backfill admin puede reconstruirlas sin tocar datos existentes.

## 2026-07-10 — Finanzas: runway con MRR y escenarios por meses

- El runway financiero y del dashboard proyecta hacia adelante el MRR de suscripciones activas en lugar de basarse solo en cobros históricos, para reflejar mejor la caja real que entra todos los meses.
- El `Runway Lab` dejó de usar una fecha de inicio perpetua y ahora simula hipótesis por meses específicos seleccionados, de modo que cada costo se aplica solo en los meses marcados por el usuario.
- Al aprobar un escenario, se crean egresos reales por cada mes elegido, manteniendo la simulación client-side hasta que el usuario confirma.

## 2026-07-10 — Roadmap público: pagos visibles y credenciales detrás de PIN

- El roadmap público expone la URL del sistema y un resumen de pagos, pero mantiene las credenciales del cliente fuera de la respuesta inicial para no filtrarlas en HTML ni en props del Server Component.
- Las credenciales solo se recuperan tras un POST server-side con PIN correcto, de modo que el link público por sí solo no alcanza para ver datos sensibles.
- El PIN se valida contra `proyectos.roadmap_pin` y la respuesta del endpoint de credenciales solo entrega `credenciales_cliente` si el código coincide; en caso contrario, devuelve un error genérico.
- Esta separación evita que información sensible quede indexable, cacheada o visible por inspección del código fuente del roadmap público.

## 2026-07-10 — Progreso de proyecto por fase

- `avance_pct` se calcula como el promedio de todas las fases del proyecto.
- Si una fase no tiene subtareas, cuenta como `100%` solo cuando su `estado` es `lista`; en cualquier otro estado aporta `0%`.
- Si una fase sí tiene subtareas, su avance sale de `subtareas_lista / subtareas_totales`, sin depender del estado manual de la fase.
- Si un proyecto todavía no tiene fases, se conserva el `avance_pct` existente para no romper el comportamiento legado.

## 2026-07-10 — Finanzas: fórmula final de runway

- `mrr_activo` se define como la suma de `monto_mensual` de las suscripciones con `estado = 'activa'`.
- `costos_fijos_mensuales` se calcula como la suma de egresos recurrentes activos en el mes actual más el promedio de egresos no recurrentes de los últimos 3 meses.
- `neto_mensual = mrr_activo - costos_fijos_mensuales`.
- Si `neto_mensual >= 0`, el runway queda en `estable` y se muestra `Generás $[neto_mensual] USD/mes`.
- Si `neto_mensual < 0`, la quema neta es `abs(neto_mensual)` y el runway se calcula como `caja_actual / quema_neta`.
- Si `caja_actual <= 0`, el estado es `agotado`; si no, el estado es `normal`.
- `caja_actual` se calcula como `caja_inicial + cobros cobrados históricos - egresos pagados históricos`, sin descontar egresos pendientes.

## 2026-07-10 — Roadmap público: preview visual sin dependencias externas

- La preview visual del sistema en vivo usa el meta tag `og:image` del sitio del cliente, obtenido con fetch server-side y timeout, en vez de depender de un servicio de capturas de pantalla de terceros.
- Si el fetch falla, el sitio bloquea la solicitud, o no existe `og:image`, el endpoint devuelve `imagenUrl: null` y la UI cae a un fallback limpio sin romper el roadmap.
- Se cachea la extracción cuando es posible para evitar golpear el sitio del cliente en cada visita al roadmap público.

## 2026-07-10 — Finanzas: cartera por cliente

- El gráfico de cartera se construye solo con cobros de tipo `hito` y `one_pay`, porque representan contratos de desarrollo con saldo a cobrar.
- Los cobros de tipo `mantenimiento` y `brick` quedan fuera del agregado visual para no mezclar ingresos recurrentes con cartera de proyectos.
- La visualización agrupa por cliente y ordena por tamaño del contrato, para priorizar primero las cuentas más grandes.

## 2026-07-10 — Finanzas: cajas administrables y slug histórico

- `cajas` pasa a ser la fuente de verdad para medios de cobro/pago porque permite crear, renombrar, activar y desactivar sin tocar el histórico.
- La eliminación real de una caja se considera soft-delete cuando hay movimientos: si existe uso histórico, la caja se desactiva para no romper trazabilidad ni referencias.
- `cobros.cuenta_medio` y `egresos.cuenta_medio` siguen guardando texto con el slug de la caja, en vez de una FK, para mantener compatibilidad con datos ya cargados y evitar cascadas frágiles sobre registros históricos.
- La UI resuelve los nombres de caja desde la tabla `cajas`, pero conserva el slug como identificador de escritura para que el backend siga siendo simple y estable.

## 2026-07-10 — Finanzas: tarjetero de solo referencia

- `tarjetas` almacena únicamente datos de referencia rápida: alias, banco, titular, últimos 4 dígitos, vencimiento, tipo, uso habitual y notas.
- No se guarda el PAN completo ni el CVV para reducir superficie de exposición y alinearse con buenas prácticas PCI-DSS.
- El número completo de la tarjeta debe permanecer en el gestor de contraseñas del equipo, fuera de la base de datos de la aplicación.

## 2026-07-10 — Roadmap público: sin auto-preview del sistema

- Se descartó el auto-preview visual del sistema en vivo porque los sistemas con autenticación no exponen un `og:image` público confiable.
- El roadmap público se queda con el fallback final de dominio + link directo, que es estable, simple y no depende de capturas externas ni de rutas públicas especiales.

## 2026-07-10 — Tiempo trabajado por fase

- Se restringe a una sola sesión activa por usuario para evitar solapamientos de tiempo y mantener una única fuente de verdad en el cronómetro global.
- La métrica de tiempo es pura y no impacta Rentabilidad ni ningún cálculo financiero; sirve solo para seguimiento operativo del trabajo por fase/proyecto.

## 2026-07-11 — Shell con dock flotante estilo macOS

- Se reemplazó el sidebar lateral por un dock flotante inferior estilo macOS para liberar ancho horizontal en toda la app.
- La navegación se mantiene centralizada en `lib/navigation.ts`, pero ahora se presenta en una sola fila sin secciones visibles.
- El logo de marca se reubicó en la topbar para evitar depender del sidebar como punto fijo de identidad visual.
- El avatar de usuario pasó a abrir un dropdown con perfil y cierre de sesión, en lugar de dejar el logout en el pie del sidebar.
- `Sidebar.tsx` quedó como implementación deprecada por compatibilidad y eventual reversión, pero ya no participa del shell activo.

## 2026-07-11 — Finanzas: Runway Lab como tab propia

- El Runway Lab pasó de un modal disparado desde Resumen a una tab propia para que la simulación quede siempre accesible como una vista completa del módulo.
- Se agregó un toggle por hipótesis para activarla o desactivarla localmente y comparar escenarios sin perder el trabajo ya cargado.
- Las hipótesis activas son las únicas que se persisten al aprobar; las inactivas quedan solo como parte del escenario de simulación.
- La comparación visual reutiliza el lenguaje de gráficos ya validado en Finanzas: barras sólidas para la serie base y una línea de escenario distinguible, con tooltip que sigue el mouse.

## 2026-07-11 — Dashboard protagonista en Financiero

- La sección Financiero se decidió como protagonista del dashboard para que la foto más importante del negocio quede arriba y ocupe el mayor peso visual.
- Comercial y Entrega se presentan como bloques completos secundarios, pero sin competir con el bloque financiero principal.
- El dashboard reutiliza directamente `PLChart` y el lenguaje visual de Finanzas en lugar de duplicar gráficos o crear variantes paralelas, para mantener consistencia y reducir mantenimiento.
- Para evitar que un período anterior pise el seleccionado más reciente, `useDashboard` aborta solicitudes viejas y descarta respuestas fuera de fecha.

## 2026-07-12 — Notas con TipTap y JSON estructurado

- TipTap se eligió como motor de edición porque es headless y permite construir la UI completa con Tailwind sin depender de componentes visuales ajenos al sistema.
- El contenido de las notas se guarda como JSON estructurado en vez de HTML crudo para conservar semántica, facilitar autosave y evitar depender de sanitización visual en el front.
- Las notas pueden vincularse opcionalmente a clientes, proyectos o leads sin romper el flujo de edición o navegación del resto de la app.

## 2026-07-12 — Notas: imágenes pegadas por proxy autenticado y paleta post-it

- Las imágenes pegadas o arrastradas dentro de Notas se sirven a través de un endpoint proxy autenticado del sistema, en vez de signed URLs temporales o bucket público.
- La razón es evitar expiración de enlaces y mantener el bucket privado sin sacrificar la posibilidad de pegar capturas directo en el editor.
- Los colores `postit` (`amarillo`, `rosa`, `celeste`, `verde`, `violeta`) se definieron como una paleta separada de la semántica global del design system y quedan reservados exclusivamente para el feature de Notas.
- El color ya no vive en la nota individual: ahora pertenece a la etiqueta reutilizable (`notas_etiquetas`) para que el mismo tag mantenga una representación consistente en toda la app.

## 2026-07-12 — Reversión del Dock

- Se revirtió el dock horizontal flotante y se volvió al sidebar lateral original porque el usuario prefirió el patrón clásico de navegación.
- `Dock.tsx` queda conservado como código deprecado para retomar la idea en el futuro si se decide reintentar.

## 2026-07-12 — SaaS separado por producto

- Se separó el SaaS de los clientes de desarrollo a medida usando `suscripciones.producto_id`, en vez de duplicar o especializar la tabla `clientes`.
- Esto permite extender productos SaaS, métricas y roadmap por producto sin tocar el modelo de clientes existente.
- La tabla `clientes` sigue representando clientes de la agencia / desarrollo a medida; el vínculo al producto vive en `suscripciones` porque esa es la unidad natural de cobro recurrente.

## 2026-07-12 — Editor compartido entre Notas y Wiki

- Se extrajo el editor enriquecido a `components/shared/RichTextEditor.tsx` para reutilizar el mismo TipTap entre Notas y Wiki.
- La UI de edición sigue siendo headless y se estiliza completamente con Tailwind, sin introducir una segunda implementación paralela de TipTap.
- Esto reduce deriva visual y de comportamiento entre módulos que usan el mismo patrón de texto enriquecido.

## 2026-07-12 — Regla global: no repetir headers nuevos

- La regla de eliminar títulos/subtítulos redundantes debajo de la topbar aplica a todo módulo nuevo que se construya de acá en adelante, sin excepción.
- La topbar ya identifica la sección actual, así que ningún módulo nuevo debe repetir su nombre como `h1` o `h2` grande en el contenido principal.
- Esto se aplica también a ajustes futuros sobre módulos ya creados: si un panel vuelve a introducir un título redundante, se elimina en favor de la primera fila funcional del flujo.

## 2026-07-12 — Archivos: iconos por tipo y acciones abiertas/descarga separadas

- Para archivos que no son imagen se prefieren iconos grandes por tipo en la vista galería, en vez de intentar previsualizar el contenido real.
- Esto evita renderizado server-side pesado y mantiene la UI rápida y consistente para documentos, planillas y PDFs.
- La acción primaria de un archivo es "abrir" con comportamiento nativo del navegador, mientras que "descargar" fuerza `Content-Disposition: attachment`.
- Esa separación deja claro cuándo el usuario quiere previsualizar y cuándo necesita guardar el archivo explícitamente.

## 2026-07-13 — Gráficos premium: profundidad visual sin cambiar la lógica

- La decisión anterior de usar barras planas queda reemplazada por pedido explícito del usuario: los gráficos deben poder mostrarse a clientes y sentirse modernos, con una estética de producto premium.
- Las series mantienen su significado semántico y la paleta de Blyndtek (`signal`, `danger`, `success`, `warning`), pero pueden usar gradientes sobrios, sombras SVG suaves y superficies de gráfico más cuidadas cuando eso mejore la percepción visual.
- `CarteraClientesChart` queda como referencia aprobada: limpio, con buena jerarquía y sin ruido. El resto de los gráficos debe acercarse a ese nivel de pulido sin tocar cálculos ni endpoints.
- Los gradientes no son decorativos libres: se usan solo dentro de gráficos, con lógica semántica y contraste suficiente; navegación, formularios y UI estructural siguen sin gradientes decorativos.
- Todos los imports de `recharts` deben salir del paquete principal `recharts`; no se usan rutas internas como `recharts/es6/...` o `recharts/lib/...`.
- `MetricaCard` se mantiene como tarjeta reutilizable con ícono circular de color para reforzar lectura rápida de métricas sin crear componentes paralelos.

## 2026-07-13 — Checklist de QA como gate antes de mover una fase a Lista

- Para pasar una fase a `lista`, la checklist de QA ahora funciona como condición de calidad obligatoria cuando existe al menos un ítem generado o agregado manualmente.
- La checklist puede arrancar desde Claude con JSON estructurado, pero sigue siendo editable por el usuario para cubrir casos que la IA no contempló.
- El gate vive en el backend para bloquear el cambio de estado aunque el drag sea optimista en la UI, lo que deja la regla independiente de quién escribió el código o generó la checklist.
- Esta base queda lista para integrar más adelante disparos automáticos de QA con Claude Code sin cambiar la regla de negocio.

## 2026-07-13 — AI Dev orquestado por webhook compartido y costo estimado

- El webhook de AI Dev se autentica con un secreto compartido entre Blyndtek OS y el workflow de GitHub Actions, en vez de montar un flujo OAuth completo.
- Esa decisión encaja con el uso interno acotado del sistema y simplifica la puesta en marcha del piloto sin añadir complejidad operativa innecesaria.
- El costo estimado por ejecución usa el precio de Sonnet como aproximación aunque el flujo pueda mezclar modelos distintos; queda documentado como estimación no exacta para seguimiento interno, no como facturación real.
- La corrida queda persistida en `ai_dev_ejecuciones` y el tiempo consumido en `sesiones_tiempo` con `es_ia = true`, de modo que el historial de trabajo y el tracking operativo queden separados del tiempo humano.

## 2026-07-13 — Comisiones configurables al aceptar cotización

- El modelo de comisión se calcula al aceptar la cotización, no de forma progresiva con los cobros.
- La base, tiers y bono viven en `config_comisiones` para evitar hardcodear porcentajes o pisos y permitir ajustes de negocio sin tocar el código.
- Cuando el cliente resultante tiene `vendedor_id`, se genera un registro en `comisiones` con estado pendiente y luego puede marcarlo pagado sólo admin.
- `supervisor_id` en `usuarios` queda preparado para una futura jerarquía comercial, pero sin lógica activa todavía para no mezclar responsabilidad con la comisión actual.
- Al pagarse una comisión, se crea un egreso real trazable vía `comision_id` para que el costo de ventas impacte P&L, runway y tesorería con criterio cash basis.
- Mientras la comisión siga pendiente, no afecta runway ni caja real hasta que efectivamente se pague y se refleje en `egresos`.

## 2026-07-14 — Leads con captura progresiva por etapa y cierre ganado

- La captura de datos del lead se hace de forma progresiva según la etapa del kanban en vez de exigir un formulario único de cierre.
- La etapa `ganado` se ubica antes de `descartado` y al cerrar el lead se reutiliza la conversión a cliente para mantener una sola fuente de verdad.
- Si hubo negociación, el historial queda guardado en `leads_negociaciones` y el monto final acordado es el que alimenta el cálculo de comisión, no el propuesto original.
- La comisión se calcula sobre el monto total del cierre (desarrollo + mensual) y conserva la misma lógica centralizada de `lib/comisiones/calcular.ts`.

## 2026-07-14 — Middleware Edge blindado y autocontenido

- Decisión final luego de cuatro caídas de producción: el proyecto no usa `middleware.ts`. Se eliminó el Edge middleware por completo para que Vercel no genere una Edge Function capaz de arrastrar APIs Node incompatibles (`__dirname`, `process.version`, etc.).
- La protección básica de rutas autenticadas vive en el layout server de `app/(app)/layout.tsx`: si `getCurrentUser()` no devuelve usuario, se redirige a `/login`.
- Queda prohibido reintroducir `middleware.ts` sin una decisión explícita nueva. La prioridad operativa es que la app no tenga un punto único de caída en Edge Runtime.
- Si en el futuro se vuelve a necesitar un guard global, debe implementarse fuera de Edge o con una prueba de deploy real en Vercel antes de considerarlo cerrado.
- Las entradas históricas anteriores que recomendaban `@supabase/ssr` en middleware quedan obsoletas para este proyecto: Supabase puede usarse en Server Components, API routes y helpers Node, pero no desde un middleware Edge.

## 2026-07-14 — Vercel configurado explícitamente como Next.js

- El proyecto de Vercel debe declarar `framework = nextjs`. Mantenerlo como `Other` permite que `next build` termine correctamente, pero deja la salida sin las funciones App Router y produce un `404 NOT_FOUND` en todas las rutas.
- La configuración queda versionada en `vercel.json` para evitar que una configuración manual o una recreación del proyecto vuelva a publicar el repositorio como sitio estático.

## 2026-07-13 — Runway Lab con ingresos pendientes opcionales

- El runway conserva el modo conservador por defecto, pero ahora puede sumar cobros pendientes y suscripciones pendientes cuando el usuario lo activa explícitamente.
- Los pendientes sin fecha esperada se excluyen del cálculo en vez de asumir un mes arbitrario, para no inflar la proyección con datos inventados.
- El `Runway Lab` presenta esa decisión como un switch visible, y la misma regla queda disponible también desde el endpoint `GET /api/finanzas/runway`.
- Las hipótesis de costo siguen sumándose sobre la base elegida, sin cambiar su lógica ni mezclar el tratamiento de ingresos con el de escenarios.
