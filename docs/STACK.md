# Blyndtek OS — Stack tecnológico

Documento canónico del stack técnico de Blyndtek OS. Las versiones salen de package.json. Las decisiones históricas salen de docs/DECISIONS.md y docs/METHODOLOGY.md.

## 1. Base de la aplicación

| Tecnología | Versión o configuración real | Rol | Por qué se usa |
| --- | --- | --- | --- |
| Next.js | 14.2.35 | Framework web y routing con App Router | Unifica páginas, layouts, Server Components y Route Handlers. |
| React | 18.3.1 | UI | Base de los componentes y vistas interactivas. |
| TypeScript | 5.4.5, strict true | Tipado estático | Reduce errores de contrato entre Supabase, APIs, hooks y componentes. |
| Tailwind CSS | 3.4.17 | Sistema visual | Permite aplicar los tokens de Blyndtek sin sumar una librería de UI externa. |
| Supabase | supabase-js 2.108.2 y ssr 0.12.0 | Postgres, Auth, RLS y acceso server/browser | La base y autenticación son la fuente operativa; las policies protegen el acceso. |
| Vercel | vercel.json con framework nextjs | Deploy y funciones serverless | Es el entorno de producción del App Router y Route Handlers. |
| Node.js | >=18.17 | Runtime declarado | Es el mínimo requerido por package.json. |

### Servicios de Supabase

- Postgres es la fuente de verdad de leads, clientes, proyectos, finanzas, contenido, diagnóstico y configuración.
- Auth gestiona sesión y autenticación.
- RLS protege tablas cuando se accede con el contexto de usuario.
- Edge Functions viven en supabase/functions/ para tareas como cobros mensuales, marcar vencidos y sincronizar Google Calendar.
- pg_cron programa las tareas recurrentes cuando corresponde.

## 2. IA e integraciones

| Integración | Implementación real | Rol | Criterio |
| --- | --- | --- | --- |
| Claude API | fetch a https://api.anthropic.com/v1/messages | Diagnósticos, propuestas, agentes, checklist y contenido | No hay SDK de Anthropic instalado. Las respuestas se tipan y validan; el modelo canónico es claude-sonnet-4-6. |
| Higgsfield | @higgsfield/client 0.2.1 | Fondos visuales de Content Studio cuando el tipo lo permite | Se usa el SDK oficial y credenciales Key ID:Secret, no Bearer. |
| Google Calendar | función sync-google-calendar y APIs de calendario | Sincronización de eventos | Mantiene eventos externos conectados con el calendario operativo. |
| Meta Marketing API | Graph API v26 server-side, sólo lectura | Campañas, conjuntos, anuncios, creatividades, insights diarios, reglas y cola de aprobación | El token vive en Vercel; el CRM cachea métricas, genera alertas y prepara acciones auditables, pero nunca cambia campañas automáticamente. |

## 3. Librerías aprobadas

Dependencias de producción instaladas y sus roles:

| Librería | Versión | Uso |
| --- | --- | --- |
| lucide-react | ^1.25.0 | Única fuente de iconografía, centralizada en components/ui/icons.tsx. |
| recharts | ^3.9.2 | Gráficos financieros, comerciales y de agentes, con lib/charts/chartTheme.ts. |
| @tiptap/react | ^3.27.3 | Edición rica. |
| @tiptap/starter-kit | ^3.27.3 | Base de extensiones de TipTap. |
| @tiptap/extension-image | ^3.27.3 | Imágenes del editor. |
| @tiptap/extension-placeholder | ^3.27.3 | Placeholder del editor. |
| @tiptap/extension-task-item | ^3.27.3 | Ítems de checklist. |
| @tiptap/extension-task-list | ^3.27.3 | Listas de tareas. |
| react-markdown | ^10.1.0 | Render controlado de Markdown. |
| pdfkit | ^0.19.1 | Compatibilidad histórica para PDFs server-side; debe usar fuentes estáticas propias. |
| xlsx | ^0.18.5 | Lectura de Excel/CSV para convertir adjuntos en contexto textual. |
| @supabase/ssr | ^0.12.0 | Sesión y cookies SSR. |
| @supabase/supabase-js | ^2.108.2 | Cliente Supabase tipado en helpers server y runtimes compatibles. |

## 4. Librerías prohibidas

No se usan kits externos de UI como MUI, Chakra UI, Ant Design, shadcn/ui u otros equivalentes. No hay una dependencia de UI instalada: los componentes se construyen sobre Tailwind y components/ui para preservar tokens y comportamiento propios.

Esto no prohíbe librerías de dominio justificadas como TipTap, Recharts, SheetJS o Higgsfield. La prohibición aplica a kits que introduzcan botones, modales, tablas, temas o estilos paralelos.

## 5. Restricciones técnicas duras

### Middleware y Edge Runtime

El proyecto no usa middleware.ts. Hubo cuatro caídas de producción relacionadas con APIs de Node, imports indirectos y middleware Edge; la decisión final fue eliminar ese punto de fallo y proteger el shell desde layout/server y helpers compatibles. No se reintroduce middleware sin decisión explícita y prueba real en Vercel.

### Fechas sin hora

Los campos Postgres DATE viajan end-to-end como strings YYYY-MM-DD. No se usa new Date("YYYY-MM-DD") ni toISOString() para persistirlos. Para mostrar o comparar se usa lib/utils/fechas.ts o una fecha local construida con sus componentes.

### Satori/ImageResponse

Satori recibe fuentes estáticas por peso, como los archivos separados de DM Sans en public/fonts. No se usan fuentes variables: una fuente variable de Inter provocó errores de parseo en producción.

### Recharts

Los imports de Recharts salen únicamente del paquete principal recharts. Están prohibidas rutas internas como recharts/es6/... y recharts/lib/...; una mezcla de imports internos dejó gráficos en blanco.

### Secretos y PDFs

SUPABASE_SERVICE_ROLE_KEY, claves de Claude, Higgsfield y otras credenciales sólo viven en servidor. El browser consume Route Handlers y nunca recibe service role.

PDFKit no debe usar Helvetica implícita: en Vercel puede faltar data/Helvetica.afm. Los informes públicos priorizan impresión del mismo DOM; si se usa PDFKit, debe cargar fuentes estáticas del repositorio.

## 6. Deploy

- vercel.json está versionado y declara framework nextjs.
- El framework no puede quedar como Other: aunque next build terminaba, Vercel no exponía correctamente las rutas App Router y devolvía 404 NOT_FOUND.
- Los cambios de deploy se validan con npm run lint, npm run build y la ruta real publicada cuando afectan routing, auth, Edge o funciones serverless.

## 7. Criterio para nuevas dependencias

Una dependencia requiere justificación concreta, mantenimiento activo y compatibilidad con Next.js 14 y TypeScript estricto. Primero se revisa si la capacidad ya existe o se puede resolver con una abstracción propia. Se prefiere reutilizar lo presente; no se incorpora una librería de UI externa ni una dependencia que duplique un componente. Las decisiones arquitectónicas se registran en docs/DECISIONS.md.

## 8. Fuentes y brecha documental

Se revisaron package.json, docs/SPEC.md, docs/DATABASE.md, docs/DECISIONS.md, docs/METHODOLOGY.md, docs/DESIGN_SYSTEM.md y la estructura real. docs/SECURITY.md fue solicitado pero no existe en el checkout actual; queda pendiente crearlo antes de usarlo como fuente canónica de seguridad.
