# Blyndtek OS — Metodología de construcción

Documento canónico para construir software en Blyndtek. Describe el método extraído del historial real del proyecto, de sus decisiones técnicas y de sus verificaciones. Su objetivo es que un desarrollador nuevo o una IA pueda trabajar con el mismo estándar sin depender de explicaciones informales.

## 1. Principios de trabajo

### Una unidad de trabajo, un resultado

- Un prompt representa una unidad de trabajo autocontenida: tiene un alcance, una causa o necesidad concreta y un resultado verificable.
- No se mezclan dos problemas independientes en una misma unidad. Si durante la implementación aparece otro problema, se registra como hallazgo y se separa, salvo que sea una dependencia necesaria para cerrar el alcance actual.
- El trabajo se empieza sólo después de leer los documentos indicados por el alcance. Como base mínima se consultan `docs/SPEC.md`, `docs/DATABASE.md`, `docs/DESIGN_SYSTEM.md` y `docs/SECURITY.md`.
- En el estado actual del repositorio `docs/SECURITY.md` todavía no existe. Esta ausencia es una brecha documental, no una autorización para asumir reglas de seguridad: debe crearse antes de usarlo como fuente canónica.
- Cada unidad termina actualizando `docs/PROGRESS.md` con qué se completó, qué archivos se crearon o modificaron, qué verificación se ejecutó y qué decisiones técnicas quedaron tomadas.

### Una fuente de verdad por dato

- El dato se carga una vez y fluye por los módulos; no se crean tablas paralelas para representar el mismo hecho.
- Finanzas deriva ingresos y egresos reales de `cobros` y `egresos`.
- Una transferencia entre cajas es un egreso real y un cobro real vinculados por `transferencias_caja`, no un ledger paralelo.
- Un contrato es el único punto activo para generar cuotas y suscripciones.
- Una propuesta aprobada deriva cotización, contrato, proyecto, fases, features y tareas de forma idempotente.
- Las piezas de contenido también funcionan como calendario editorial; no se duplica la agenda en otra fuente.
- El backend resuelve nombres y relaciones para la UI. La interfaz no debe mostrar UUIDs, nombres técnicos de tablas ni JSON crudo.

### La IA interpreta; el código decide

- Todo cálculo financiero, precio, porcentaje, vencimiento, avance, costo o saldo se realiza en código con datos reales.
- Claude redacta, sintetiza y mapea respuestas cualitativas a módulos existentes, pero no inventa precios ni altera fórmulas.
- La propuesta suma precios del catálogo real en código; la IA no define directamente el precio.
- Los agentes siguen el patrón cálculo determinístico + síntesis en lenguaje natural.
- Si una salida de IA es parcial o inválida, el backend valida, completa sólo con defaults seguros y registra el problema. No se persiste una salida incompleta como si fuera válida.

### La interfaz reduce trabajo

- La referencia visual vigente es una plataforma B2B compacta y operativa: densidad útil, acciones claras, tablas escaneables y estados semánticos.
- El breadcrumb es la referencia principal de ubicación; no se repite el nombre de la pantalla con headers internos.
- Se reutilizan componentes base (`EmptyState`, `SavingIndicator`, `Modal`, `Card`, `Button`, `DataTable`, `Toolbar`, `RowActions`) antes de crear variantes locales.
- Los estados y enums se traducen a castellano legible. No se muestran mayúsculas decorativas, emails pegados al nombre ni placeholders técnicos.

### Verificación exigible

Nunca se cierra una unidad con “debería funcionar”. La evidencia depende del tipo de trabajo:

- Base de datos: consultar el esquema real antes y después, comprobar constraints, FKs, policies y conteos relevantes.
- API: ejecutar requests reales con casos válidos, inválidos, permisos, duplicados y fallos parciales.
- UI: navegar la ruta real en anchos relevantes y verificar clicks, estados, loading, error, empty state y responsive.
- Finanzas: contrastar el resultado con filas reales y una suma independiente; no alcanza con que TypeScript compile.
- Gráficos: comparar cada serie contra el payload real, especialmente extremos, dominios, ejes y tooltips.
- PDF: descargar el archivo real, comprobar status/content type, abrirlo/renderizarlo y revisar que no haya cortes ni una maqueta diferente a la vista pública.
- Integraciones y cron: disparar manualmente el endpoint, confirmar efectos, idempotencia, pausa/configuración y trazabilidad.

