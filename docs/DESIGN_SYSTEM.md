# Blyndtek OS — Design System

Documento canónico del sistema de diseño visual de Blyndtek OS.

Este archivo consolida el estado actual real del código y reemplaza como referencia operativa las decisiones visuales dispersas en `docs/DECISIONS.md`. `docs/DECISIONS.md` sigue existiendo como bitácora histórica de por qué se llegó a cada criterio, pero la regla vigente para diseñar o construir UI nueva vive acá.

## 1. Filosofía general

- Blyndtek OS usa una UI sobria, técnica y plana: la jerarquía sale de tipografía, spacing, color semántico y borde fino, no de volumen visual exagerado.
- La app evita ruido decorativo. No se agregan gradientes libres, sombras pesadas, dobles superficies ni elementos “de adorno” fuera de casos funcionales concretos.
- El shell autenticado funciona como panel flotante sobre `canvas`; el contenido principal respira dentro de una superficie blanca única.
- La regla general es una sola superficie principal por región. Se evita el patrón “card dentro de card”, salvo excepciones explícitas como `MetricaCard`.
- Los componentes compartidos son obligatorios cuando existen. No se reimplementan variantes visuales de empty states, saving, iconos, charts, cards, modales o selects si ya hay una pieza base.

## 2. Tipografía

- La tipografía de la plataforma es `Inter`, definida en `tailwind.config.ts` como `fontFamily.sans`.
- La escala tipográfica vigente es:
- `xs`: `12/16`
- `sm`: `13/18`
- `base`: `14/20`
- `md`: `15/22`
- `lg`: `17/24`
- `xl`: `20/28`
- `2xl`: `24/32`
- `3xl`: `30/38`
- Los pesos semánticos reales del sistema son:
- cuerpo regular `400`
- `font-label` = `500`
- `font-title` = `600`
- Regla canónica de uso:
- cuerpo y texto corrido en regular
- labels, pills, metadatos y énfasis medio con `font-label`
- títulos, nombres de bloques y métricas principales con `font-title`
- Prohibido el uso de texto en mayúsculas (`uppercase`) en cualquier parte de la interfaz. El énfasis se logra con tamaño, peso semántico o color, nunca con transformación de mayúsculas.
- No se deben introducir `font-bold`, `font-semibold` o `font-medium` sueltos como convención de producto.
- Aclaración de nomenclatura: en decisiones viejas aparece `font-base`; la regla canónica actual es interpretarlo como cuerpo regular. El token configurado en Tailwind es `font-body`, pero el sistema operativo visualmente usa tres niveles: regular, `font-label` y `font-title`.
- Excepción explícita: Content Studio renderiza piezas generadas con `DM Sans`; eso no cambia la tipografía de la plataforma.

## 3. Geometría y radios

- Los radios canónicos salen de `tailwind.config.ts` y no se redefinen por módulo.
- `rounded-component = 6px`
- `rounded-card = 8px`
- `rounded-pill = 100px`
- Regla de uso:
- `rounded-component` para inputs, botones, rows activables, dropdown items y controles chicos
- `rounded-card` para paneles, cards, modales, tablas contenedoras y bloques de contenido
- `rounded-pill` para badges, chips, tabs pill, estados y toggles compactos
- No se vuelven a usar radios “blandos” o inconsistentes más grandes como lenguaje general de producto.

## 4. Elevación y sombras

- La superficie normal se define por borde, no por sombra.
- El borde estándar es `border-line-soft` para contención general y `border-line` para controles o énfasis un poco más marcado.
- Las sombras configuradas reales son:
- `shadow-soft = 0 1px 2px rgba(11,14,20,0.03)`
- `shadow-card = 0 1px 2px rgba(11,14,20,0.03)`
- `shadow-modal = 0 8px 32px rgba(11,14,20,0.12)`
- Regla canónica:
- `shadow-soft` y `shadow-card` son casi imperceptibles y solo acompañan superficies ya definidas por borde
- `shadow-modal` se reserva para overlays reales: modales, dropdowns, toasts y tooltips flotantes
- No se agregan sombras pesadas a cards normales para “hacerlas destacar”.

## 5. Paleta de colores

