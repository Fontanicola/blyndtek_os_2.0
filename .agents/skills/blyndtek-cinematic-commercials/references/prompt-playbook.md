# Arquitectura de prompts y selección de modelos

Consultar siempre el catálogo vivo de Higgsfield antes de ejecutar. Los nombres y límites cambian.

## Selección orientativa

| Necesidad | Primera opción | Criterio |
|---|---|---|
| Style frames y stills cinematográficos | Soul Cinema | Actuación y atmósfera vivas |
| Locaciones sin personas | Soul Location | Plates y ambientes coherentes |
| Identidad o edición con referencias | Nano Banana 2/Pro o Seedream | Consistencia y cambios localizados |
| Video serio multishot o 4K | Seedance 2.0 | Movimiento, referencias y resolución |
| Video máximo control óptico | Cinema Studio Video | Beauty shots o planos hero |
| Referencias multimodales rápidas | Gemini Omni | Hasta varias imágenes/video según esquema vivo |
| Spot rápido de marketing | Marketing Studio `tv_spot` | Velocidad; menos control fino y resolución limitada |
| Sonido, foley y ambiente | Seed Audio | Capas sonoras separadas |
| Evaluación de atención | Virality Predictor | Sólo sobre corte terminado |

No usar Marketing Studio como sustituto automático del pipeline cinematográfico. Para el flagship de Blyndtek, preferir assets bloqueados + tomas dirigidas. Usar `tv_spot` para exploración o variantes rápidas.

## Plantilla de prompt de toma

```text
REFERENCE DEFINITIONS
@tag: descripción visual estable y propósito de la referencia.

CONTINUITY LOCK
Estado de vestuario, props, orientación, luz, emoción y relación con la toma anterior.

TECHNICAL BLOCK
Photoreal cinematic commercial. Aspect ratio. Duration. Frame rate. Lens and camera height. Camera movement. Natural motion blur. Lighting. Color pipeline. Sound directive.

SHOT
Una acción clara desde el primer frame. Blocking espacial. Movimiento de cámara físicamente posible. Microactuación y eyelines. Peso, inercia, contacto y reflejos. Punto final editable.

SUCCESS CRITERIA
Qué debe mantenerse estable y qué evento debe leerse sin explicación.

SOUND
Ambiente, foley, respiración, diálogo o silencio.
```

## Style prefix de Blyndtek

Adaptar, no copiar ciegamente:

```text
Photoreal observational brand film. Real small-business operation, restrained premium direction, natural motivated light, organic color, soft contrast, physical cine lens, credible skin texture, subtle asymmetry, living eyes, visible breathing, real object weight and contact shadows. Precise geography and continuity. No synthetic corporate stock behavior. No floating interfaces. Exact brand graphics added in post.
```

## Actuación realista

Describir comportamiento verificable:

- pausa antes de contestar;
- mirada que abandona el monitor y vuelve;
- mandíbula que se tensa;
- respiración corta o pecho que baja;
- mano que duda antes de tocar el teléfono;
- peso que cambia de un pie al otro;
- reacción contenida en vez de sonrisa amplia.

Evitar “emocionado”, “preocupado” o “profesional” sin manifestación física.

## Cámara realista

- Distinguir dolly de zoom.
- Definir altura y dirección de viaje.
- Usar una sola motivación por movimiento.
- Añadir parallax, inercia y estabilización compatibles con el soporte.
- Pedir cámara quieta cuando el gesto humano ya aporta movimiento.
- No apilar orbit + crane + zoom + whip pan en una toma corta.

## Física y continuidad

Expresar positivamente el estado deseado:

- “dos manos visibles apoyadas sobre la carpeta”;
- “el teléfono permanece sobre la mesa durante toda la toma”;
- “la puerta queda abierta hacia el pasillo”;
- “la pantalla conserva la misma composición y brillo”;
- “la persona permanece sentada a la derecha del cuadro”.

## Texto y logos

No pedir interfaces completas, cifras, dashboards o logos exactos dentro del video generativo. Generar superficies limpias y trackeables; aplicar gráficos reales en post. Si un texto ambiental no debe leerse, usar masas tipográficas pre-desenfocadas.

## Audio

Separar cuando sea posible:

1. ambiente continuo;
2. foley puntual;
3. diálogo o voz;
4. música;
5. sting de marca.

El realismo de un spot depende tanto de room tone, respiración y textura mecánica como de la imagen.

## Reparación por síntoma

| Falla | Reparación antes de regenerar |
|---|---|
| Rostro cambia | Mejorar hoja/Soul ID; reducir perfil extremo; usar un solo sujeto |
| Fondo muta | Limpiar plate; borrar clutter; cerrar encuadre |
| Prop se transforma | Crear referencia propia; mantenerlo grande; dividir la acción |
| Sujetos cambian de asiento | Agregar blocking shot frontal y referencias de interior |
| Acting plástico | Escribir eyelines, pausas, respiración y reacción física |
| Cámara imposible | Elegir soporte, eje, altura y movimiento único |
| Texto ilegible | Retirarlo de generación y componerlo en post |
| Geografía confusa | Dibujar trayectoria, marcar posición o crear un ángulo adicional |
| Demasiados eventos | Separar en clips y montar |
