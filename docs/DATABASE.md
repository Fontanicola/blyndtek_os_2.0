# Blyndtek OS — Esquema de Base de Datos

## Convenciones

- Nomenclatura en `snake_case`
- Tipos y campos transcritos exactamente desde la especificación

## Tabla: marcas_contenido

**PK:** `id`

**Uso actual:** Content Studio manual para la marca única `Blyndtek` (`slug='blyndtek'`).

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| nombre | text | No | Nombre visible de la marca |
| slug | text | No | En esta etapa se usa `blyndtek` hardcodeado |
| tono_voz | text | Sí | Identidad editorial editable |
| publico_objetivo | text | Sí | Público objetivo de la marca |
| paleta_colores | text | Sí | Criterios visuales/paleta |
| tipografia | text | Sí | Tipografía fija para piezas de contenido generadas; Blyndtek usa `DM Sans` |
| reglas_visuales | text | Sí | Reglas visuales obligatorias usadas como contexto en prompts de contenido/fondos |
| que_mostrar | text | Sí | Lineamientos de contenido permitido/deseado |
| que_evitar | text | Sí | Lineamientos de contenido a evitar |
| meta_ig_business_id | text | Sí | Preparado para futura integración Instagram |
| meta_page_id | text | Sí | Preparado para futura integración Meta |
| color | text | No | Default `signal` |
| created_at | timestamptz | No | Default `now()` |

## Tabla: pilares_contenido

**PK:** `id`

**FKs:** `marca_id` → `marcas_contenido.id`

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| marca_id | uuid | No | FK a la marca, filtrado siempre a Blyndtek desde la app |
| nombre | text | No | Nombre del pilar |
| descripcion | text | Sí | Descripción breve |
| color | text | No | Color semántico del chip, default `signal` |
| created_at | timestamptz | No | Default `now()` |

## Tabla: piezas_contenido

**PK:** `id`

**FKs:** `marca_id` → `marcas_contenido.id`; `pilar_id` → `pilares_contenido.id`; `creativo_referencia_id` → `archivos.id`; `creado_por` → `usuarios.id`

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| marca_id | uuid | No | FK a la marca Blyndtek |
| plan_semanal_id | uuid | Sí | FK a `planes_semanales.id`, usado para agrupar piezas generadas por una misma semana |
| pilar_id | uuid | Sí | FK al pilar de contenido |
| tipo_pieza | text | Sí | Tipo semántico: `noticia`, `caso_uso`, `dato_rapido`, `reel`, `historia` |
| titulo | text | No | Default `Sin título` |
| storage_path | text | Sí | Imagen manual subida a Storage (`archivos-blyndtek/contenido/...`) |
| fondo_storage_path | text | Sí | Fondo atmosférico generado por Higgsfield, sin texto ni UI falsa |
| imagenes_generadas | jsonb | Sí | Array ordenado de storage paths generado por ImageResponse, uno por slide |
| caption | text | Sí | Texto de publicación |
| hashtags | text[] | No | Chips editables de hashtags |
| guion | jsonb | Sí | Texto estructurado del plan: slides de feed, guion de reel o ideas de historias |
| plataforma | text | No | Default `instagram_feed` |
| estado | text | No | Flujo: `idea`, `en_diseno`, `lista`, `programada`, `publicada`, `fallida` |
| fecha_programada | timestamptz | Sí | Fecha/hora de programación manual |
| publicado_at | timestamptz | Sí | Fecha/hora de publicación futura |
| meta_post_id | text | Sí | Preparado para futura sync con Meta |
| meta_error | text | Sí | Error de publicación futura |
| generado_con_ia | boolean | No | Default `false`; preparado para Higgsfield |
| prompt_higgsfield | text | Sí | Prompt final enviado a Higgsfield |
| prompt_fondo | text | Sí | Prompt específico usado para generar únicamente el fondo atmosférico |
| higgsfield_job_id | text | Sí | ID de request/job devuelto por Higgsfield |
| higgsfield_estado | text | Sí | Estado de generación: `procesando`, `completado`, `fallido` |
| tokens_entrada | integer | Sí | Tokens de entrada consumidos por Claude al generar el prompt de fondo |
| tokens_salida | integer | Sí | Tokens de salida generados por Claude al generar el prompt de fondo |
| costo_generacion_usd | numeric | Sí | Costo estimado de la generación textual del prompt de fondo |
| creativo_referencia_id | uuid | Sí | FK opcional a archivo de referencia |
| creado_por | uuid | Sí | Usuario admin que creó la pieza |
| updated_at | timestamptz | No | Default `now()` |
| created_at | timestamptz | No | Default `now()` |

## Tabla: planes_semanales

**PK:** `id`

**FKs:** `marca_id` → `marcas_contenido.id`

**Uso actual:** generación semanal conectada de contenido para Blyndtek, basada en una noticia real investigada con Claude web search.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| marca_id | uuid | No | FK a la marca Blyndtek |
| semana_inicio | date | No | Lunes/inicio lógico de la semana del plan |
| tema_general | text | No | Hilo narrativo central de la semana |
| noticia_fuente | text | No | Resumen de la noticia real usada como disparador |
| noticia_url | text | No | URL verificable de la fuente |
| created_at | timestamptz | No | Default `now()` |

## Tabla: generaciones_automaticas

**PK:** `id`

**Uso actual:** trazabilidad de ejecuciones automáticas de Content Studio. Cada lunes, el job semanal genera un plan, renderiza las piezas de feed y deja el resultado esperando revisión humana.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| plan_semanal_id | uuid | Sí | FK a `planes_semanales.id`; vincula la ejecución automática con el plan creado |
| estado | text | No | `en_curso`, `completado` o `fallido` |
| piezas_generadas | integer | No | Cantidad de piezas de feed generadas visualmente durante la ejecución |
| error_detalle | text | Sí | Mensaje real de error o errores parciales, si existieron |
| iniciado_at | timestamptz | No | Momento de inicio de la ejecución |
| finalizado_at | timestamptz | Sí | Momento de cierre de la ejecución |

## Tabla: leads

## Tabla: soporte_tickets

**PK:** `id`

**FKs:** `cliente_id` -> `clientes.id`; `proyecto_id` -> `proyectos.id`; `responsable_id` -> `usuarios.id`.

Tickets de soporte de clientes en producción, con prioridad, estado, responsable y fecha límite.

`sla_horas` conserva el objetivo de respuesta según prioridad; la interfaz lo usa para identificar tickets que requieren atención.

## Tabla: soporte_handoffs

**PK:** `id`; `proyecto_id` es único.

Registra la transferencia formal de un proyecto terminado a Soporte, con estado, fecha, checklist y notas.

## Tabla: revisiones_cuenta

**PK:** `id`

**FKs:** `cliente_id` -> `clientes.id`; `proyecto_id` -> `proyectos.id`; `creado_por` -> `usuarios.id`.

Una fila por cliente y trimestre (`cliente_id`, `periodo_inicio` es único). Registra la revisión de cuenta, satisfacción, decisiones y próximas acciones.

El endpoint de preparación trimestral crea estas filas para clientes `activo` sin duplicarlas.

La automatización trimestral se ejecuta el día 25 de marzo, junio, septiembre y diciembre; debe activarse reemplazando los placeholders de `022_revisiones_trimestrales_cron.sql`.

## Tabla: oportunidades_upsell

**PK:** `id`

**FKs:** `cliente_id` -> `clientes.id`; `proyecto_id` -> `proyectos.id`; `responsable_id` -> `usuarios.id`.

Oportunidades de expansión detectadas desde soporte, delivery, revisiones trimestrales o el equipo comercial. El monto estimado es interno y no reemplaza una propuesta aprobada.

**PK:** `id`