- La paleta base real del sistema, tomada de `tailwind.config.ts`, es:
- `carbon = #0B0E14`
- `signal = #1F44FF`
- `paper = #EEF0F4`
- `canvas = #F5F6FA`
- `white = #FFFFFF`
- `graphite = #5A6373`
- Tokens de apoyo existentes:
- `signal-hover = #1A38D6`
- `signal-light = #E8EEFF`
- `carbon-soft = #1C2030`
- `line = #D8DBE3`
- `line-soft = #EAECF0`
- Semánticos:
- `success = #38A169`
- `success-light = #F0FFF4`
- `danger = #E53E3E`
- `danger-light = #FFF5F5`
- `danger-hover = #B91C1C`
- `warning = #D97706`
- `warning-light = #FFFBEB`
- Reglas de uso:
- `carbon` para texto principal y fondos oscuros puntuales
- `graphite` para texto secundario y soporte
- `signal` para acción primaria, foco, selección activa y acento principal
- `paper` para fondos suaves, tabs inactivas, filas auxiliares y estados neutros
- `canvas` solo para el exterior del shell o áreas de respiro
- `white` para superficies principales
- `success`, `warning` y `danger` se usan con sus fondos light para estados semánticos; no se inventan tonos alternativos por pantalla
- Excepción documentada: AI Hub mantiene tratamiento cromático propio en violeta para su entrada de navegación y subárbol.
- Excepción aparte: la paleta `postit` queda reservada exclusivamente para Notas.

## 6. Iconografía

- La librería estándar de iconos de interfaz es `lucide-react`.
- La fuente única es `components/ui/icons.tsx`.
- Ese archivo reexporta todos los iconos con defaults unificados: tamaño base `20` y `strokeWidth = 1.5`.
- Los aliases semánticos del producto (`AgentesIcon`, `ArchivosIcon`, `CalendarioIcon`, `ClientesIcon`, `FinanzasIcon`, `OutboundIcon`, `WikiIcon`, etc.) también salen de ese mismo registro.
- Reglas:
- no se importan iconos directo desde `lucide-react` dentro de módulos si ya existe export centralizada
- no se dibujan SVG custom para iconos de interfaz
- los tamaños se ajustan solo por contexto, manteniendo el mismo trazo base
- Excepciones permitidas:
- logos de marca
- gráficos de datos
- fondos circulares de `MetricaCard`
- tiles de Archivos cuando forman parte del patrón visual de archivo

## 7. Sidebar y navegación

- La navegación canónica actual volvió al sidebar lateral; el dock inferior quedó revertido y no forma parte del shell vigente.
- La fuente única de navegación es `lib/navigation.ts`.
- La topbar y el sidebar leen la misma definición para evitar duplicación de labels.
- El sidebar desktop y el mobile drawer usan el mismo componente `Sidebar`, cambiando solo comportamiento y visibilidad.
- Desktop:
- ancho colapsado `76px`
- ancho expandido `220px`
- expansión por hover
- logo compacto al colapsar y logo completo al expandir
- Mobile:
- drawer lateral con backdrop sobre `bg-canvas/40`
- animación por `translate-x`
- cierre por backdrop o navegación
- Estructura:
- items top-level arriba
- secciones `Comercial`, `Entrega` y `Control` debajo
- footer con avatar, nombre, rol y menú de perfil/logout
- Patrones de navegación:
- rows con `rounded-component`
- activo por fondo blanco y color de acento
- hover sutil sobre blanco/paper
- el estado activo se resuelve por `pathname`
- AI Hub tiene tratamiento especial:
- vive como parent colapsable top-level
- usa violeta fijo en iconografía y fondo
- su subnavegación se renderiza como bloque interno diferenciado
- al entrar en `/ai-hub`, su parent queda expandido automáticamente

## 8. Topbar y shell general

- El shell autenticado usa `bg-canvas` por fuera y una sola superficie blanca flotante por dentro.
- La superficie principal del contenido está redondeada con `rounded-tl-card` y usa sombra leve para separar la app del fondo exterior.
- La topbar vive dentro de ese panel, no como barra global externa.
- La topbar actual es compacta: `h-8`, `sticky`, fondo blanco, `border-b border-line-soft` y `shadow-soft`.
- La topbar muestra el label de la página actual desde `lib/navigation.ts`.
- En mobile suma botón hamburguesa; en desktop no repite controles innecesarios.
- Regla global anti-header-duplicado:
- ningún módulo nuevo debe volver a renderizar un `h1` o subtítulo redundante solo para repetir el nombre de la sección ya visible en topbar
- el contenido debe arrancar desde la primera fila funcional real