## 2. Flujo de una unidad de trabajo

### Paso 1 — Contexto

1. Leer los documentos canónicos solicitados.
2. Leer los componentes, hooks, endpoints, helpers y migraciones explícitamente mencionados.
3. Revisar el estado del repositorio y no sobrescribir cambios ajenos.
4. Identificar la fuente de verdad del dato y los flujos que ya la consumen.
5. Revisar decisiones históricas relacionadas antes de elegir una implementación.

El contexto no es una formalidad: el proyecto tiene campos que fueron agregados en migraciones pero que, en algunos entornos, todavía no existían en el schema cache real. También hay nombres legacy como `cuenta_medio` que siguen siendo necesarios para leer datos históricos.

### Paso 2 — Diagnóstico de causa raíz

Antes de editar, formular una hipótesis comprobable y buscar evidencia:

- reproducir el error o el comportamiento;
- consultar la base, el endpoint o el log que participa;
- seguir el dato desde la escritura hasta la UI;
- distinguir causa de síntoma;
- revisar si existe una segunda implementación, caché, import o renderer paralelo.

La corrección debe atacar el punto que produce el comportamiento. Si la evidencia no alcanza, la unidad no está lista para cerrarse.

### Paso 3 — Implementación

- Cambiar lo mínimo necesario, reutilizando helpers y componentes existentes.
- Mantener los contratos públicos y los nombres de esquema salvo decisión explícita.
- Agregar validación server-side, autorización y fallbacks defensivos donde el entorno pueda estar desfasado.
- En operaciones multi-tabla sin transacción REST, registrar IDs creados y hacer rollback manual en orden inverso si falla un paso posterior.
- Para cron y automatizaciones, hacer la operación idempotente y registrar estado, error, timestamps y actividad.
- Para UI, seguir el orden breadcrumb → tabs → toolbar → listado/tabla → estado vacío/skeleton → acciones secundarias.

### Paso 4 — Verificación real

- Ejecutar `npm run lint`, `npx tsc --noEmit` cuando corresponda y `npm run build`.
- Ejecutar la prueba funcional que demuestra el alcance, no sólo una prueba de compilación.
- Inspeccionar visualmente las rutas o artefactos cuando el cambio sea visual.
- Registrar las limitaciones: si no hubo sesión autenticada, consulta a Supabase o navegación visual, debe decirse explícitamente.

### Paso 5 — Documentación y cierre

- Actualizar `docs/PROGRESS.md` con fecha, causa, implementación, archivos y verificación.
- Registrar en `docs/DECISIONS.md` toda regla que afecte arquitectura, seguridad, fuente de verdad, IA, datos o diseño.
- Actualizar `docs/DATABASE.md` cuando cambie el esquema, incluyendo columnas, constraints, FKs, semántica y verificaciones reales.
- Si corresponde, actualizar `docs/DESIGN_SYSTEM.md`, `docs/AUTOMATIZACIONES.md` o el documento de seguridad canónico.
- Revisar `git diff --check`, el diff final y el estado del worktree antes de commit/push.

## 3. Diagnóstico antes de corregir

El historial del proyecto demuestra que corregir el síntoma sin evidencia produce regresiones. Estos casos son reglas de trabajo permanentes.

### Fechas de egresos recurrentes

Síntoma: movimientos de meses históricos aparecían agrupados en julio de 2026.

Causa real: las instancias históricas tenían `fecha_pago` igual a la fecha actual del sistema, aunque su `fecha` correspondía a otro mes. El endpoint que usaba `fecha_pago` como fecha efectiva no estaba equivocado; coincidía con el criterio contable vigente de `historico_pl` y `calcularEgresosPeriodo`.