**FKs:** `responsable_id` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| canal | enum (`outbound|inbound`) | No especificado |  |
| canal_origen | enum (`organico|referido|meta_ads|google_ads|evento|outbound_frio|otro`) | Sí | Origen comercial atribuible del lead; default lógico de app: `organico` |
| campana_origen | text | Sí | Campaña o detalle libre asociado al origen, cuando aplica |
| empresa | text | No especificado |  |
| rubro | text | No especificado |  |
| ubicacion | text | No especificado |  |
| contacto_1_nombre | text | No especificado |  |
| contacto_1_tel | text | No especificado |  |
| contacto_2_nombre | text | No especificado |  |
| contacto_2_tel | text | No especificado |  |
| web | text | No especificado |  |
| etapa | enum (`por_contactar|contactado|seguimiento|calificado|cotizacion|ganado|descartado`) | No especificado |  |
| valor_estimado | numeric (USD) | No especificado |  |
| responsable_id | uuid | No especificado | FK → `usuarios` |
| llamada_fecha | date | No especificado |  |
| llamada_hecho | bool | No especificado |  |
| seg1_fecha | date | No especificado |  |
| seg1_hecho | bool | No especificado |  |
| seg2_fecha | date | No especificado |  |
| seg2_hecho | bool | No especificado |  |
| referido_por | text | No especificado | solo inbound |
| relacion | text | No especificado | solo inbound |
| nivel_confianza | enum (`alto|medio|bajo`) | No especificado | solo inbound |
| contexto | text | No especificado | necesidad/dolor |
| mensaje_inicial | text | Sí | Mensaje enviado por el visitante desde el sitio institucional o capturado manualmente |
| presupuesto_estimado | numeric | No especificado |  |
| motivo_descarte | text | No especificado | solo si descartado |
| notas | text | No especificado |  |
| created_at | timestamptz | No especificado |  |
| updated_at | timestamptz | No especificado |  |

> Nota: el esquema documentado originalmente no incluía `ganado`; la definición efectiva usada por la app se amplió para reflejar la etapa de cierre antes de `descartado`.

### Endpoint público de leads

`POST /api/public/leads` recibe consultas del sitio institucional sin requerir sesión del visitante. Inserta en `leads` con `canal='inbound'`, `etapa='por_contactar'`, `vendedor_id=null`, `canal_origen` derivado de `utm_source`, `campana_origen` desde `utm_campaign` y `mensaje_inicial` con el texto enviado.

Protecciones activas: honeypot silencioso, CORS restringido a `MARKETING_SITE_URL` y rate limiting básico por IP.

## Tabla: clientes

**PK:** `id`

**FKs:** `lead_id` → `leads.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| lead_id | uuid | No especificado | FK → `leads` (de qué oportunidad vino) |
| empresa | text | No especificado |  |
| pais | text | No especificado | AR\|MX\|… |
| contacto_nombre | text | No especificado |  |
| contacto_email | text | No especificado |  |
| contacto_whatsapp | text | No especificado |  |
| datos_facturacion | jsonb | No especificado | CUIT, razón social, etc. |
| estado | enum (`activo|pausado|inactivo`) | No especificado |  |
| notas | text | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: cotizaciones

**PK:** `id`

**FKs:** `lead_id` → `leads.id`; `cliente_id` → `clientes.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| lead_id | uuid | No especificado | FK → `leads` |
| cliente_id | uuid | No especificado | FK → `clientes` (se llena al aceptarse) |
| empresa | text | No especificado | snapshot del nombre |
| precio_total | numeric (USD) | No especificado |  |
| mantenimiento_mensual | numeric (USD) | No especificado |  |
| plazo_semanas | int | No especificado |  |
| hitos | jsonb | No especificado | array `[{nombre,pct,monto}]`; en propuestas de diagnóstico también guarda fases con `subtareas` |
| modulos | jsonb | No especificado | array `[{nombre,descripcion,features[]}]`; en propuestas de diagnóstico guarda módulos resueltos desde `modulos_catalogo` |
| contexto_chat | jsonb | No especificado | historial del chat |
| adjuntos | jsonb | No especificado | metadata de archivos |
| entendimiento | text | No especificado |  |
| beneficios | jsonb | No especificado | array de beneficios comerciales |
| por_que_nosotros | jsonb | No especificado | diferenciadores de Blyndtek |
| justificacion_precio | text | No especificado |  |
| mantenimiento_detalle | jsonb | No especificado | detalle de qué incluye / no incluye |
| supuestos | jsonb | No especificado | supuestos comerciales y técnicos |
| condiciones_comerciales | jsonb | No especificado | condiciones típicas de la propuesta; en diagnóstico incluye desarrollo, adelanto, cuotas, fechas de pago y mantenimiento mensual |
| datos_propuesta | jsonb | No especificado | portada y datos de contacto de la propuesta |
| resumen_ejecutivo | text | No especificado | generado por IA |
| estado | enum (`borrador|enviada|aceptada|rechazada`) | No especificado |  |
| pdf_propuesta_url | text | No especificado |  |
| pdf_roadmap_url | text | No especificado |  |
| created_at | timestamptz | No especificado |  |
| updated_at | timestamptz | No especificado |  |

## Tabla: proyectos

**PK:** `id`

**FKs:** `cotizacion_id` → `cotizaciones.id`; `cliente_id` → `clientes.id`; `responsable_id` → `usuarios.id`; `devs_asignados` → `usuarios.id` (array FK)

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí sobre sus tareas; acceso para `comercial` restringido a sus propias tareas.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| cotizacion_id | uuid | No especificado | FK → `cotizaciones` |
| cliente_id | uuid | No especificado | FK → `clientes` |
| nombre | text | No especificado |  |
| estado | enum (`por_empezar|en_desarrollo|implementacion|entregado|soporte|pausado`) | No especificado |  |
| responsable_id | uuid | No especificado | FK → `usuarios` |
| devs_asignados | uuid[] | No especificado | array FK → `usuarios` |
| fecha_inicio | date | No especificado |  |
| entrega_comprometida | date | No especificado |  |
| entrega_real | date | No especificado |  |
| avance_pct | int | No especificado | calculado desde features |
| valor_total | numeric | No especificado |  |
| notas_arquitectura | text | No especificado | En proyectos creados desde diagnóstico guarda el alcance general de la propuesta |
| roadmap_token | text | No especificado | único, generado al crear |
| roadmap_slug | text | Sí | único, generado al crear a partir del cliente |
| url_sistema | text | Sí | URL pública o staging del sistema del cliente |
| imagen_sistema_storage_path | text | Sí | path en Storage para preview manual del sistema en vivo |
| credenciales_cliente | jsonb | Sí | usuario, contraseña y notas; se revelan solo con PIN |
| roadmap_pin | text | Sí | PIN de acceso de 4-6 dígitos para credenciales del roadmap |
| roadmap_publico_activo | bool | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: productos

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| nombre | text | No especificado | nombre visible del producto SaaS |
| slug | text | No especificado | identificador estable y único |
| descripcion | text | Sí | resumen comercial/operativo |
| precio_mensual_default | numeric | Sí | precio base sugerido |
| color | text | No especificado | token visual (`signal|success|warning|danger|graphite`) |
| created_at | timestamptz | No especificado |  |

## Tabla: producto_planes

**PK:** `id`

**FKs:** `producto_id` → `productos.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| producto_id | uuid | No | FK → `productos` |
| nombre | text | No | nombre visible del plan |
| precio_mensual | numeric | No | precio de referencia del plan |
| descripcion | text | Sí | descripción comercial u operativa |
| orden | int | No | para ordenar planes dentro del producto |
| created_at | timestamptz | No |  |

## Tabla: features

**PK:** `id`

**FKs:** `proyecto_id` → `proyectos.id`; `responsable_id` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| proyecto_id | uuid | No especificado | FK → `proyectos` |
| nombre | text | No especificado |  |
| descripcion | text | No especificado |  |
| fase | text | No especificado | fase del roadmap a la que pertenece |
| estado | enum (`pendiente|en_curso|lista`) | No especificado |  |
| responsable_id | uuid | No especificado | FK → `usuarios` |
| orden | int | No especificado | para ordenar dentro de la fase |
| created_at | timestamptz | No especificado |  |

## Tabla: producto_features

**PK:** `id`

**FKs:** `producto_id` → `productos.id`; `solicitado_por_cliente_id` → `clientes.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| producto_id | uuid | No | FK → `productos` |
| titulo | text | No |  |
| descripcion | text | Sí |  |
| estado | enum (`idea|planificado|en_desarrollo|lanzado`) | No |  |
| prioridad | enum (`alta|media|baja`) | No |  |
| solicitado_por_cliente_id | uuid | Sí | FK → `clientes` |
| orden | int | No | para ordenar dentro de la columna |
| created_at | timestamptz | No |  |