## 9. Listas vs Cards

- El sistema usa ambos patrones, pero no indistintamente.
- Usar listas o tablas cuando:
- hay comparación entre muchos registros del mismo tipo
- importa escaneo rápido por columnas o filas
- la interacción principal es filtrar, editar, abrir o marcar estado
- Usar cards cuando:
- cada unidad necesita más contexto visual o jerarquía interna
- hay KPIs, highlights, previews o navegación por bloques
- la densidad es menor y el valor está en la lectura individual
- Reglas complementarias:
- en vistas densas de negocio, primero lista/tabla y no mosaico “decorativo”
- las cards clickeables deben usar el componente base `Card`
- el hover de `Card` es sutil: borde un poco más visible, fondo `paper` apenas perceptible y transición consistente
- se evita apilar card dentro de otra card salvo que una de las dos sea una unidad KPI o un bloque funcional realmente independiente

## 10. Estados vacíos y guardado

- Todo estado vacío debe usar `components/ui/EmptyState.tsx`.
- Patrón obligatorio:
- icono desde `components/ui/icons.tsx`
- título claro
- descripción breve opcional
- acción opcional
- contenedor dashed con `border-line`, fondo `paper/45` y centrado
- No se agregan mensajes sueltos tipo “No hay…” perdidos dentro de cards o tablas.
- Todo estado de autosave o persistencia liviana debe usar `components/ui/SavingIndicator.tsx`.
- Estados permitidos:
- `idle`
- `saving`
- `saved`
- La semántica visual real es:
- `idle`: pill neutra `paper`
- `saving`: pill `warning-light` + spinner
- `saved`: pill `success-light` + check

## 11. Prioridad y codificación visual de estado

- El sistema prioriza tinte completo, badge o pill semántica sobre adornos laterales decorativos.
- El patrón de “línea lateral de color” no es canónico para estado general de producto.
- Estados y severidades se codifican así:
- `signal-light` / `signal` para selección activa o estado informativo
- `success-light` / `success` para éxito, cobrado, guardado o positivo
- `warning-light` / `warning` para pendiente, atención o transición
- `danger-light` / `danger` para error, vencido, destructivo o negativo
- `paper` / `graphite` para neutralidad
- En tablas o listas, el énfasis de estado va en `Badge`, pill o tinte de fila completo cuando hay riesgo real.
- Ejemplos vigentes:
- cobros vencidos: fila teñida en `danger-light`
- egresos vencidos: fila teñida en `danger-light`
- estados generales: `Badge`
- En Proyectos, la prioridad visual pierde énfasis cuando una fase ya está en `lista`.

## 12. Formularios y selección de entidades

- Los formularios de la plataforma usan inputs blancos, borde `line`, radio `component` y foco `signal`.
- Los componentes canónicos de selección por entidad son:
- `EntitySelect`
- `EntityMultiSelect`
- Regla funcional obligatoria:
- el usuario elige por nombre legible
- los UUID se resuelven por detrás
- no se piden IDs manuales en UI
- Los dropdowns de selección usan:
- buscador interno
- contenedor flotante con `rounded-card`, borde `line-soft` y `shadow-modal`
- items con `rounded-component`
- selección con `signal-light`
- Regla de fechas:
- toda fecha sin hora real se maneja como string `YYYY-MM-DD` de punta a punta
- no se persiste pasando por `new Date("YYYY-MM-DD")` ni `toISOString()`
- si hay que operar en UI, se convierte localmente con helpers de `lib/utils/fechas.ts`

## 13. Tablas

- Las tablas del sistema priorizan lectura densa y contención limpia.
- Patrón vigente:
- wrapper con `overflow-x-auto`
- contenedor blanco con borde `line-soft`
- `thead` con fondo `paper`
- headers en `text-xs`, `font-label` y `text-graphite`, sin transformación a mayúsculas
- `tbody` blanco con divisores `line-soft`
- No se usan tablas con sombras protagonistas.
- Cuando la tabla vive dentro de un bloque reusable, ese bloque puede ir dentro de una `Card` con `padding="none"` y overflow oculto.
- Se permiten `thead` sticky en tablas largas cuando el contexto lo pide, como en `EgresosTabla`.
- Los estados vacíos dentro de tablas usan `EmptyState` embebido, no copy ad-hoc.
- En mobile o anchos reducidos, la tabla debe poder scrollear horizontalmente antes de romper densidad o semántica de columnas.