Regla resultante: antes de cambiar un filtro de fecha, comparar `fecha`, `fecha_pago`, la fecha efectiva del helper y el payload real. Al marcar una instancia histórica como pagada, `fecha_pago` debe tomar la fecha de esa instancia salvo que el usuario indique explícitamente otra.

### Duplicación de movimientos por caja

Síntoma: el modal mostraba el mismo egreso varias veces, aunque la tabla no tenía filas duplicadas.

Causa real: el endpoint consultaba por `caja_id` y por `cuenta_medio` legacy, concatenaba los resultados y no blindaba la respuesta final con una deduplicación por `id`. Una fila que cumplía ambos criterios entraba dos veces; el resumen también podía inflarse.

Regla resultante: las consultas compatibles con campos legacy deben combinarse con `Map`/`Record` indexado por ID, y la misma colección deduplicada debe alimentar tanto la lista como los KPIs. La compatibilidad de lectura no puede crear duplicados.

### `yAxisId` del margen en P&L

Síntoma: la línea de margen se disparaba a miles o caía artificialmente, aunque el tooltip mostraba valores monetarios pequeños.

Causa: se mezclaron escalas/ejes y luego se introdujeron puntos de padding en cero que reemplazaban o distorsionaban el último dato real. La verificación posterior contra `historico_pl` mostró además que algunos negativos eran reales; no todo valle visual era un bug.

Regla resultante: cada serie debe tener el eje correcto; ingresos, egresos y margen monetario comparten el eje USD, y sólo clientes usa un eje secundario sutil si realmente agrega valor. Nunca se agregan puntos falsos a una serie financiera para resolver bordes visuales. Curvas, dominios y áreas se validan contra cada punto real, incluido el último mes.

## 4. Migraciones y base de datos

### Esquema verificable

- Las migraciones se numeran secuencialmente y se nombran describiendo el cambio.
- Son idempotentes: `IF NOT EXISTS`, chequeo de columnas y detección de constraints antes de crear, alterar o reemplazar.
- Antes de escribir SQL adicional se consulta `information_schema`, la API REST/OpenAPI o el método de introspección disponible, y se compara con `docs/DATABASE.md`.
- No se asume que una columna existe porque aparezca en tipos, documentación o una migración anterior.
- Las reparaciones de schema deben reflejar exactamente lo aplicado en Supabase y dejar evidencia de la consulta posterior.
- Toda tabla nueva debe incluir sus policies RLS en la misma migración, o debe quedar documentado explícitamente por qué el acceso es exclusivamente server-side y cuál es la migración que completa las policies. Nunca se deja una tabla sensible sin una estrategia de acceso declarada.
- Toda nueva tabla incluye FKs, `ON DELETE` coherente, defaults, checks, índices necesarios y restricciones de unicidad cuando el negocio lo exige.

### Tres desfasajes reales entre documentación y Supabase

1. `comisiones.lead_id`: el código y la migración de diagnóstico lo asumían, pero el entorno real devolvió `42703 column comisiones.lead_id does not exist`. Se creó `014_repair_comisiones_lead_id.sql`, se agregó fallback de lectura y escritura, y se verificó el schema antes de continuar.
2. `contratos.descuento_diagnostico_usd`: estaba documentado y tipado, pero redefinir un contrato fallaba porque el schema real no lo tenía. Se creó `016_repair_contratos_descuento_diagnostico.sql`; el insert intenta con el campo y reintenta sin él sólo ante error de columna inexistente, dejando advertencia.
3. `cobros.lead_id`: una transferencia fallaba porque insertaba `lead_id: null` y la columna no existía en el schema cache real. Se creó `018_repair_cobros_lead_id.sql`, se agregó el campo y se centralizó un fallback defensivo para entornos atrasados.

Práctica preventiva: esquema real primero, migración idempotente después, tipos alineados, fallback sólo cuando sea seguro y verificación REST/introspection antes de afirmar que está aplicado.

### Integridad de operaciones