## Tabla: cuentas_servicios

**PK:** `id`

**FKs:** `proyecto_id` → `proyectos.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| proyecto_id | uuid | No especificado | FK → `proyectos` |
| servicio | text | No especificado | Vercel, Supabase, ARCA… |
| para_que | text | No especificado |  |
| cuenta_email | text | No especificado |  |
| notas_acceso | text | No especificado | encriptado en reposo |
| created_at | timestamptz | No especificado |  |

## Tabla: tareas

**PK:** `id`

**FKs:** `proyecto_id` → `proyectos.id`; `responsable_id` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| titulo | text | No especificado |  |
| proyecto_id | uuid | Sí | FK → `proyectos` (nullable) |
| responsable_id | uuid | No especificado | FK → `usuarios` |
| prioridad | enum (`alta|media|baja`) | No especificado |  |
| fecha_limite | date | No especificado |  |
| estado | enum (`nueva|en_proceso|terminada`) | No especificado |  |
| notas | text | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: eventos

**PK:** `id`

**FKs:** `usuario_id` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| titulo | text | No especificado |  |
| fecha_inicio | timestamptz | No especificado |  |
| fecha_fin | timestamptz | No especificado |  |
| tipo | enum (`tarea|seguimiento|vencimiento|reunion`) | No especificado |  |
| usuario_id | uuid | No especificado | FK → `usuarios` |
| referencia_tipo | text | No especificado | `tarea|lead|cobro` |
| referencia_id | uuid | No especificado | ID del objeto referenciado |
| google_event_id | text | No especificado | para sincronización |
| calendly_event_id | text | Sí | URI del evento externo de Calendly; índice único parcial |
| calendly_invitee_uri | text | Sí | URI de la reserva/invitado de Calendly; índice único parcial |
| enlace_reunion | text | Sí | URL de Google Meet, Calendly u otra videollamada asociada |
| relacion_tipo | text | Sí | `lead` o `cliente`; relación comercial opcional de una reunión |
| relacion_id | uuid | Sí | ID del lead o cliente según `relacion_tipo`; índice compuesto parcial |
| created_at | timestamptz | No especificado |  |

La migración `028_eventos_relacion.sql` agrega la relación comercial opcional sin alterar las referencias históricas de `referencia_tipo`/`referencia_id`. Las reuniones nuevas pueden solicitar un Google Meet mediante Google Calendar; el enlace devuelto se guarda en `enlace_reunion` junto con `google_event_id`.

## Tabla: eventos_invitados

**PK:** `id`

**FKs:** `evento_id` → `eventos.id`; `usuario_id` → `usuarios.id`

**RLS esperada:** el invitado ve/actualiza su fila; el organizador del evento ve todas las invitaciones de sus eventos.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| evento_id | uuid | No especificado | FK → `eventos` |
| usuario_id | uuid | No especificado | FK → `usuarios` |
| estado | text | No especificado | `pendiente|aceptado|rechazado|propuesta_alternativa` |
| fecha_propuesta_alt | date | Sí | fecha alternativa propuesta |
| hora_propuesta_alt | time | Sí | hora alternativa propuesta |
| comentario | text | Sí | comentario opcional del invitado |
| respondido_at | timestamptz | Sí | fecha de respuesta |
| created_at | timestamptz | No especificado |  |

## Tabla: cobros

**PK:** `id`

**FKs:** `cliente_id` → `clientes.id`; `lead_id` → `leads.id`; `contrato_id` → `contratos.id`; `proyecto_id` → `proyectos.id`; `suscripcion_id` → `suscripciones.id`; `cotizacion_id` → `cotizaciones.id`; `caja_id` → `cajas.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| cliente_id | uuid | Sí | FK → `clientes`; nullable para ingresos no vinculados o cobros de lead |
| lead_id | uuid | Sí | FK → `leads`; usado por diagnósticos pagos antes de convertir a cliente |
| contrato_id | uuid | Sí | FK → `contratos` (nullable) |
| proyecto_id | uuid | Sí | FK → `proyectos` (nullable) |
| suscripcion_id | uuid | Sí | FK → `suscripciones` (nullable) |
| cotizacion_id | uuid | Sí | FK → `cotizaciones` (nullable) |
| caja_id | uuid | Sí | FK → `cajas`; caja elegida explícitamente para tesorería |
| concepto | text | No especificado |  |
| tipo | enum (`one_pay|hito|mantenimiento|brick|diagnostico|otro|transferencia`) | No especificado | `otro` habilita ingresos genéricos no vinculados; `transferencia` representa la pata de ingreso de un movimiento entre cajas |
| monto | numeric (USD) | No especificado |  |
| fecha_emision | date | No especificado |  |
| fecha_vencimiento | date | No especificado |  |
| fecha_cobro | date | No especificado | cuándo entró la plata |
| cuenta_medio | text | No especificado | slug histórico de caja; se mantiene por compatibilidad con tesorería y datos previos |
| tolerancia_dias | int | No especificado | días extra para considerar vencido |
| estado | enum (`pendiente|facturado|cobrado|vencido`) | No especificado |  |
| created_at | timestamptz | No especificado |  |

Notas de verificación:
- OpenAPI real de Supabase consultado el 2026-07-21 confirmó que `cobros.caja_id` ya existe en la base productiva.
- En esa misma verificación, `cobros.cliente_id` seguía con `NOT NULL` en producción; la migración `012_ingresos_genericos_cobros.sql` deja el esquema alineado con la app para permitir ingresos genéricos sin cliente vinculado.

Nota operativa:
- Una transferencia entre cajas no se modela como un ledger paralelo: genera un `egreso` real en la caja origen + un `cobro` real en la caja destino, ambos vinculados por `transferencias_caja`, para que el balance de cada caja siga derivándose únicamente de `cobros` y `egresos`.

## Tabla: cobros_historial_cambios

**PK:** `id`

**FKs:** `cobro_id` → `cobros.id`; `modificado_por` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| cobro_id | uuid | No | FK → `cobros` |
| monto_anterior | numeric (USD) | Sí | monto previo cuando cambió |
| monto_nuevo | numeric (USD) | Sí | monto nuevo cuando cambió |
| fecha_anterior | date | Sí | fecha vencimiento previa |
| fecha_nueva | date | Sí | fecha vencimiento nueva |
| nota | text | Sí | motivo opcional del cambio |
| modificado_por | uuid | Sí | FK → `usuarios` que hizo la edición |
| created_at | timestamptz | No especificado |  |

## Tabla: egresos

**PK:** `id`

