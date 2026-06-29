# Blyndtek OS — Progress Log

Proyecto: Blyndtek OS

Stack: Next.js 14 (App Router) · TypeScript estricto · Tailwind CSS · Supabase (PostgreSQL + Auth + RLS + Edge Functions + pg_cron) · Vercel · Claude API (`claude-sonnet-4-6`) · Google Calendar API

Fecha de inicio: 2026-06-25

Estado general actual: Fase 0 completa. Cimientos técnicos listos: documentación fundacional, setup del repo, design system, shell de app y sistema de autenticación base. Las fases 1, 2 y 3 del roadmap original quedaron completadas.

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

- Archivos creados/modificados: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(app)/layout.tsx`, `app/(app)/outbound/page.tsx`, `app/(app)/inbound/page.tsx`, `app/(app)/clientes/page.tsx`, `app/(app)/cotizador/page.tsx`, `app/(app)/proyectos/page.tsx`, `app/(app)/tareas/page.tsx`, `app/(app)/calendario/page.tsx`, `app/(app)/finanzas/page.tsx`, `app/(app)/dashboard/page.tsx`, `app/roadmap/[token]/page.tsx`, `components/layout/Sidebar.tsx`, `components/layout/Topbar.tsx`, `components/layout/index.ts`, `types/navigation.ts`, `lib/navigation.ts`, `components/icons/` (íconos SVG inline), `app/page.tsx`.
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
  - `app/roadmap/[token]/page.tsx`
  - `app/roadmap/[token]/not-found.tsx`
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
