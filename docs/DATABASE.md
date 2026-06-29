# Blyndtek OS — Esquema de Base de Datos

## Convenciones

- Nomenclatura en `snake_case`
- Tipos y campos transcritos exactamente desde la especificación

## Tabla: leads

**PK:** `id`

**FKs:** `responsable_id` → `usuarios.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| canal | enum (`outbound|inbound`) | No especificado |  |
| empresa | text | No especificado |  |
| rubro | text | No especificado |  |
| ubicacion | text | No especificado |  |
| contacto_1_nombre | text | No especificado |  |
| contacto_1_tel | text | No especificado |  |
| contacto_2_nombre | text | No especificado |  |
| contacto_2_tel | text | No especificado |  |
| web | text | No especificado |  |
| etapa | enum (`por_contactar|contactado|seguimiento|calificado|cotizacion|descartado`) | No especificado |  |
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
| presupuesto_estimado | numeric | No especificado |  |
| motivo_descarte | text | No especificado | solo si descartado |
| notas | text | No especificado |  |
| created_at | timestamptz | No especificado |  |
| updated_at | timestamptz | No especificado |  |

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
| estado | enum (`activo|inactivo`) | No especificado |  |
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
| hitos | jsonb | No especificado | array `[{nombre,pct,monto}]` |
| modulos | jsonb | No especificado | array `[{nombre,descripcion,features[]}]` |
| contexto_chat | jsonb | No especificado | historial del chat |
| adjuntos | jsonb | No especificado | metadata de archivos |
| entendimiento | text | No especificado |  |
| beneficios | jsonb | No especificado | array de beneficios comerciales |
| por_que_nosotros | jsonb | No especificado | diferenciadores de Blyndtek |
| justificacion_precio | text | No especificado |  |
| mantenimiento_detalle | jsonb | No especificado | detalle de qué incluye / no incluye |
| supuestos | jsonb | No especificado | supuestos comerciales y técnicos |
| condiciones_comerciales | jsonb | No especificado | condiciones típicas de la propuesta |
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

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` sí.

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
| notas_arquitectura | text | No especificado |  |
| roadmap_token | text | No especificado | único, generado al crear |
| roadmap_publico_activo | bool | No especificado |  |
| created_at | timestamptz | No especificado |  |

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
| created_at | timestamptz | No especificado |  |

## Tabla: cobros

**PK:** `id`

**FKs:** `cliente_id` → `clientes.id`; `proyecto_id` → `proyectos.id`; `suscripcion_id` → `suscripciones.id`; `cotizacion_id` → `cotizaciones.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| cliente_id | uuid | No especificado | FK → `clientes` |
| proyecto_id | uuid | Sí | FK → `proyectos` (nullable) |
| suscripcion_id | uuid | Sí | FK → `suscripciones` (nullable) |
| cotizacion_id | uuid | Sí | FK → `cotizaciones` (nullable) |
| concepto | text | No especificado |  |
| tipo | enum (`one_pay|hito|mantenimiento|brick`) | No especificado |  |
| monto | numeric (USD) | No especificado |  |
| fecha_emision | date | No especificado |  |
| fecha_vencimiento | date | No especificado |  |
| fecha_cobro | date | No especificado | cuándo entró la plata |
| estado | enum (`pendiente|facturado|cobrado|vencido`) | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: egresos

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| concepto | text | No especificado |  |
| categoria | enum (`sueldos|pauta|fijos|dev|otro`) | No especificado |  |
| monto | numeric (USD) | No especificado |  |
| fecha | date | No especificado |  |
| recurrente | bool | No especificado |  |
| notas | text | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: suscripciones

**PK:** `id`

**FKs:** `cliente_id` → `clientes.id`; `proyecto_id` → `proyectos.id`; `cotizacion_id` → `cotizaciones.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| cliente_id | uuid | No especificado | FK → `clientes` |
| proyecto_id | uuid | Sí | FK → `proyectos` (nullable) |
| cotizacion_id | uuid | No especificado | FK → `cotizaciones` |
| tipo | enum (`mantenimiento|brick`) | No especificado |  |
| monto_mensual | numeric | No especificado |  |
| ciclo | enum (`mensual|anual`) | No especificado |  |
| fecha_inicio | date | No especificado |  |
| proxima_cobro | date | No especificado |  |
| estado | enum (`pendiente|activa|pausada|baja`) | No especificado |  |
| fecha_baja | date | No especificado |  |
| motivo_baja | text | No especificado |  |
| created_at | timestamptz | No especificado |  |

## Tabla: config_finanzas

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| caja_inicial | numeric | No especificado | editable, punto de partida del runway |
| updated_at | timestamptz | No especificado |  |

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
| google_calendar_token | text | No especificado | OAuth, encriptado |
| activo | bool | No especificado |  |
| created_at | timestamptz | No especificado |  |

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
- `features.proyecto_id` → `proyectos.id`
- `features.responsable_id` → `usuarios.id`
- `cuentas_servicios.proyecto_id` → `proyectos.id`
- `tareas.proyecto_id` → `proyectos.id`
- `tareas.responsable_id` → `usuarios.id`
- `eventos.usuario_id` → `usuarios.id`
- `cobros.cliente_id` → `clientes.id`
- `cobros.proyecto_id` → `proyectos.id`
- `cobros.suscripcion_id` → `suscripciones.id`
- `cobros.cotizacion_id` → `cotizaciones.id`
- `suscripciones.cliente_id` → `clientes.id`
- `suscripciones.proyecto_id` → `proyectos.id`
- `suscripciones.cotizacion_id` → `cotizaciones.id`

### Orden de creación de tablas

Orden sugerido respetando dependencias de FK:

1. `usuarios`
2. `leads`
3. `clientes`
4. `cotizaciones`
5. `proyectos`
6. `features`
7. `cuentas_servicios`
8. `tareas`
9. `eventos`
10. `suscripciones`
11. `cobros`
12. `egresos`
13. `config_finanzas`

Nota: `usuarios` debe existir antes que `leads`, `proyectos`, `features`, `tareas` y `eventos`. `suscripciones` y `cobros` tienen una referencia circular potencial que hay que resolver con FK nullable o deferrable.
