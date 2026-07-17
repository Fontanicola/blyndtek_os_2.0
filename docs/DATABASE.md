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
| presupuesto_estimado | numeric | No especificado |  |
| motivo_descarte | text | No especificado | solo si descartado |
| notas | text | No especificado |  |
| created_at | timestamptz | No especificado |  |
| updated_at | timestamptz | No especificado |  |

> Nota: el esquema documentado originalmente no incluía `ganado`; la definición efectiva usada por la app se amplió para reflejar la etapa de cierre antes de `descartado`.

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
| notas_arquitectura | text | No especificado |  |
| roadmap_token | text | No especificado | único, generado al crear |
| roadmap_slug | text | Sí | único, generado al crear a partir del cliente |
| url_sistema | text | Sí | URL pública o staging del sistema del cliente |
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
| created_at | timestamptz | No especificado |  |

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

**FKs:** `cliente_id` → `clientes.id`; `contrato_id` → `contratos.id`; `proyecto_id` → `proyectos.id`; `suscripcion_id` → `suscripciones.id`; `cotizacion_id` → `cotizaciones.id`

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| cliente_id | uuid | No especificado | FK → `clientes` |
| contrato_id | uuid | Sí | FK → `contratos` (nullable) |
| proyecto_id | uuid | Sí | FK → `proyectos` (nullable) |
| suscripcion_id | uuid | Sí | FK → `suscripciones` (nullable) |
| cotizacion_id | uuid | Sí | FK → `cotizaciones` (nullable) |
| concepto | text | No especificado |  |
| tipo | enum (`one_pay|hito|mantenimiento|brick`) | No especificado |  |
| monto | numeric (USD) | No especificado |  |
| fecha_emision | date | No especificado |  |
| fecha_vencimiento | date | No especificado |  |
| fecha_cobro | date | No especificado | cuándo entró la plata |
| cuenta_medio | text | No especificado | medio de cobro |
| tolerancia_dias | int | No especificado | días extra para considerar vencido |
| estado | enum (`pendiente|facturado|cobrado|vencido`) | No especificado |  |
| created_at | timestamptz | No especificado |  |

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

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| concepto | text | No especificado |  |
| categoria | enum (`dominios|hosting_infraestructura|herramientas_software|marketing_ads|impuestos_contable|sueldos_honorarios|comisiones|otro`) | No especificado |  |
| monto | numeric (USD) | No especificado |  |
| fecha | date | No especificado |  |
| recurrente | bool | No especificado |  |
| cuenta_medio | text | No especificado | medio de pago |
| pagado | bool | No especificado | si el egreso ya fue abonado |
| fecha_pago | date | No especificado | fecha en que se pagó |
| proyecto_id | uuid | No especificado | imputación opcional a proyecto |
| comision_id | uuid | Sí | FK → `comisiones` para egresos generados al pagar comisiones |
| notas | text | No especificado |  |
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

## Tabla: config_finanzas

**PK:** `id`

**FKs:** ninguna

**RLS esperada:** acceso para `admin` sí; acceso para `miembro` no.

| Campo | Tipo | Nullable | Notas |
| --- | --- | --- | --- |
| id | uuid | No | PK |
| caja_inicial | numeric | No especificado | editable, punto de partida del runway |
| updated_at | timestamptz | No especificado |  |

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

**Uso:** catálogo de agentes de Blyndtek OS. Por ahora contiene el agente `asesor-financiero`, pero la estructura queda lista para escalar a más agentes.

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
- `wiki_categorias.creado_por` → `usuarios.id`
- `wiki_articulos.categoria_id` → `wiki_categorias.id`
- `wiki_articulos.creado_por` → `usuarios.id`
- `agente_config.agente_id` → `agentes.id`
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
17. `egresos`
18. `config_finanzas`
19. `cajas`
20. `wiki_categorias`
21. `wiki_articulos`
22. `carpetas`
23. `archivos`
24. `tarjetas`
25. `agentes`
26. `agente_config`
27. `agente_analisis`

Nota: `usuarios` debe existir antes que `leads`, `proyectos`, `features`, `tareas`, `eventos` y `eventos_invitados`. `contratos`, `suscripciones` y `cobros` se apoyan en `clientes` y deben poder crearse con FKs nullable o deferrable según el orden de carga.

### Columnas nuevas registradas

- `proyectos.github_repo` texto nullable con formato `owner/repo`.
- `fases_proyecto.ai_dev_estado` texto enumerado para el estado de AI Dev.
- `fases_proyecto.ai_dev_iniciado_at` timestamptz nullable.
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

### Tabla nueva

- `ai_dev_ejecuciones`: registra cada corrida de AI Dev por fase con modelos usados, estado, PR, tokens, costo estimado, usuario que inició y timestamps de inicio/fin.