- Una cascada de aceptación o derivación registra IDs creados y revierte en orden inverso si falla un paso.
- Las operaciones deben poder reintentarse sin duplicar: buscar por vínculos naturales (`lead_id`, `cotizacion_id`, claves de semana o unique constraints) antes de insertar.
- Los estados derivados se calculan en lectura cuando persistirlos duplicaría la fuente de verdad.
- Los campos legacy se mantienen cuando todavía alimentan datos históricos; toda escritura nueva debe completar el campo canónico y el legacy necesario.

## 5. Gates de calidad

Una unidad no está terminada hasta cumplir los gates aplicables:

1. `npm run lint` sin warnings o errores nuevos.
2. `npx tsc --noEmit` cuando el cambio afecta tipos o contratos compartidos.
3. `npm run build` exitoso, incluyendo generación de páginas y route handlers.
4. `git diff --check` limpio.
5. Verificación funcional real del flujo solicitado.
6. Consulta de base o inspección de logs cuando el cambio toca esquema, datos o una integración.
7. Revisión visual real para UI, gráficos, PDF, responsive o estados de interacción.
8. `docs/PROGRESS.md` actualizado.
9. `docs/DATABASE.md` actualizado si hay esquema, y `docs/DECISIONS.md` actualizado si hay una regla arquitectónica.
10. Sin secretos, tokens, service role keys ni credenciales en código, logs o documentación pública.

Un build verde no reemplaza una prueba funcional. Una captura visual no reemplaza una consulta de datos. La evidencia debe corresponder al riesgo de la unidad.

## 6. Antipatrones conocidos

| Antipatrón | Consecuencia real | Regla resultante |
| --- | --- | --- |
| Corregir el síntoma sin reproducir | Se intentó arreglar el gráfico y se introdujeron padding points que falseaban julio | Diagnosticar con payload/log/base antes de editar |
| Asumir que docs y tipos reflejan Supabase | Columnas inexistentes rompieron Finanzas, transferencias y contratos | Verificar schema real y usar repairs idempotentes |
| Concatenar consultas legacy sin dedup | Movimientos y KPIs duplicados | Deduplicar por ID en la capa final |
| Usar la fecha actual para pagar una instancia histórica | Egresos viejos se agruparon en el mes actual | Fecha de pago por defecto igual a la fecha de instancia |
| Delegar precios o matemáticas a Claude | Propuestas con precios no confiables | IA mapea/redacta; código calcula con catálogo real |
| Renderizar texto real con generador de imágenes | Letras ilegibles y contenido genérico | Texto con código/ImageResponse; IA sólo fondo cuando corresponde |
| Usar fuente variable con Satori | Fallos de render de fuentes en producción | Bundlear pesos estáticos y pasarlos como ArrayBuffer |
| Mantener PDF y vista pública separados | Colores, fuentes y layout divergentes | HTML público como fuente única; print del mismo DOM |
| Duplicar headers internos | Ruido y ubicación ambigua | Breadcrumb global único |
| Importar rutas internas de Recharts | Charts vacíos por instancias mezcladas | Importar desde el barrel `recharts` y centralizar `chartTheme` |
| Usar middleware Edge con APIs Node | Caídas de producción en Vercel | Auth en layout/server o runtime compatible; no reintroducir middleware sin decisión |
| Dejar cron con config ad-hoc | Pausas y horarios inconsistentes | Toda automatización recurrente es una fila en `automatizaciones` |
| Ocultar fallos de una operación parcial | Sistemas quedan con registros a medias | Tracking de IDs, rollback manual y error real trazable |
| Mostrar datos técnicos en UI | UUIDs, enums, JSON y emails deterioran la operación | Backend resuelve nombres; UI castellano y estados legibles |

## 7. Fases de construcción de un proyecto nuevo

El orden probado en Blyndtek es:

### Fase 0 — Cimientos

1. Leer y estabilizar documentación funcional, esquema, seguridad y decisiones.
2. Preparar Next.js, TypeScript estricto, Tailwind, Supabase, variables de entorno y build.
3. Definir el design system y sus tokens antes de multiplicar pantallas.
4. Construir shell, sidebar, breadcrumb, layout responsive y componentes base.
5. Implementar autenticación, autorización por rol y estrategia RLS/server-side.
6. Cerrar lint, build y una navegación mínima real.