**FKs:** `cliente_id` → `clientes.id`; `comision_id` → `comisiones.id`; `recurrente_config_id` → `egresos_recurrentes_config.id`; `caja_id` → `cajas.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| concepto | text | No especificado |  |
| categoria | enum (`dominios|hosting_infraestructura|herramientas_software|marketing_ads|impuestos_contable|sueldos_honorarios|comisiones|otro|transferencia`) | No especificado | `transferencia` representa la pata de salida de un movimiento entre cajas |
| monto | numeric (USD) | No especificado |  |
| fecha | date | No especificado |  |
| recurrente | bool | No especificado |  |
| caja_id | uuid | Sí | FK → `cajas`; caja de la que sale el egreso cuando aplica |
| cuenta_medio | text | No especificado | medio de pago |
| pagado | bool | No especificado | si el egreso ya fue abonado |
| fecha_pago | date | No especificado | fecha en que se pagó |
| cliente_id | uuid | Sí | FK → `clientes` para imputación opcional por cliente |
| proyecto_id | uuid | No especificado | imputación opcional a proyecto |
| comision_id | uuid | Sí | FK → `comisiones` para egresos generados al pagar comisiones |
| recurrente_config_id | uuid | Sí | FK → `egresos_recurrentes_config`; vincula la instancia mensual real con su plantilla |
| notas | text | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: transferencias_caja

**PK:** `id`

**FKs:** `caja_origen_id` → `cajas.id`; `caja_destino_id` → `cajas.id`; `egreso_id` → `egresos.id`; `cobro_id` → `cobros.id`; `creado_por` → `usuarios.id`

**Uso actual:** trazabilidad explícita de movimientos entre cajas, uniendo la salida (`egresos`) y la entrada (`cobros`) del mismo traslado.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| caja_origen_id | uuid | No | FK → `cajas`; caja que pierde saldo |
| caja_destino_id | uuid | No | FK → `cajas`; caja que recibe saldo |
| monto | numeric | No | Monto transferido |
| fecha | date | No | Fecha efectiva del traslado |
| nota | text | Sí | Nota opcional del movimiento |
| egreso_id | uuid | No | FK → `egresos`; registro real de salida |
| cobro_id | uuid | No | FK → `cobros`; registro real de entrada |
| creado_por | uuid | Sí | FK → `usuarios` |
| created_at | timestamptz | No | Default `now()` |

## Tabla: egresos_recurrentes_config

**PK:** `id`

**FKs:** `cliente_id` → `clientes.id`; `proyecto_id` → `proyectos.id`; `caja_id` → `cajas.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| concepto | text | No | concepto base del egreso recurrente |
| categoria | enum (`dominios|hosting_infraestructura|herramientas_software|marketing_ads|impuestos_contable|sueldos_honorarios|comisiones|otro`) | No | categoría base |
| monto | numeric (USD) | No | monto mensual esperado |
| cliente_id | uuid | Sí | FK → `clientes` |
| proyecto_id | uuid | Sí | FK → `proyectos` |
| caja_id | uuid | Sí | FK → `cajas`; caja sugerida para nuevas instancias |
| dia_pago | int | No | día del mes (1-28) usado para generar la instancia |
| activo | bool | No | si la plantilla sigue generando meses futuros |
| fecha_inicio | date | No | primer mes desde el cual se puede generar la instancia |
| created_at | timestamptz | No especificado |  |

## Tabla: contratos

**PK:** `id`

**FKs:** `cliente_id` → `clientes.id`; `reemplaza_a` → `contratos.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| cliente_id | uuid | No especificado | FK → `clientes` |
| valor_total | numeric (USD) | No especificado | valor total pactado |
| cantidad_cuotas | int | No especificado | total de cuotas generadas |
| dia_pago | int | No especificado | día de vencimiento recurrente entre 1 y 28 |
| fecha_primera_cuota | date | No especificado | vencimiento inicial del plan |
| valor_mantenimiento_mensual | numeric | Sí | monto de mantenimiento mensual, si aplica |
| dia_facturacion_mantenimiento | int | Sí | día de facturación del mantenimiento entre 1 y 28 |
| estado | enum (`activo|reemplazado`) | No especificado | contrato vigente o reemplazado |
| reemplaza_a | uuid | Sí | FK al contrato anterior cuando se redefine |
| motivo_redefinicion | text | Sí | motivo opcional de renegociación |
| created_at | timestamptz | No especificado |  |

## Tabla: suscripciones

**PK:** `id`

**FKs:** `cliente_id` → `clientes.id`; `proyecto_id` → `proyectos.id`; `cotizacion_id` → `cotizaciones.id`; `contrato_id` → `contratos.id`; `producto_id` → `productos.id`; `plan_id` → `producto_planes.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| cliente_id | uuid | No especificado | FK → `clientes` |
| proyecto_id | uuid | Sí | FK → `proyectos` (nullable) |
| cotizacion_id | uuid | Sí | FK → `cotizaciones` (nullable) |
| contrato_id | uuid | Sí | FK → `contratos` (nullable) |
| producto_id | uuid | Sí | FK → `productos` (suscripción SaaS opcional) |
| plan_id | uuid | Sí | FK → `producto_planes` (nullable) |
| tipo | enum (`mantenimiento|brick`) | No especificado |  |
| monto_mensual | numeric | No especificado |  |
| ciclo | enum (`mensual|anual`) | No especificado |  |
| fecha_inicio | date | No especificado |  |
| proxima_cobro | date | No especificado |  |
| estado | enum (`pendiente|activa|pausada|baja`) | No especificado |  |
| fecha_baja | date | No especificado |  |
| motivo_baja | text | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: comisiones

**PK:** `id`

**FKs:** `vendedor_id` → `usuarios.id`; `cliente_id` → `clientes.id`; `lead_id` → `leads.id`; `cotizacion_id` → `cotizaciones.id`; `config_comisiones_id` → `config_comisiones.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no; acceso para `comercial` sólo sobre sus propias comisiones.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| vendedor_id | uuid | No | FK → `usuarios` |
| cliente_id | uuid | Sí | FK → `clientes`; nullable para comisiones de diagnóstico antes de crear el cliente |
| lead_id | uuid | Sí | FK → `leads`; usado por comisiones `tipo='diagnostico'` |
| cotizacion_id | uuid | Sí | FK → `cotizaciones` |
| tipo | enum (`venta|diagnostico`) | No | venta cerrada o diagnóstico pago |
| estado | enum (`pendiente|pagada|cancelada`) | No | estado de pago de la comisión |
| monto_venta | numeric | No | base comercial de la operación |
| base_comision | numeric | No | base efectiva usada para calcular la comisión |
| porcentaje | numeric | No | porcentaje aplicado sobre la base cuando corresponde |
| monto_comision | numeric | No | monto final de la comisión |
| config_comisiones_id | uuid | Sí | FK → `config_comisiones` vigente al momento de generarla |
| pagada_at | timestamptz | Sí | fecha real de pago |
| created_at | timestamptz | No | creación del registro |
| updated_at | timestamptz | No | última actualización |

## Tabla: config_finanzas

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| caja_inicial | numeric | No especificado | editable, punto de partida del runway |
| updated_at | timestamptz | No especificado |  |

## Tabla: presupuestos_mensuales

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| mes | date | No | mes presupuestado, persistido como primer día (`YYYY-MM-01`) |
| caja_inicial_usd | numeric | Sí | caja de arranque del mes; si no existe presupuesto previo, parte del balance real de Tesorería |
| caja_final_proyectada_usd | numeric | Sí | caja final recalculada = caja inicial + ingresos incluidos - egresos incluidos |
| created_at | timestamptz | No especificado |  |

## Tabla: presupuesto_items

**PK:** `id`

**FKs:** `presupuesto_id` → `presupuestos_mensuales.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| presupuesto_id | uuid | No | FK → `presupuestos_mensuales` |
| tipo | text | No | `ingreso` o `egreso` |
| origen | text | No | `cobro_existente`, `suscripcion`, `egreso_recurrente` o `manual` |
| referencia_id | uuid | Sí | referencia opcional al registro origen |
| concepto | text | No | texto editable del item |
| monto | numeric | No | monto editable del item |
| incluido | bool | No | define si entra o no en el cálculo del mes |
| created_at | timestamptz | No especificado |  |

## Tabla: carpetas

**PK:** `id`

**FKs:** `carpeta_padre_id` → `carpetas.id`; `cliente_id` → `clientes.id`; `proyecto_id` → `proyectos.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| nombre | text | No especificado | nombre visible de la carpeta |
| seccion | enum (`clientes|proyectos|comercial|finanzas|general`) | No especificado | sección funcional |
| carpeta_padre_id | uuid | Sí | carpeta padre dentro de la misma sección |
| cliente_id | uuid | Sí | carpeta raíz automática de cliente |
| proyecto_id | uuid | Sí | carpeta raíz automática de proyecto |
| orden | int | No especificado | orden visual dentro de la carpeta/sección |
| es_automatica | bool | No especificado | true si la creó el sistema |
| creado_por | uuid | Sí | usuario que la creó manualmente |
| created_at | timestamptz | No especificado |  |

## Tabla: archivos

**PK:** `id`

**FKs:** `carpeta_id` → `carpetas.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| nombre | text | No especificado | nombre legible original |
| carpeta_id | uuid | Sí | carpeta contenedora |
| orden | int | No especificado | orden visual dentro de la carpeta |
| storage_path | text | No especificado | path real en `archivos-blyndtek` |
| tipo_mime | text | Sí | MIME detectado al subir |
| tamanio_bytes | bigint | Sí | tamaño en bytes |
| en_papelera | bool | No especificado | soft delete |
| eliminado_at | timestamptz | Sí | fecha de envío a papelera |
| subido_por | uuid | Sí | usuario que subió el archivo |
| created_at | timestamptz | No especificado |  |

