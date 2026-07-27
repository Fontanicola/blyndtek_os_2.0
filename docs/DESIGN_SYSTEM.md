# Blyndtek OS — Sistema de diseño

Documento canónico para construir y revisar la interfaz de Blyndtek OS. La referencia visual es una plataforma B2B premium, compacta y operativa: densa como Procore, clara como Linear y prolija como Attio. Todo criterio nuevo debe seguir este documento por encima de decisiones históricas aisladas.

## Visión y principios

- Regla madre: si una decisión visual no ayuda a trabajar más rápido, entender mejor o reducir ruido, sobra.
- Densidad operativa: tablas compactas, filas bajas, headers chicos, toolbars en una sola fila y acciones secundarias ocultas en menús.
- La metadata vive en badges o columnas; no se convierte en párrafos decorativos.
- Una acción primaria por pantalla. El resto son acciones secundarias o viven en el menú de tres puntos.
- Consistencia por encima de creatividad aislada: todos los módulos comparten header, breadcrumb, toolbar, buscador, filtros, tablas, menús, estados, skeletons y empty states.
- La interfaz comunica estado y próxima acción antes que decoración.
- El contenido debe ser escaneable en una pantalla de laptop normal sin espacios muertos enormes ni bloques innecesariamente altos.
- Una misma entidad debe conservar el mismo nombre, color, icono y patrón de interacción en todos los módulos.

## Layout

- El fondo general es blanco. El contenido principal es blanco. Cards y tablas son blancas con borde sutil.
- Los módulos tabulares usan el ancho útil disponible; no se encierra una tabla operativa en un `max-width` angosto.
- El padding lateral es consistente en todo el shell y se adapta al ancho disponible.
- No se permite scroll horizontal en la página. Si una tabla no puede comprimirse sin perder semántica, el scroll vive dentro del contenedor de la tabla.
- El espaciado vertical es sobrio: el cuerpo no queda pegado al breadcrumb, pero tampoco se crean separaciones ornamentales.
- No se agregan doble separador ni superficies anidadas sin una razón funcional.
- El layout de una pantalla nueva sigue este orden: breadcrumb, tabs si aplican, toolbar, contenido principal y estados correspondientes.
- La región principal debe priorizar una tabla o listado cuando el usuario necesita comparar registros; las cards quedan para resumen, KPIs, detalle y bloques claramente separables.

## Header y breadcrumb

- El breadcrumb navegable es la referencia principal de ubicación.
- Ejemplos válidos: `Dashboard`, `Clientes`, `Clientes > ARC Global`, `Clientes > ARC Global > Contrato`, `Proyectos > Funes Exclusivos > Features`, `Finanzas > Tesorería`, `Leads > nombre del lead`.
- Cada segmento que representa una ruta navegable es un link.
- El segmento actual puede mostrarse sin link y con mayor contraste.
- Ninguna pantalla repite como título el nombre que ya comunica el breadcrumb.
- Están prohibidos los headers internos duplicados: no se renderiza un título grande sólo para repetir la sección actual.
- El header global debe ser compacto y dejar el protagonismo al contenido operativo.
- El topbar deja de ser la referencia primaria de ubicación: el breadcrumb pasa a ser la navegación contextual canónica.
- Cuando una pantalla necesita un título adicional, debe explicar la tarea o el contenido, no repetir el nombre de la ruta.

## Color

### Acción principal

- El color de acción principal es `#263a6d`.
- Se usa en botones primarios, links, tabs activas, iconos activos, flechas de despliegue, controles seleccionados y hover relevante.
- El color de acción debe ser estable en todos los módulos; no se reemplaza por otro azul según el prompt que construyó una pantalla.

### Superficie de acento

- La superficie de acento es `#dfeeff`.
- Se usa para filas desplegadas, filas seleccionadas, fondo de tab activa, badges suaves y hover de fila.
- Regla dura: `#dfeeff` nunca es fondo de botón primario ni color de texto de link. Es un tono claro y falla como color de acción con contraste suficiente.