## 14. Gráficos de datos

- La fuente única de reglas visuales para charts es `lib/charts/chartTheme.ts`.
- Todo gráfico nuevo o ajustado debe tomar de ahí:
- colores
- gradientes
- grid
- ejes
- tooltip
- radios de barras
- stroke widths
- dots
- legend pills
- El lenguaje visual vigente de charts es más premium que la UI estructural:
- gradientes sobrios permitidos solo dentro de gráficos
- sombras SVG suaves permitidas solo dentro de gráficos
- series semánticas consistentes
- Las áreas deben sentirse orgánicas: usar curvas suaves para series positivas y evitar cierres verticales duros con máscaras/gradientes de desvanecimiento visual en los bordes. Nunca se agregan puntos falsos a una serie financiera para resolver un problema estético.
- Regla de superficie:
- la UI estructural sigue plana; los gradientes no salen del dominio chart
- La grilla estándar usa líneas horizontales sutiles; no se reintroducen grids verticales salvo justificación analítica concreta.
- Los tooltips deben seguir el estilo centralizado: tarjeta translúcida, borde suave, `shadow-modal`, blur y tipografía compacta.
- Aclaración importante: la paleta de `chartTheme.ts` es la fuente de verdad visual de charts aunque no replique 1:1 los hex de la UI estructural.

## 15. Modales y overlays

- `components/ui/Modal.tsx` es la base canónica de modales.
- Comportamiento obligatorio:
- cierre por backdrop
- cierre por `Escape`
- salida animada antes de desmontar
- backdrop oscuro translúcido con blur
- panel blanco con `rounded-card` y `shadow-modal`
- header con borde inferior y título `font-title`
- body scrollable con padding interno
- Tamaños estándar:
- `sm = 400px`
- `md = 560px`
- `lg = 720px`
- `xl = 960px`
- Dropdowns, popovers y menús contextuales siguen la misma lógica de overlay:
- borde `line-soft`
- fondo blanco
- `rounded-card`
- `shadow-modal`

## 16. Animaciones y transiciones

- Las duraciones canónicas en `tailwind.config.ts` son:
- `fast = 150ms`
- `normal = 250ms`
- El easing canónico para ambas es `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Reglas de uso:
- `fast` para hover, foco, apertura de dropdown, cambios de color y microinteracciones
- `normal` para transiciones de ancho, desplazamiento y cambios de layout visibles
- Animaciones definidas reales:
- `spinner`
- `overlay-in`
- `overlay-out`
- `modal-in`
- `modal-out`
- No se introducen animaciones largas o elásticas que rompan el tono técnico del producto.

## 17. Responsividad

- El shell trabaja mobile-first con adaptación por comportamiento, no con una UI paralela totalmente distinta.
- Reglas vigentes:
- el sidebar desktop se oculta en mobile y se reemplaza por drawer
- la topbar expone hamburguesa solo en mobile
- el panel principal mantiene scroll dentro de `main`, no en toda la ventana
- las tablas densas usan `overflow-x-auto`
- listas horizontales, tabs pills o grupos de filtros pueden scrollear horizontalmente cuando hace falta
- en mobile se prioriza continuidad funcional antes que forzar la misma densidad de desktop
- los componentes deben sostener legibilidad con una sola columna cuando el ancho cae, en especial formularios, panels de perfil y modales
- el roadmap público, los informes y otras vistas externas pueden tener reglas propias, pero la app autenticada debe seguir el mismo sistema de spacing, borde y tipografía

## Nota final

Este documento es la fuente de verdad para cualquier tarea nueva de UI en Blyndtek OS.

`docs/DECISIONS.md` sigue siendo la bitácora histórica de decisiones y reversions, útil para entender el contexto y el porqué. Pero antes de construir, ajustar o rediseñar cualquier componente visual, se debe consultar primero `docs/DESIGN_SYSTEM.md`.