## Tabla: cajas

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| nombre | text | No especificado | nombre visible de la caja |
| slug | text | No especificado | identificador estable usado en `cobros.cuenta_medio` y `egresos.cuenta_medio` |
| color | text | No especificado | token visual (`success|signal|warning|danger|graphite`) |
| activa | bool | No especificado | si aparece en selects y tesorería |
| orden | int | No especificado | orden visual |
| created_at | timestamptz | No especificado |  |

## Tabla: tarjetas

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| alias | text | No especificado | nombre corto para identificar rápido la tarjeta |
| banco | text | Sí | banco/emisor |
| titular | text | Sí | titular de referencia |
| ultimos_4 | text | No especificado | últimos 4 dígitos; nunca se guarda PAN completo |
| vencimiento | text | Sí | formato `MM/AA` |
| tipo | enum (`debito|credito|prepaga`) | No especificado |  |
| uso_habitual | text | Sí | descripción libre de uso frecuente |
| notas | text | Sí | observaciones de referencia |
| created_at | timestamptz | No especificado |  |

## Tabla: sesiones_tiempo

**PK:** `id`

**FKs:** `fase_id -> fases_proyecto.id`, `usuario_id -> usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí sobre sus propias sesiones y lectura agregada de tiempos por proyecto/fase según la UI.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| fase_id | uuid | No | fase a la que pertenece la sesión |
| usuario_id | uuid | No | usuario que inició el cronómetro |
| inicio | timestamptz | No especificado | instante de arranque |
| fin | timestamptz | Sí | instante de pausa/cierre |
| duracion_segundos | int | Sí | duración calculada al cerrar |
| nota | text | Sí | nota opcional al pausar |
| created_at | timestamptz | No especificado |  |

## Tabla: checklist_qa

**PK:** `id`

**FKs:** `fase_id -> fases_proyecto.id`, `completado_por -> usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí sobre lectura y edición de checklist de fases.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| fase_id | uuid | No | fase a la que pertenece la checklist |
| item | text | No | ítem de verificación manual |
| completado | bool | No | estado del ítem |
| completado_por | uuid | Sí | usuario que lo marcó |
| completado_at | timestamptz | Sí | fecha de completado |
| orden | int | No | orden visual dentro de la checklist |
| generado_por_ia | bool | No | true si lo generó Claude |
| created_at | timestamptz | No |  |

## Tabla: carpetas_notas

**PK:** `id`

**FKs:** `created_by` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí sobre sus carpetas.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| nombre | text | No |  |
| orden | int | No | orden visual dentro de la lista |
| creado_por | uuid | Sí | FK → `usuarios` |
| created_at | timestamptz | No |  |

## Tabla: notas

**PK:** `id`

**FKs:** `carpeta_id` → `carpetas_notas.id`; `cliente_id` → `clientes.id`; `proyecto_id` → `proyectos.id`; `lead_id` → `leads.id`; `creado_por` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí sobre sus notas; acceso para `comercial` solo sobre notas creadas por él o compartidas explícitamente.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| titulo | text | No |  |
| contenido | jsonb | No | JSON estructurado de TipTap |
| carpeta_id | uuid | Sí | FK → `carpetas_notas` |
| fijada | bool | No | nota fijada |
| en_papelera | bool | No | soft delete |
| eliminada_at | timestamptz | Sí | fecha de borrado lógico |
| cliente_id | uuid | Sí | vínculo opcional |
| proyecto_id | uuid | Sí | vínculo opcional |
| lead_id | uuid | Sí | vínculo opcional |
| tags | text[] | Sí | etiquetas libres de la nota |
| creado_por | uuid | Sí | FK → `usuarios` |
| updated_at | timestamptz | No |  |
| created_at | timestamptz | No |  |

## Tabla: notas_compartidas

**PK:** `id`

**FKs:** `nota_id` → `notas.id`; `usuario_id` → `usuarios.id`; `compartida_por` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `comercial` solo a sus propios registros de compartición.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| nota_id | uuid | No | FK → `notas` |
| usuario_id | uuid | No | usuario receptor del acceso |
| compartida_por | uuid | Sí | FK → `usuarios` |
| created_at | timestamptz | No |  |

## Tabla: notas_etiquetas

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí sobre lectura y creación básica.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| nombre | text | No | nombre visible de la etiqueta |
| color | text | No | tono reutilizable de etiqueta (`default|amarillo|rosa|celeste|verde|violeta`) |
| created_at | timestamptz | No |  |

## Tabla: wiki_categorias

**PK:** `id`

**FKs:** `creado_por` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| nombre | text | No |  |
| orden | int | No | orden visual dentro de la lista |
| creado_por | uuid | Sí | FK → `usuarios` |
| created_at | timestamptz | No |  |

## Tabla: wiki_articulos

**PK:** `id`

**FKs:** `categoria_id` → `wiki_categorias.id`; `creado_por` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| titulo | text | No |  |
| contenido | jsonb | No | JSON estructurado de TipTap |
| categoria_id | uuid | Sí | FK → `wiki_categorias` |
| orden | int | No | orden visual dentro de la categoría |
| creado_por | uuid | Sí | FK → `usuarios` |
| updated_at | timestamptz | No |  |
| created_at | timestamptz | No |  |

## Tabla: usuarios

**PK:** `id`

**FKs:** referencia lógica a `auth.users` de Supabase para compartir el mismo identificador.

**RLS esperada:** la tabla base de perfiles debe distinguir `admin` y `miembro`; el rol define el acceso al resto de las tablas vía RLS.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK (mismo que `auth.users` de Supabase) |
| nombre | text | No especificado |  |
| email | text | No especificado |  |
| rol | enum (`admin|miembro`) | No especificado |  |
| foto_url | text | Sí | URL proxy de la foto de perfil |
| google_calendar_token | text | No especificado | OAuth, encriptado |
| activo | bool | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: passkeys

**PK:** `id`

**FKs:** `usuario_id` → `usuarios.id`

**Uso:** espejo local de los passkeys registrados vía Supabase Auth para poder listarlos, nombrarlos y eliminarlos desde `/perfil` sin reemplazar la credencial real.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| usuario_id | uuid | No | FK → `usuarios` |
| passkey_id | text | No | Identificador del passkey real de Supabase |
| nombre_dispositivo | text | No | Nombre amigable visible en la UI |
| created_at | timestamptz | No |  |

## Tabla: agentes

**PK:** `id`

**Uso:** catálogo de agentes de Blyndtek OS. Incluye, entre otros, `asesor-financiero` y `cronista`; la estructura queda lista para escalar a más agentes.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| slug | text | No | identificador estable del agente |
| nombre | text | No | nombre visible en UI |
| descripcion | text | Sí | descripción resumida |
| tipo | text/enum (`analista|generador|ejecutor|vigilante`) | No | clasificación usada por el AI Hub |
| activo | bool | No | habilita / oculta el agente |
| color | text | No | variante visual del agente |
| created_at | timestamptz | No |  |

## Tabla: agente_config

**PK:** `id`

**FKs:** `agente_id` → `agentes.id`

**Uso:** configuración persistente por agente, editable desde `/ai-hub/agentes`.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| agente_id | uuid | No | FK → `agentes` |
| clave | text | No | parámetro configurable (`runway_objetivo_meses`, `resumen_automatico_activo`, `frecuencia_resumen`) |
| valor | jsonb | No | valor tipado en JSON |
| updated_at | timestamptz | No |  |

## Tabla: automatizaciones

**PK:** `id`

**FKs:** `agente_id` → `agentes.id`