### Neutros y estados

- La escala neutra es slate: texto principal oscuro, texto secundario slate medio, bordes slate claros y fondos auxiliares muy claros.
- Verde sólo comunica aprobado, activo, cobrado, guardado o resultado positivo.
- Rojo sólo comunica crítico, error, destructivo o vencimiento.
- Ámbar sólo comunica programado, pendiente o advertencia.
- Azul informativo sólo se usa para información puntual; nunca reemplaza al color de acción principal.
- Gris neutro comunica cerrado, archivado o sin estado activo.
- No se usan colores fuertes sin significado semántico.
- Están prohibidos los botones negros, el azul genérico como acción principal y los fondos saturados para decorar.
- Excepción única mantenida: AI Hub conserva su identidad violeta propia en el árbol de navegación y sus estados específicos.

## Tipografía

- La tipografía debe ser nítida, compacta, empresarial y legible en tablas.
- No se usan títulos enormes en módulos operativos.
- La metadata secundaria usa slate claro y un tamaño menor.
- En la UI, los usuarios se muestran sólo por nombre. El email puede aparecer en perfil, login y formularios de selección donde sea necesario identificar una cuenta.
- La escala se mantiene compacta y consistente: cuerpo, metadata, labels y títulos de bloque deben conservar sus tamaños entre módulos.
- Los títulos de pantalla no compiten con el breadcrumb; los títulos de card o bloque son breves.
- Regla mantenida de Blyndtek: está prohibido el texto en mayúsculas en toda la interfaz, incluidos headers de tabla, labels, badges y estados.
- El énfasis se logra con tamaño, peso semántico, espaciado y color; nunca con `uppercase` ni `text-transform: uppercase`.
- No se usan pesos sueltos arbitrarios si existe una clase semántica del sistema.
- Los nombres propios y marcas conservan su capitalización correcta.
- Content Studio puede usar una tipografía específica en imágenes generadas, pero no modifica la tipografía de la plataforma.

## Superficies, bordes y radios

- El radio estándar de tablas, cards, inputs y botones es `rounded-md`.
- Se prohíben radios muy suaves tipo `rounded-2xl` y cualquier radio aislado que rompa la lectura compacta.
- Los bordes estándar son `border-slate-200` o el token equivalente del sistema.
- Los separadores internos usan el mismo lenguaje de borde fino.
- Las superficies normales se definen por borde, no por sombra.
- Las sombras son mínimas y se reservan para dropdowns, tooltips, modales y overlays que realmente flotan.
- Se prohíben cards flotantes con sombra pesada.
- No se usan fondos grises grandes para crear jerarquía si un borde, una fila de acento o el espaciado resuelven la diferencia.
- El contenido interno de una card no se convierte automáticamente en otra card. Se usan espaciado, tipografía y separadores.

## Botones

- Primario: fondo `#263a6d`, texto blanco, `rounded-md`, altura compacta y una sola acción principal por pantalla.
- Secundario: fondo blanco, borde slate, texto slate y hover suave.
- Ghost: sin superficie protagonista, para acciones auxiliares y contextos de baja jerarquía.
- Peligroso: texto rojo o item rojo dentro de un menú. Se evitan botones rojos grandes salvo confirmaciones críticas.
- Los botones tienen labels en castellano y un icono sólo cuando mejora el reconocimiento.
- No se colocan varios botones protagonistas en una misma fila de tabla.
- En tablas, las acciones se agrupan en el menú de tres puntos al final de la fila.
- Los estados de carga, guardado y éxito deben conservar el ancho y la altura del control para evitar saltos de layout.

## Links

- Todo texto clickeable con función de enlace usa el color de acción principal y subrayado.
- Aplica a nombres de registros en tablas, archivos adjuntos, relaciones entre módulos, breadcrumbs y accesos como `Ver detalle`.
- No aplica a botones, tabs, sidebar ni menús de acciones, que tienen sus propios estados visuales.
- Un texto que navega no puede parecer un texto estático de color slate sin señal de interacción.