### Fase 1 — Módulos de mayor ROI

- Comercial: outbound/inbound, leads, clientes y transición comercial.
- Cotización/propuesta y contrato, porque conectan venta con cobros, proyecto y mantenimiento.
- Finanzas base: cobros, egresos, suscripciones, P&L y tesorería.
- Dashboard de lectura calculada sobre las mismas fuentes.

### Fase 2 — Entrega y operación diaria

- Proyectos, fases, features, tareas y sincronización feature-tarea.
- Roadmap público seguro, sin costos ni datos internos.
- Calendario y eventos, con integraciones desacopladas y deduplicación.

### Fase 3 — Capacidades secundarias y de soporte

- Notas, Wiki, Archivos, SaaS, soporte, handoff, revisiones de cuenta y upsell.
- Diagnóstico cuantitativo, sesión interna, informe consultivo y propuesta separada.
- Content Operations, identidad de marca e integraciones de redes.

### Fase 4 — Automatizaciones

- Primero existe el flujo manual y su fuente de verdad.
- Luego se agrega la automatización idempotente, con pausa, configuración, trazabilidad y feed de actividad.
- El cron debe poder dispararse manualmente para probarlo sin esperar el calendario.
- La publicación o sincronización externa se incorpora sólo cuando la cuenta, permisos y credenciales estén conectados.

## 8. Documentación viva

### `docs/SPEC.md`

Fuente de alcance funcional y orden macro de construcción. Define módulos, vistas, flujos de negocio, permisos esperados y automatizaciones de alto nivel. Se consulta al iniciar una unidad que agrega o cambia capacidad funcional.

### `docs/DATABASE.md`

Fuente legible del esquema esperado: tablas, campos, tipos, nullable, FKs, semántica, relaciones y notas operativas. Se actualiza con cada migración o repair. No reemplaza la consulta al schema real de Supabase.

### `docs/DECISIONS.md`

Bitácora de decisiones irreversibles o transversales. Registra por qué se eligió una arquitectura, qué alternativa se descartó y qué regla debe respetarse en adelante. No se usa para borrar historia; si una decisión cambia, se agrega una nueva entrada que la reemplaza explícitamente.

### `docs/DESIGN_SYSTEM.md`

Fuente única de criterios visuales y de interacción: layout, breadcrumb, color, tipografía, superficies, tablas, toolbars, menús, estados, iconografía, charts y checklist de QA visual. Todo componente nuevo debe seguirlo antes de inventar estilos locales.

### `docs/SECURITY.md`

Debe ser la fuente canónica de autenticación, autorización, RLS, datos públicos, secretos, Storage, integraciones y límites de exposición. Actualmente no existe en el repositorio; su creación es una tarea documental pendiente y no debe sustituirse con suposiciones.

### `docs/PROGRESS.md`

Registro cronológico de ejecución. Cada entrada debe indicar fecha, resultado, causa raíz cuando hubo bug, archivos creados/modificados, migraciones aplicadas, consultas reales y comandos de verificación. Es el lugar para saber qué está hecho y qué quedó pendiente.

### `docs/AUTOMATIZACIONES.md`

Describe jobs, cron, Edge Functions, horarios, placeholders y cómo activar o probar automatizaciones. Toda automatización nueva debe vincularse a la fila correspondiente de `automatizaciones` y registrar su última ejecución.

### Wiki / Constitución técnica

La Wiki sirve para estándares de trabajo y onboarding dentro de la plataforma. No reemplaza las fuentes versionadas del repositorio; cuando una regla se vuelve arquitectónica, primero debe quedar en `docs/DECISIONS.md` o en el documento canónico correspondiente.

## Regla final

Construir en Blyndtek significa preservar la fuente de verdad, demostrar la causa, cambiar con alcance controlado, verificar con evidencia y dejar el conocimiento escrito. Si una solución no puede explicar qué dato usa, qué protege, cómo se verifica y dónde queda documentada, todavía no está lista para producción.