**Uso:** registro único de tareas recurrentes de agentes. La UI de `/ai-hub/automatizaciones` lee y edita estas filas; los crons reales respetan `activa` desde acá, no desde claves ad-hoc de `agente_config`.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| agente_id | uuid | No | FK → `agentes` |
| nombre | text | No | nombre visible de la automatización |
| descripcion | text | Sí | contexto breve de lo que ejecuta |
| activa | boolean | No | play/pausa canónico para el cron |
| frecuencia | text/enum (`diaria|semanal|mensual`) | No | frecuencia declarada en UI |
| dia_semana | integer | Sí | 0-6, usado cuando `frecuencia='semanal'` |
| dia_mes | integer | Sí | 1-28, usado cuando `frecuencia='mensual'` |
| hora | time | No | hora local configurada |
| endpoint_trigger | text | No | route HTTP que ejecuta la automatización |
| ultima_ejecucion | timestamptz | Sí | última vez que el endpoint corrió o fue salteado por pausa |
| created_at | timestamptz | No |  |

## Tabla: cierres_mensuales

**PK:** `id`

**Uso:** historial de cierres automáticos de caja generados por el agente `cierre-mensual`, visibles en Finanzas y sumados al AI Hub como actividad/costo de IA.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| mes | date | No | Mes que se cierra, normalizado al primer día (`YYYY-MM-01`) |
| ingresos_totales_usd | numeric | Sí | Suma de cobros `cobrado` del mes |
| egresos_totales_usd | numeric | Sí | Suma de egresos `pagado` del mes |
| margen_usd | numeric | Sí | `ingresos - egresos` |
| desvio_pct_vs_anterior | numeric | Sí | Variación porcentual del margen contra el mes previo |
| resumen_texto | text | Sí | Síntesis de Claude con tono financiero cercano |
| tokens_entrada | integer | Sí | Tokens de entrada consumidos por Claude |
| tokens_salida | integer | Sí | Tokens de salida generados por Claude |
| costo_generacion_usd | numeric | Sí | Costo estimado del resumen mensual |
| generado_at | timestamptz | No | Momento de generación / última regeneración |

## Tabla: agente_analisis

**PK:** `id`

**FKs:** `agente_id` → `agentes.id`; `generado_por` → `usuarios.id`

**Uso:** historial de análisis generados por el asesor financiero, tanto bajo demanda como automáticos.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| agente_id | uuid | No | FK → `agentes` |
| tipo | text/enum (`automatico|bajo_demanda`) | No | origen del análisis |
| datos_calculados | jsonb | No | snapshot de métricas determinísticas |
| analisis_texto | text | No | síntesis redactada por Claude |
| tokens_entrada | integer | Sí | tokens consumidos por Claude en la entrada |
| tokens_salida | integer | Sí | tokens generados por Claude en la salida |
| costo_estimado_usd | numeric | Sí | costo estimado con precio de Sonnet |
| generado_por | uuid | Sí | FK → `usuarios` cuando fue manual |
| created_at | timestamptz | No |  |

## Tabla: logs_diarios

**PK:** `id`

**Uso:** captura diaria del agente `cronista`. Conserva la evidencia operativa, las preguntas realizadas, la respuesta textual de Felipe y el Markdown estructurado listo para incorporar a Blyndtek Memoria.

**RLS esperada:** acceso para `admin` sí; acceso para `miembro`, `comercial` y `marketing` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| fecha | date | No | Una fila por día; índice único |
| datos_duros | jsonb | No | Snapshot determinístico de leads, movimientos financieros, delivery, diagnósticos e incidentes |
| preguntas | jsonb | No | Array de 3 a 5 preguntas contextualizadas |
| respuesta_cruda | text | Sí | Texto de Felipe sin reescritura |
| log_estructurado | text | Sí | Markdown con el contrato de log diario de Blyndtek Memoria |
| estado | text | No | `sin_contexto_humano`, `procesando`, `completado` o `fallido` |
| tokens_entrada | integer | Sí | Tokens acumulados de preguntas y estructuración |
| tokens_salida | integer | Sí | Tokens acumulados de preguntas y estructuración |
| costo_estimado_usd | numeric | Sí | Costo acumulado estimado de Claude |
| created_at | timestamptz | No | Default `now()` |
| updated_at | timestamptz | No | Última generación o procesamiento |

## Tabla: cronista_eventos_estado

**PK:** `id`

**Uso:** historial técnico mínimo para que Cronista pueda afirmar cambios de etapa de leads, features completadas y movimientos de fases sin inferirlos desde el estado actual. Empieza a capturar eventos desde la aplicación de la migración `029_cronista.sql`; no reconstruye historia previa.

**RLS esperada:** acceso para `admin` sí; el trigger `security definer` registra cambios realizados por roles operativos sin abrir acceso directo a la tabla.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| entidad_tipo | text | No | `lead`, `feature` o `fase_proyecto` |
| entidad_id | uuid | No | Identificador de la entidad; referencia polimórfica sin FK |
| estado_anterior | text | No | Estado confirmado antes del update |
| estado_nuevo | text | No | Estado confirmado después del update |
| ocurrido_at | timestamptz | No | Momento real del cambio, default `now()` |

## Tabla: reportes_cronista

**PK:** `id`

**Uso:** ejecución consolidada semanal o mensual de Cronista. Guarda evidencia, métricas duras, Markdown listo para Blyndtek Memoria, envío a socios y costo de Claude sin persistir el PDF como una fuente paralela.

**RLS esperada:** acceso para `admin` sí; acceso para `miembro`, `comercial` y `marketing` no. Los jobs usan `service_role` sólo en servidor.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK, default `gen_random_uuid()` |
| tipo | text | No | `semanal` o `mensual` |
| periodo_inicio | date | No | Inicio inclusivo; único junto con `tipo` |
| periodo_fin | date | No | Fin inclusivo |
| metricas_duras | jsonb | No | Flujos del período y snapshots fechados de pipeline/caja/runway |
| fuentes | jsonb | No | IDs, estados y contenido de logs/reportes consolidados; incluye referencia previa si existe |
| reporte_markdown | text | Sí | Documento autocontenido con frontmatter para la memoria |
| estado | text | No | `procesando`, `completado` o `fallido` |
| intentos | integer | No | Entre 0 y 2; permite un único reintento |
| error_detalle | text | Sí | Fallo real de generación, persistencia, PDF o envío |
| tokens_entrada | integer | Sí | Tokens usados por Claude |
| tokens_salida | integer | Sí | Tokens generados por Claude |
| costo_estimado_usd | numeric | Sí | Costo estimado del consolidado |
| resend_email_id | text | Sí | ID confirmado por Resend |
| enviado_at | timestamptz | Sí | Momento del envío confirmado |
| created_at | timestamptz | No | Default `now()` |
| updated_at | timestamptz | No | Último intento o cierre |

## Relaciones

### Resumen del grafo de FKs