## Toolbar

- La toolbar ocupa una sola fila siempre que el ancho lo permita.
- Orden canónico: buscador flexible, filtros, acciones secundarias y acción primaria.
- El buscador es uniforme en todos los módulos: lupa a la izquierda, placeholder claro en castellano, borde slate, `rounded-md` y altura compacta.
- El botón de filtros usa un icono de sliders y el texto `Filtros`.
- Los filtros activos deben ser visibles y removibles sin abrir varias capas de navegación.
- Las acciones secundarias no deben competir visualmente con el buscador ni con la acción primaria.
- En anchos reducidos, la toolbar puede envolver de forma controlada, pero no se convierte en varias filas desordenadas ni desplaza indefinidamente la acción primaria.

## Tablas

- Contenedor con borde slate y `rounded-md`.
- Header con fondo muy claro y texto compacto, sin transformación a mayúsculas.
- Filas bajas, separadores finos y alto contraste suficiente para escanear.
- No se usan sombras fuertes.
- No se colocan cards dentro de celdas.
- Se evitan columnas anchas o prescindibles; la información secundaria va a detalle o menú.
- Las acciones siempre terminan en un menú de tres puntos.
- El scroll horizontal es el último recurso y vive sólo dentro de la tabla, nunca en la página completa.
- No se usa paginación hardcodeada o falsa. Si el volumen necesita paginación, debe ser real y mantener el contexto de filtros.
- Las filas desplegables abiertas usan `#dfeeff` y flecha en `#263a6d`; las cerradas quedan blancas.
- Una fila seleccionada y una fila desplegada deben ser distinguibles sin sumar bordes gruesos.
- Las fechas y montos se alinean de forma consistente. Los montos no se cortan ni se parten en lugares ilegibles.

## Menús de tres puntos

- Son controles sueltos, sin caja visible permanente y sin aumentar artificialmente la altura de la fila.
- Abren al click, cierran al click afuera y con Escape.
- Se renderizan por encima del contenido y nunca quedan recortados por `overflow` de la tabla o card.
- El orden recomendado es: ver, editar, duplicar o actualizar, cambiar estado, descargar y acciones destructivas al final.
- Las acciones destructivas deben estar separadas visualmente y pedir confirmación cuando corresponda.
- El menú no reemplaza una acción primaria que el usuario necesita repetir constantemente; esa acción debe vivir en la toolbar o en el flujo principal.

## Cards

- Las cards se usan para KPIs, resumen de perfil, empty states, bloques de detalle y paneles colapsables.
- No se usan para listados que naturalmente son tablas ni para metadata que cabe en una fila.
- Una card debe representar una unidad comprensible y tener una jerarquía interna clara.
- La card no necesita sombra para parecer clickeable: usa borde, hover sutil y transición.
- No se anidan cards completas salvo que la unidad interna sea genuinamente independiente, como un KPI dentro de una fila de métricas.
- Los títulos son compactos y no duplican el breadcrumb.

## Skeletons

- Los skeletons deben parecerse a la pantalla final: breadcrumb, tabs si aplican, toolbar, tabla y cards KPI.
- Usan fondo slate claro, `rounded-md` y animación suave.
- No se usan spinners grandes como carga principal de una página de datos.
- El skeleton conserva la densidad esperada y evita que la pantalla salte al cargar.
- Si una acción puntual está procesando, se usa el estado de carga del botón o `SavingIndicator`, no un overlay general innecesario.

## Formularios y modales

- Los formularios son compactos, están validados y no muestran campos irrelevantes para la tarea actual.
- Las labels están en castellano y describen la intención del negocio, no el nombre técnico de la columna de base.
- Los formularios inline arrancan ocultos y se abren con una acción `+` o equivalente.
- Los errores son humanos, específicos y accionables.
- Los modales se usan sólo cuando la acción necesita foco, edición concentrada o confirmación crítica.
- Cierran con Escape y click afuera cuando no hay una acción destructiva en curso.
- Nunca se anidan modales. Si un flujo necesita otra selección, se resuelve dentro del modal actual o con una navegación clara.
- Los campos de selección muestran nombres legibles y resuelven IDs por detrás.

