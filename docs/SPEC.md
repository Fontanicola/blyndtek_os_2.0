# Blyndtek OS — Especificación Funcional

## Arquitectura general

Tres áreas: COMERCIAL (Outbound, Inbound, Cotizador, Clientes) · ENTREGA (Proyectos, Tareas, Calendario) · CONTROL (Finanzas, Dashboard).

Principio: un solo dato, cargado una vez, que fluye por las tres áreas. Nada se duplica.

## Módulo 1 — Outbound

### Descripción

Prospección en frío. Relacional, en kanban.

### Vistas

- Kanban (default, columnas por etapa, tarjetas arrastrables)
- Tabla (filtrable por rubro/ubicación/responsable)

### Funcionalidades

- Alta rápida desde cualquier vista
- Registro de toques (llamada, seguimiento 1, seguimiento 2: fecha + checkbox hecho)
- Al marcar un toque agenda recordatorio del próximo automáticamente
- Botón "Pasar a cotización" que crea una Cotización precargada con los datos del lead
- Filtros por rubro/ubicación/responsable/etapa
- Vista de "vencidos" (leads sin toque en X días)

### Etapas del kanban

Por contactar → Contactado → En seguimiento → Calificado → Pasado a cotización → Descartado.

## Módulo 2 — Inbound

### Descripción

Referidos de confianza. Pocos, calientes, full info. Misma entidad leads con canal = inbound, vista diferente.

### Vista

- Lista de fichas ricas (cada lead con ficha expandida con toda la info; no es kanban de volumen)

### Funcionalidades

- Alta con ficha completa (empresa, contacto, referido por, relación, nivel de confianza, contexto, presupuesto)
- Historial de conversaciones (notas con fecha)
- Botón "Pasar a cotización"
- Filtro por nivel de confianza y estado

### Nota

Usa la misma tabla leads. Los campos `referido_por`, `relacion` y `nivel_confianza` son exclusivos de inbound.

## Módulo 3 — Clientes

### Descripción

La bisagra. Vista 360° de cada cliente activo. Nace de un lead ganado.

### Vista

- Ficha de cliente con tabs: Datos generales · Proyectos · Cobros · Suscripción · Historial

### Funcionalidades

- Datos de empresa y contactos
- Ver proyectos activos y terminados
- Ver cobros (one-pay + mensuales) y estado de cada uno
- Ver suscripción de mantenimiento + botón de activación manual
- Historial completo

## Módulo 4 — Cotizador (núcleo del sistema)

### Descripción

Genera Propuesta + Roadmap automáticamente. Al aceptarse dispara la cascada que monta todo el proyecto.

### Submódulo 4.1 — Formulario de parámetros

#### Funcionalidades

- Cliente o lead vinculado
- Precio total (USD)
- Hitos de pago (nombre + %, dinámicos, validación que sumen 100%)
- Mantenimiento mensual (USD)
- Plazo de desarrollo (semanas)

### Submódulo 4.2 — Chat de contexto + adjuntos

#### Funcionalidades

- Chat libre para describir el sistema
- Adjuntar archivos
- Excel/CSV → SheetJS lo parsea a texto y lo suma al contexto
- PDF → se manda como documento base64 a la API de Claude
- Los archivos alimentan la generación con IA

### Submódulo 4.3 — Módulos dinámicos (IA)

#### Funcionalidades

- La IA lee contexto + archivos y propone los módulos a construir
- Cada módulo tiene nombre, descripción corta, features incluidas
- El usuario edita (agrega/saca/renombra) antes de confirmar
- Los módulos confirmados se guardan como features del proyecto al aceptarse
- Las cotizaciones cerradas acumulan historial de módulos usados (sugerencias futuras por rubro, no lista fija)

### Submódulo 4.4 — Preview de PDFs

#### Vistas

- Dos pestañas: Propuesta y Roadmap

#### Propuesta

- Portada
- Resumen ejecutivo (IA)
- Alcance funcional
- Stack
- Inversión (hitos)
- Mantenimiento
- Condiciones
- Cierre

#### Roadmap

- Cronograma por semanas (gantt)
- Fases
- Hitos de pago

#### Funcionalidades

- Todo se actualiza en vivo al cambiar parámetros
- Botón exportar PDF (print to PDF del browser)

### Submódulo 4.5 — Cascada al marcar "Aceptada"

#### Automatizaciones

- Lead → ganado
- Cliente → creado o actualizado
- Proyecto → creado con módulos como features y roadmap desde el plazo
- Suscripción → creada en estado pendiente (no genera cobros hasta activación manual)
- Cobros → creados los hitos con sus vencimientos en Finanzas, estado pendiente
- Link público del roadmap → generado (token único, read-only)

## Módulo 5 — Proyectos

### Descripción

El desarrollo vivo.

### Submódulo 5.1 — Ficha del proyecto

#### Funcionalidades

- Datos generales (cliente, estado, responsable, devs asignados)
- Fechas (inicio, entrega comprometida, entrega real)
- Avance % (calculado desde features)
- Valor total y esquema de cobro (referencia)
- Notas de arquitectura/base de datos

### Submódulo 5.2 — Features (kanban)

#### Vistas

- Columnas Pendiente · En curso · Lista

#### Funcionalidades

- Cada feature tiene nombre, fase del roadmap, responsable, descripción
- Al completar features se recalcula el avance % del proyecto
- Al completar todas las features de una fase, esa fase del roadmap se marca como completada

### Submódulo 5.3 — Cuentas y servicios

#### Funcionalidades

- Lista de servicios usados (Vercel, Supabase, ARCA, WhatsApp API, etc.)
- Campos servicio, para qué, email/cuenta, notas de acceso
- Solo visible para admin (credenciales sensibles)