- `leads.responsable_id` → `usuarios.id`
- `clientes.lead_id` → `leads.id`
- `cotizaciones.lead_id` → `leads.id`
- `cotizaciones.cliente_id` → `clientes.id`
- `proyectos.cotizacion_id` → `cotizaciones.id`
- `proyectos.cliente_id` → `clientes.id`
- `proyectos.responsable_id` → `usuarios.id`
- `proyectos.devs_asignados` → `usuarios.id` (array FK)
- `productos` no tiene dependencias salientes
- `producto_planes.producto_id` → `productos.id`
- `producto_features.producto_id` → `productos.id`
- `producto_features.solicitado_por_cliente_id` → `clientes.id`
- `features.proyecto_id` → `proyectos.id`
- `features.responsable_id` → `usuarios.id`
- `cuentas_servicios.proyecto_id` → `proyectos.id`
- `tareas.proyecto_id` → `proyectos.id`
- `tareas.responsable_id` → `usuarios.id`
- `eventos.usuario_id` → `usuarios.id`
- `eventos_invitados.evento_id` → `eventos.id`
- `eventos_invitados.usuario_id` → `usuarios.id`
- `cobros.cliente_id` → `clientes.id`
- `cobros.contrato_id` → `contratos.id`
- `cobros.proyecto_id` → `proyectos.id`
- `cobros.suscripcion_id` → `suscripciones.id`
- `cobros.cotizacion_id` → `cotizaciones.id`
- `cobros.cuenta_medio` → `cajas.slug` por convención de datos
- `suscripciones.cliente_id` → `clientes.id`
- `suscripciones.proyecto_id` → `proyectos.id`
- `suscripciones.cotizacion_id` → `cotizaciones.id`
- `suscripciones.contrato_id` → `contratos.id`
- `suscripciones.producto_id` → `productos.id`
- `suscripciones.plan_id` → `producto_planes.id`
- `egresos.cliente_id` → `clientes.id`
- `egresos.comision_id` → `comisiones.id`
- `egresos.recurrente_config_id` → `egresos_recurrentes_config.id`
- `egresos_recurrentes_config.cliente_id` → `clientes.id`
- `egresos_recurrentes_config.proyecto_id` → `proyectos.id`
- `egresos_recurrentes_config.caja_id` → `cajas.id`
- `presupuesto_items.presupuesto_id` → `presupuestos_mensuales.id`
- `wiki_categorias.creado_por` → `usuarios.id`
- `wiki_articulos.categoria_id` → `wiki_categorias.id`
- `wiki_articulos.creado_por` → `usuarios.id`
- `agente_config.agente_id` → `agentes.id`
- `automatizaciones.agente_id` → `agentes.id`
- `agente_analisis.agente_id` → `agentes.id`
- `agente_analisis.generado_por` → `usuarios.id`
- `carpetas.carpeta_padre_id` → `carpetas.id`
- `carpetas.cliente_id` → `clientes.id`
- `carpetas.proyecto_id` → `proyectos.id`
- `archivos.carpeta_id` → `carpetas.id`
- `egresos.cuenta_medio` → `cajas.slug` por convención de datos

### Orden de creación de tablas

Orden sugerido respetando dependencias de FK:

1. `usuarios`
2. `leads`
3. `clientes`
4. `cotizaciones`
5. `productos`
6. `producto_planes`
7. `proyectos`
8. `features`
9. `producto_features`
10. `cuentas_servicios`
11. `tareas`
12. `eventos`
13. `eventos_invitados`
14. `contratos`
15. `suscripciones`
16. `cobros`
17. `cajas`
18. `egresos_recurrentes_config`
19. `egresos`
20. `config_finanzas`
21. `presupuestos_mensuales`
22. `presupuesto_items`
23. `wiki_categorias`
24. `wiki_articulos`
25. `carpetas`
26. `archivos`
27. `tarjetas`
28. `agentes`
29. `agente_config`
30. `automatizaciones`
31. `cierres_mensuales`
32. `agente_analisis`
33. `logs_diarios`
34. `cronista_eventos_estado`
35. `reportes_cronista`

Nota: `usuarios` debe existir antes que `leads`, `proyectos`, `features`, `tareas`, `eventos` y `eventos_invitados`. `contratos`, `suscripciones` y `cobros` se apoyan en `clientes` y deben poder crearse con FKs nullable o deferrable según el orden de carga.

### Columnas nuevas registradas

- `usuarios.rol` admite también `marketing`, rol operativo para gestionar marca, contenido, campañas y recursos sin acceso a Finanzas, Leads, Clientes ni configuración administrativa.

- `proyectos.github_repo` texto nullable con formato `owner/repo`.
- `fases_proyecto.ai_dev_estado` texto enumerado para el estado de AI Dev.
- `fases_proyecto.ai_dev_iniciado_at` timestamptz nullable.
- `egresos.recurrente_config_id` uuid nullable para vincular la instancia mensual real con su plantilla recurrente.
- `fases_proyecto.ai_dev_error` texto nullable.
- `fases_proyecto.pr_url` texto nullable.
- `fases_proyecto.pr_numero` integer nullable.
- `fases_proyecto.sql_pendiente` texto nullable.
- `fases_proyecto.sql_ejecutado` boolean.
- `sesiones_tiempo.usuario_id` ahora admite `null` para registros automáticos de IA.
- `sesiones_tiempo.es_ia` boolean para distinguir tiempo generado por AI Dev.
- `tareas.es_ia` boolean para marcar tareas generadas o movidas por AI Dev.
- `usuarios.supervisor_id` uuid nullable para dejar preparada la jerarquía comercial futura.
- `leads.vendedor_id` uuid nullable para scoping de leads por comercial.
- `clientes.vendedor_id` uuid nullable para scoping de clientes por comercial.
- `egresos.cliente_id` uuid nullable para costos por cliente que siguen impactando Finanzas general sin tabla paralela.
- `carpetas_compartidas` vincula carpetas con usuarios comerciales o internos autorizados para heredar acceso.
- `comisiones` registra las comisiones generadas al aceptar cotizaciones, con base, porcentaje, monto y estado de pago.
- `config_comisiones` guarda el piso, tiers y bono vigentes para calcular comisiones sin hardcodear valores.
- `egresos.comision_id` uuid nullable para trazar el egreso generado al pagar una comisión y mantener el impacto contable y de runway en caja real.
- `cobros_historial_cambios` guarda el historial de cambios de monto y fecha de vencimiento de los hitos editados desde la ficha del cliente.
- `contratos` guarda el plan activo de pago por cliente con valor total, cantidad de cuotas, día de pago, fecha de primera cuota, mantenimiento opcional y el enlace al contrato anterior reemplazado.
- `contratos.adelanto_pct` numeric para configurar el porcentaje del adelanto del plan.
- `contratos.fecha_adelanto` date nullable para definir cuándo vence/cobra el adelanto inicial.
- `cobros.contrato_id` uuid nullable para vincular cada cuota/hito al contrato del que nació.
- `suscripciones.contrato_id` uuid nullable para vincular la suscripción de mantenimiento al contrato que la originó o la reemplazó.
- `comisiones` no tiene `proyecto_id`; cualquier referencia de proyecto para reporting debe resolverse vía `cliente_id` / `cotizacion_id` y joins a `proyectos` según contexto.
- `agentes`, `agente_config` y `agente_analisis` soportan el módulo de Agentes; `agente_analisis` guarda tanto la base determinística como la síntesis en lenguaje natural.
- `cierres_mensuales` guarda el resumen financiero mensual generado por el agente `cierre-mensual`, con base numérica real y texto sintetizado por Claude.
- `logs_diarios` guarda la captura de Cronista. Una fila sin respuesta conserva los datos duros y un Markdown con la marca explícita `sin contexto humano`; nunca se completa criterio por inferencia.
- `cronista_eventos_estado` registra mediante triggers los cambios de `leads.etapa`, `features.estado` y `fases_proyecto.estado` desde la migración `029_cronista.sql` en adelante.
- `reportes_cronista` registra los consolidados semanales y mensuales, su evidencia, Markdown, tokens/costo, errores e ID de envío. La migración `030_cronista_reportes.sql` no guarda una copia binaria del PDF.
- `sistemas_gestionados` guarda el catálogo del control plane: URLs, endpoint/token de management server-side, vínculos opcionales a proyecto/cliente, configuración de Vercel/Supabase, stack, versión y estado de monitoreo. `management_token` es secreto y nunca se expone completo por API.
- `sistemas_health_checks` guarda el histórico de disponibilidad por sistema, con estado, latencia, salud de base, detalle y timestamp.
- `sistemas_incidentes` guarda incidentes de health check y errores reportados por sistemas clientes, con severidad, detalle y resolución.
- `sistemas_deploys` guarda los últimos deploys sincronizados desde Vercel por sistema, incluyendo estado, commit y fecha.
- Las cuatro tablas del control plane tienen RLS habilitado y policies admin-only. Las rutas server-side usan `service_role` acotado; Blyndtek OS nunca accede directamente a la base del cliente.
- `preguntas_diagnostico` guarda el banco común de preguntas del diagnóstico, agrupadas por categoría y orden. `momento='formulario'` son las preguntas que responde el cliente desde el link público; `momento='sesion'` son las preguntas internas que recorre el consultor durante la reunión y nunca se exponen públicamente.
- `diagnosticos` guarda un diagnóstico por lead con `token_publico`, respuestas JSON, estado, quién lo completó, informe generado, módulos sugeridos y precios calculados para la propuesta. `respuestas` reserva la clave interna `__contexto_adicional` para contexto de reunión/notas comerciales que orientan a la IA y no corresponde a una pregunta preset.
- `modulos_catalogo` guarda el catálogo editable de módulos con precios ideal/mínimo e incremento mensual para usar en propuestas. La migración `019_seed_modulos_catalogo_defaults.sql` carga un catálogo base idempotente para que el diagnóstico pueda generar propuestas aunque el admin todavía no haya cargado módulos manualmente.