## Estados y badges

- Nunca se muestran valores crudos de enum. Todo estado se traduce a castellano legible.
- Los badges son compactos, tienen fondo suave, borde sutil y texto legible.
- Un badge no domina la tabla ni reemplaza información esencial.
- Vencidos: se muestra un icono rojo con tooltip junto al estado; no se repite la palabra `Vencido` como texto adicional.
- Estados de éxito, advertencia, peligro e información respetan la semántica de color y no se reutilizan como decoración.
- Las filas críticas pueden recibir un tinte suave completo cuando ayuda a priorizar, sin convertir la tabla en un collage de colores.

## Iconografía

- Los iconos son lineales, de tamaño consistente y slate por defecto.
- Un icono activo usa el color de acción principal; AI Hub mantiene su excepción violeta.
- La única fuente de iconos de UI es `lucide-react` centralizada en `components/ui/icons.tsx`.
- Los módulos no importan iconos directamente si ya existe una exportación semántica en el registro centralizado.
- Se prohíben SVG dibujados a mano para iconos de interfaz.
- Los logos de marca no son iconos de UI y pueden usar sus assets SVG reales.
- El grosor de trazo y el tamaño deben ser uniformes dentro de una misma superficie de navegación, tabla o toolbar.

## Idioma

- Toda la UI visible está en castellano.
- Se prohíbe inglés visible salvo nombres propios, marcas, URLs o términos que sean el nombre oficial de una integración.
- Se prohíben placeholders técnicos, nombres de tablas, UUIDs y JSON crudo en pantalla.
- Los mensajes de error deben explicar qué ocurrió y cómo continuar.
- Los usuarios se muestran por nombre; el email sólo aparece en perfil, login y selección de cuentas cuando agrega valor.

## Componentes obligatorios mantenidos de Blyndtek

- `components/ui/EmptyState.tsx` es obligatorio para todo estado vacío. No se reimplementan mensajes sueltos como `No hay datos` o `Todavía no hay registros`.
- `components/ui/SavingIndicator.tsx` es obligatorio para todo autosave o persistencia liviana. No se reimplementan variantes de `Guardando` o `Guardado` a mano.
- `components/ui/icons.tsx` es el registro centralizado de iconos de UI.
- `lib/charts/chartTheme.ts` es la fuente única de paleta, ejes, grid, tooltip, gradientes, radios y puntos para gráficos nuevos.
- Los componentes base de botones, cards, modales, badges, selects y tablas deben reutilizarse antes de crear una variante local.

## Gráficos

- Todo gráfico nuevo usa `lib/charts/chartTheme.ts`.
- El tema centraliza colores, opacidades, gradientes, grid horizontal, ejes, tooltip, radios de barras, grosor de líneas, puntos y leyendas.
- Los gráficos son complementarios a la lectura operativa; nunca reemplazan una tabla cuando el usuario necesita exactitud.
- Las barras usan colores sólidos y radios moderados.
- Las áreas y líneas usan opacidades sobrias, sin degradados decorativos fuera del lenguaje aprobado por `chartTheme`.
- Las curvas deben ser fieles a los datos reales y no generar picos o valles artificiales.
- Los ejes secundarios se mantienen sutiles o se convierten en un indicador separado cuando agregan ruido.
- Los tooltips son overlays con elevación real, título claro y valores alineados.

## Anti-patrones prohibidos