### Submódulo 5.4 — Roadmap público

#### Vista

- Vista simplificada del avance por fases (sin datos internos ni costos)

#### Funcionalidades

- URL pública con token único (`blyndtek.com/roadmap/[token]`)
- Se actualiza en tiempo real
- Sin login para el cliente

## Módulo 6 — Tareas

### Descripción

El trabajo del día a día. Kanban simple conectado al calendario.

### Vista

- Kanban (Nueva · En proceso · Terminada)

### Funcionalidades

- Filtro por proyecto/responsable/prioridad
- Alta rápida desde la barra de cualquier módulo
- Vinculación a proyecto (opcional)
- Prioridad alta/media/baja
- Fecha límite → aparece automáticamente en Calendario
- Archivar tareas terminadas

## Módulo 7 — Calendario

### Descripción

Agenda unificada del equipo, sincronizada con Google Calendar.

### Vista

- Mensual/semanal/diaria
- Color por tipo de evento (seguimiento, tarea, vencimiento de cobro, reunión)

### Funcionalidades

- Sincronización bidireccional con Google Calendar por usuario (OAuth)
- Los eventos creados en el sistema aparecen en Google y viceversa
- Alta manual de eventos
- Alertas de vencimientos próximos (cobros, tareas)

## Módulo 8 — Finanzas

### Descripción

Control económico total. Solo visible para admin.

### Subvistas

- P&L mensual (ingresos vs egresos por mes)
- Cobros (todos los ingresos con estado)
- Egresos (todos los gastos)
- Suscripciones (recurrentes activos)
- Runway (caja actual ÷ quema neta)

### Funcionalidades

- Cobros generados automáticamente desde cotizaciones y suscripciones activas
- Alta manual de cobros y egresos
- Alertas de cobros vencidos
- Runway calculado en tiempo real (caja inicial configurable + todos los movimientos)
- Exportar P&L a Excel

## Módulo 9 — Dashboard

### Descripción

Métricas inteligentes, todo calculado.

### Comercial

- Pipeline ponderado (valor × probabilidad por etapa)
- Win rate por canal (outbound/inbound/referido)
- Ticket promedio cerrado
- Ciclo de cierre promedio (días lead → cliente)

### Financiero

- MRR actual + net new MRR del mes + churn
- Runway (meses) con gráfico de caja proyectada
- Cobros pendientes y vencidos
- P&L del mes actual vs anterior

### Entrega

- Proyectos activos vs capacidad máxima configurada
- % de proyectos entregados a tiempo
- Desvío promedio (días entrega real vs comprometida)
- Features completadas esta semana

## Módulo 10 — Usuarios

### Descripción

Quién opera el sistema. Dos roles: admin y miembro.

## Mapa de automatizaciones

| # | Disparador | Automatización |
| --- | --- | --- |
| 1 | Cotización → aceptada | Cascada (crea Cliente + Proyecto + Suscripción pendiente + Cobros de hitos + roadmap token) |
| 2 | Suscripción → activa + ciclo mensual | Genera Cobro recurrente + Evento de recordatorio |
| 3 | Cobro → vence sin cobrar | Estado → vencido + alerta al admin |
| 4 | Tarea con `fecha_limite` | Crea Evento en Calendario (y en Google Calendar) |
| 5 | Feature → lista | Recalcula `avance_pct` del Proyecto |
| 6 | Todas las features de una fase → listas | Marca esa fase como completada en el roadmap público |
| 7 | Lead → toque marcado (outbound) | Agenda próximo recordatorio de seguimiento |
| 8 | Cobro/Egreso → cualquier cambio | Recalcula runway y P&L en Dashboard |
| 9 | Cotizador → "Generar" | IA lee contexto + adjuntos, propone módulos, escribe resumen ejecutivo, arma preview de PDFs |
| 10 | Suscripción → activa (activación manual) | Fija `fecha_inicio` y calcula `proxima_cobro` |

## Decisiones técnicas clave

- Auth: Supabase Auth (email/password). RLS activado: cada query filtra por rol automáticamente, sin lógica extra en el frontend.
- Roadmap público: ruta Next.js pública `/roadmap/[token]` que consulta por token sin auth. Token generado con `crypto.randomUUID()` al crear el proyecto.
- Sincronización Google Calendar: OAuth 2.0 por usuario. Eventos sincronizados en background (job) cada 5 minutos + webhook de Google para cambios en tiempo real.
- Generación IA: Claude API (`claude-sonnet-4-6`). PDFs con adjuntos: Excel → SheetJS a texto plano en el prompt; PDF → base64 como document block en la API.
- Cuentas/servicios: campo `notas_acceso` encriptado con pgsodium (extensión nativa de Supabase). Admins lo ven desencriptado; miembros no tienen acceso a la tabla.
- Jobs/automatizaciones: Supabase Edge Functions + pg_cron para jobs recurrentes (cobros mensuales, alertas de vencimiento).

## Permisos por módulo

| Módulo | Admin | Miembro |
| --- | --- | --- |
| Outbound | Sí | No |
| Inbound | Sí | No |
| Clientes | Sí | No |
| Cotizador | Sí | No |
| Proyectos | Sí | Sí |
| Tareas | Sí | Sí |
| Calendario | Sí | Sí |
| Finanzas | Sí | No |
| Dashboard | Sí | No |

## Orden de construcción

### v1 (máximo ROI)

- Cotizador completo (IA + PDFs)
- Pipeline Outbound/Inbound
- Clientes
- Auth/Usuarios

### v2

- Proyectos (features + roadmap público)
- Tareas
- Calendario (Google sync)

### v3

- Finanzas completas (cobros automáticos, P&L, runway)
- Dashboard

### Nota

Lo que no está en v1 sigue en Notion/Sheets hasta que esté construido.