### Operación de marca y redes

- `marca_identidad_secciones` guarda el manual vivo de Blyndtek por bloques editables (`posicionamiento`, `quienes-somos`, `que-hacemos`, `propuesta-valor`, tono, prueba y lineamientos). Se vincula a `marcas_contenido` y ordena cada sección para su edición y presentación.
- `contenido_integraciones_sociales` registra las cuentas profesionales de Instagram y LinkedIn. Los tokens permanecen server-side y nunca se devuelven al navegador; `activa` controla si una cuenta puede usarse para publicación.
- `contenido_publicaciones_log` guarda cada intento de publicación directa, su red, estado, identificador externo, respuesta y error. La publicación directa queda habilitada sólo cuando la cuenta tiene OAuth y permisos reales configurados.
- `contenido_metricas` guarda métricas por pieza, red y fecha para alimentar alcance, impresiones, interacción, clics y crecimiento. Es un histórico de plataforma, separado de la atribución comercial de leads.
- La migración `025_content_operations_luli.sql` crea estas tablas idempotentemente. Las publicaciones, carruseles, historias y sus fechas siguen viviendo en `piezas_contenido`; no se duplica el calendario editorial.
- La publicación directa requiere una fila activa con `access_token` y `cuenta_externa_id`; el token se consulta únicamente server-side. Instagram requiere además una imagen accesible y LinkedIn usa el identificador de autor de organización/persona según la cuenta configurada.

### Tabla nueva

- `ai_dev_ejecuciones`: registra cada corrida de AI Dev por fase con modelos usados, estado, PR, tokens, costo estimado, usuario que inició y timestamps de inicio/fin.
- `preguntas_diagnostico`: banco de preguntas del diagnóstico comercial, filtrable por `activa=true` y por `momento` (`formulario|sesion`). La migración `019_preguntas_diagnostico_momento.sql` agrega la separación idempotente y deja las preguntas existentes como `formulario`.
- `diagnosticos`: instancia de diagnóstico vinculada a `leads.id`, con `token_publico` para formulario e informe sin login, `respuestas` en `jsonb`, `informe_hallazgos`, `modulos_sugeridos`, precios ideal/mínimo de desarrollo y mensual, y estado `pendiente`/`respondido`/`informe_generado`. Desde 2026-07-24, `informe_hallazgos` puede guardar `{ diagnostico_empresa, hallazgos, antes_despues, mapa_areas }` y `modulos_sugeridos` puede guardar `{ propuesta_software, condiciones_comerciales, modulos }`. `propuesta_software.roadmap_implementacion[]` admite `subtareas[]`; al marcar el lead como `ganado`, esas fases/subtareas se materializan en `proyectos`, `fases_proyecto`, `features` y `tareas`.
- `modulos_catalogo`: catálogo admin de módulos comerciales con categoría, descripción, precio ideal, precio mínimo, incremento mensual y estado activo. El catálogo base incluye módulos de CRM comercial, pedidos/operación, agenda, inventario, facturación/cobranzas, dashboard, portal multiusuario y automatizaciones.
- `diagnostico_sesiones`: sesión interna de relevamiento vinculada uno a uno a `diagnosticos`, con fecha, duración, decisor, notas y estado. Se usa para registrar la conversación comercial sin sobrecargar el formulario público.
- `diagnostico_areas`: áreas operativas relevadas dentro de una sesión, con responsable, volumen, herramientas actuales, proceso, dependencia crítica y nivel de fricción de 1 a 5.
- `diagnostico_metricas`: métricas cuantitativas internas asociadas a un diagnóstico y opcionalmente a un área. Guarda horas, cargas, errores, licencias, oportunidades y parámetros de cálculo según el tipo de pérdida. `costo_mensual_usd` y `costo_anual_usd` se calculan en código, no los inventa Claude.
- Las respuestas de las preguntas de ambos momentos se guardan en el mismo `diagnosticos.respuestas`, indexadas por `pregunta_id`. El endpoint público sólo devuelve y acepta claves de preguntas `momento='formulario'` (más `__contexto_adicional`); la sesión interna lee y guarda las claves `momento='sesion'` con acceso autenticado de admin/comercial.
- `cierres_mensuales`: histórico de cierres de caja mensuales con ingresos, egresos, margen, desvío versus el mes anterior, resumen generado y costo de IA.
- `sistemas_gestionados`, `sistemas_health_checks`, `sistemas_incidentes` y `sistemas_deploys`: migración `020_control_plane.sql`, catálogo y telemetría del control plane. La automatización `/api/sistemas/check-todos` corre cada cinco minutos mediante pg_cron y actualiza `automatizaciones.ultima_ejecucion`.

### Diagnóstico pago

- Esquema real verificado el 2026-07-21 vía OpenAPI de Supabase: `cobros.required` incluía `cliente_id`, por lo que `cobros.cliente_id` era NOT NULL antes de esta unidad.
- `cobros.cliente_id` pasa a nullable para permitir cobros reales de diagnóstico antes de que el lead exista como cliente formal.
- `cobros.lead_id` uuid nullable referencia `leads.id` con `ON DELETE SET NULL`; `cobros.tipo` admite también `diagnostico`.
- `comisiones.cliente_id` pasa a nullable y `comisiones.lead_id` uuid nullable referencia `leads.id` para comisiones generadas por diagnósticos pagos. La migración de reparación `014_repair_comisiones_lead_id.sql` existe porque el entorno real consultado el martes 21 de julio de 2026 todavía no tenía aplicada esa columna.
- `comisiones.tipo` admite `diagnostico` además de `venta`.
- `contratos.descuento_diagnostico_usd` numeric default `0` guarda el monto ya pagado por diagnóstico que se descontó del saldo del contrato final.
- `config_comisiones.comision_diagnostico_usd` numeric define el monto fijo de comisión pendiente que se genera al registrar un diagnóstico pagado.

### Preferencias de navegación

- `preferencias_navegacion` guarda la preferencia individual de cada usuario para el modo foco. Tiene una fila por `usuario_id`, `secciones_ocultas` como array de claves de navegación y `modo_foco_activo` como flag de presentación.
- La tabla referencia `usuarios.id` con `ON DELETE CASCADE`, tiene RLS habilitado y sus policies permiten seleccionar, insertar y actualizar únicamente la fila cuyo `usuario_id = auth.uid()`.
- El modo foco no modifica roles, permisos ni acceso directo a rutas. Las secciones válidas se filtran server-side según el rol del usuario y `Dashboard` nunca se oculta del menú.

### Modelo de diagnóstico cuantitativo

- La ruta autenticada `GET/PATCH /api/diagnostico/[token]/sesion` permite que el equipo cargue durante un Meet una sesión interna, áreas operativas y métricas con evidencia.
- Los tipos de métrica admitidos son `trabajo_manual`, `doble_carga`, `error_operativo`, `licencia`, `venta_perdida` y `otro`.
- Las fórmulas son determinísticas: horas por costo horario; cargas por minutos y costo horario; errores por costo unitario; licencias por porcentaje no utilizado; y oportunidades por ticket promedio y tasa de cierre. La IA interpreta y redacta, pero no altera los valores ni calcula el costo.
- El informe guarda la síntesis bajo `informe_hallazgos.cuantificacion` y la presenta como estimación con nivel de confianza. Este número no reemplaza el precio de desarrollo ni el mantenimiento de la propuesta.