- Botones negros.
- Azul genérico como acción principal fuera de `#263a6d`.
- Fondos grises grandes e innecesarios.
- Cards enormes donde naturalmente corresponde una tabla.
- Cards dentro de cards sin una unidad funcional separable.
- Headers internos duplicados.
- Toolbars en varias filas sin una razón responsive real.
- Muchos botones visibles por fila.
- Emails pegados al nombre del usuario.
- Links azules por defecto que no usan el color de acción principal.
- Texto clickeable sin subrayado cuando funciona como link.
- Tres puntos dentro de cajas visibles o que rompen la altura de la fila.
- Dropdowns que no cierran al click afuera o con Escape.
- La palabra `Vencido` repetida como estado y alerta.
- Placeholders técnicos.
- Inglés visible no justificado.
- JSON crudo en pantalla.
- Scroll horizontal provocado por columnas infladas.
- Paginación falsa o hardcodeada.
- Mayúsculas en cualquier parte de la UI.
- SVG dibujados a mano para iconos de interfaz.
- Empty states con ilustraciones decorativas genéricas o emojis.
- Reimplementaciones locales de `EmptyState`, `SavingIndicator` o estilos de chart.

## Reglas para pantallas nuevas

Toda pantalla nueva debe seguir este orden y validar cada punto:

1. Breadcrumb navegable como referencia de ubicación.
2. Tabs sólo si existen subáreas reales; no se agregan tabs decorativas.
3. Toolbar en una sola fila: buscador, filtros, acciones secundarias y una acción primaria.
4. Tabla o listado compacto cuando el usuario compara registros; cards sólo cuando la unidad lo justifica.
5. Empty state real con `EmptyState` si no hay registros.
6. Skeleton equivalente a la pantalla final durante la carga.
7. Acciones secundarias en menú de tres puntos.
8. Links subrayados y color de acción principal.
9. Estados traducidos al castellano y codificados semánticamente.
10. Usuarios mostrados sólo por nombre salvo excepciones justificadas.

## Checklist de QA visual

Antes de dar por terminada una pantalla, verificar:

- El breadcrumb ubica al usuario y cada segmento navegable funciona.
- No existe un título que repita el breadcrumb ni un header interno duplicado.
- El fondo y las superficies son blancos, con bordes slate y sin sombras pesadas.
- El ancho útil permite trabajar sin un `max-width` innecesariamente angosto.
- La densidad es operativa: filas bajas, headers compactos y sin espacios muertos.
- Hay una sola acción primaria claramente dominante.
- La toolbar sigue el orden buscador, filtros, secundarias y primaria.
- El buscador tiene lupa, placeholder claro, borde, `rounded-md` y altura consistente.
- Las tablas tienen borde, separadores finos, header suave y acciones en tres puntos.
- El scroll horizontal, si es inevitable, está contenido dentro de la tabla.
- Los dropdowns cierran con click afuera y Escape y no se recortan.
- Los radios usan `rounded-md`; no hay `rounded-2xl` ni superficies excesivamente suaves.
- No hay cards dentro de cards sin una razón funcional.
- Los estados tienen badge o tinte semántico y están traducidos al castellano.
- Los vencidos usan icono con tooltip y no repiten la palabra como texto adicional.
- No hay texto en mayúsculas ni clases `uppercase`.
- No hay inglés visible, JSON crudo, UUIDs ni placeholders técnicos.
- Los nombres de usuario no muestran el email salvo en excepciones justificadas.
- Los links son subrayados y usan `#263a6d`.
- Todos los iconos vienen de `components/ui/icons.tsx` y mantienen tamaño y trazo.
- Los estados vacíos usan `EmptyState` y no incluyen emojis ni ilustraciones genéricas.
- Los autosaves usan `SavingIndicator` y no generan saltos de layout.
- Los skeletons representan breadcrumb, toolbar, tabla y KPIs de la pantalla real.
- Los gráficos importan `chartTheme` y no tienen colores, tooltips o ejes hardcodeados inconsistentes.
- AI Hub conserva su violeta sólo donde corresponde y no contamina el resto de la navegación.
- La pantalla se revisó en desktop, sidebar expandido, sidebar colapsado y un ancho reducido.
- La pantalla se revisó con datos reales, estado vacío, error, carga y una interacción completa.
