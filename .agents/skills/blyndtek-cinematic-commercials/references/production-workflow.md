# Workflow de producción cinematográfica

## Principio central

Construir primero un mundo consistente y después filmarlo. La calidad no se obtiene pidiendo un comercial completo; se obtiene bloqueando assets, dirigiendo tomas pequeñas y montando sólo los segundos que funcionan.

## Estructura de proyecto

```text
creative-production/higgsfield/<slug>/
├── brief.md
├── continuity.md
├── manifests/
│   ├── assets.json
│   └── shots.json
├── references/
├── prompts/
├── generations/
├── selects/
├── edit/
├── audio/
└── qa/
```

## Fase A — Brief y relato

1. Fijar objetivo, audiencia, país y único mensaje de marca.
2. Escribir una frase rectora y una sinopsis de tres oraciones.
3. Diseñar un arco: estado inicial, fricción, descubrimiento, cambio y firma.
4. Definir qué ve y oye la audiencia en cada beat.
5. Declarar qué datos son reales, ilustrativos o metafóricos.

## Fase B — Asset bible

### Producto/servicio

Blyndtek no vende un objeto. Representar el servicio mediante tres pruebas visuales:

- operación problemática observable;
- acto de medición/diagnóstico;
- sistema o decisión que devuelve visibilidad.

### Personajes

- Crear una hoja por personaje con un solo rostro canónico.
- Incluir close-up, frente, espalda y vestuario completo.
- Definir edad aparente, cabello, piel, silueta, accesorios y comportamiento.
- Separar cambios de vestuario en nuevos assets sin alterar identidad.
- Para personas reales, usar Soul ID y consentimiento documentado.

### Locaciones

- Empezar con un prompt corto para descubrir tono y paleta.
- Elegir un frame de estilo y transferir su color al resto.
- Generar plates en 3/4 para dar profundidad y rutas de movimiento.
- Eliminar textos, autos/personas aleatorias, reflejos imposibles y clutter que el video pueda mutar.
- Guardar versiones `raw`, `clean` y `approved`.

### Props e interfaces

- Crear props importantes por separado, grandes y simples.
- Pre-desenfocar texto ambiental que no necesita leerse.
- Componer pantallas, números, logo y UI en postproducción.
- Cuando una cabina o sala necesite cinco ángulos coherentes, generar un “statics video”, extraer frames y usarlos como referencias de posición.

## Fase C — Continuidad

Registrar por escena:

- momento del día y dirección de luz;
- posición y orientación de sujetos;
- vestuario, props en mano y estado del entorno;
- eje de acción y dirección de mirada;
- punto de entrada y salida de cada toma;
- estado emocional y respiración;
- frame anterior y frame siguiente.

La IA no conserva continuidad narrativa por sí sola. Si una escena cambia de lugar, insertar planos puente que expliquen el desplazamiento.

## Fase D — Shot design

Cada shot debe declarar:

- función narrativa;
- duración útil esperada;
- tamaño de plano, lente, altura y movimiento;
- blocking desde el primer frame;
- acción física y microactuación;
- luz y color;
- referencias y tags;
- sonido esperado;
- criterio observable de éxito;
- fallos prohibidos.

### Reglas de complejidad

- Máximo una acción física compleja por toma.
- Dividir una escena si combina diálogo, tránsito, props y cambio de cámara.
- Limitar el número de cortes explícitos; pedir cantidad exacta cuando importe.
- Usar un plano frontal/abierto primero para fijar quién está dónde.
- Evitar intersecciones, tráfico denso y multitudes salvo que sean el tema.
- Los encuadres cerrados reducen errores de física y continuidad.
- Dibujar trayectorias o marcar posiciones sobre el plate para movimientos difíciles.

## Fase E — Generaciones

1. Generar una prueba de movimiento por escena.
2. Revisar el fallo dominante, no todos a la vez.
3. Si el mundo se deforma, reparar el plate o reducir complejidad.
4. Si la identidad deriva, reforzar el asset o usar Soul ID.
5. Si la actuación es plástica, describir intención, pausa, mirada, respiración y peso corporal.
6. Generar cuatro variantes de una toma crítica y rescatar fragmentos.
7. Registrar el rango temporal útil de cada select.

Una generación no necesita ser perfecta de punta a punta. Puede aportar un único plano o dos segundos excelentes.

## Fase F — Montaje

- Armar primero continuidad geográfica y emocional.
- Usar J-cuts y L-cuts para suavizar clips generados por separado.
- Dar tiempo a un gesto o gag; no cortar porque la generación termina.
- Contrastar ritmos: observación, tensión, claridad.
- Crear pickups después de ver el rough cut.

## Fase G — Sonido y acabado

- Diseñar capas: room tone, operación, foley, respiración, diálogo y música.
- Mantener sonidos conectores entre tomas para que el mundo parezca continuo.
- Corregir diálogos en post si la toma visual es ganadora y el audio no.
- Unificar grano, contraste, nitidez y temperatura al final.
- Agregar subtítulos, copy, precio y logo de forma determinista.

## Gates de aprobación

- **G0 Concepto:** sin gasto.
- **G1 Style key:** aprobar paleta, textura y mundo.
- **G2 Asset lock:** aprobar personajes, locaciones y props.
- **G3 Motion test:** aprobar una prueba por escena.
- **G4 Production batch:** escalar únicamente direcciones ganadoras.
- **G5 Rough cut:** aprobar relato antes de upscale, audio final o pickups caros.
- **G6 Master:** aprobar marca, derechos y QA antes de publicar.
