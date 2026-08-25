# QA de tomas y masters

Puntuar cada dimensión de 0 a 5. Una toma con un hard fail se rechaza aunque el promedio sea alto.

## Scorecard de toma

| Dimensión | Pregunta |
|---|---|
| Identidad | ¿Rostro, cuerpo, vestuario y accesorios permanecen estables? |
| Física | ¿Peso, contacto, manos, telas, reflejos e inercia son creíbles? |
| Geografía | ¿Se entiende dónde está cada persona/objeto y hacia dónde se mueve? |
| Actuación | ¿Hay intención, eyeline, respiración y microgestos naturales? |
| Cámara | ¿Movimiento, lente, foco y motion blur parecen físicamente filmados? |
| Luz/color | ¿La luz está motivada y coincide con escena y tomas vecinas? |
| Arte | ¿Plate, props y superficies permanecen coherentes? |
| Marca | ¿La toma expresa Blyndtek sin recurrir a clichés tecnológicos? |
| Edición | ¿Tiene entrada, acción útil y salida con handles? |
| Sonido | ¿El audio es creíble o puede reemplazarse limpiamente? |

Clasificación:

- `select`: 42–50, ningún hard fail.
- `select parcial`: 34–41, registrar timecode útil.
- `repair`: 28–41 con una falla corregible.
- `reject`: menos de 28 o cualquier hard fail.

## Hard fails

- identidad visible cambia;
- manos, dientes o articulaciones distraen;
- logo o interfaz falsa se presenta como real;
- texto inventado o claim no aprobado;
- objeto aparece/desaparece sin motivación;
- sujeto atraviesa geometría o cambia de lado imposible;
- mirada directa a cámara no solicitada;
- estética de stock corporativo o tecnología genérica;
- material de tercero sin derechos;
- número o caso no verificable.

## QA de secuencia

Revisar además:

- eje de acción y dirección de miradas;
- continuidad de luz, ropa, props y suciedad;
- viaje geográfico entre locaciones;
- progresión emocional;
- ritmo y respiración;
- consistencia de grano, nitidez y color;
- room tone y puentes sonoros;
- claridad del mensaje sin voz o subtítulos.

## QA de master Blyndtek

- Refuerza uno de los tres mensajes permanentes.
- No inventa resultados ni clientes.
- Usa segunda persona y lenguaje aprobado.
- Presenta el precio cuando corresponde.
- Logo oficial aplicado en post y con área de protección.
- Paleta y tipografía consistentes.
- No mezcla logo y orca 3D.
- Tiene CTA único.
- Subtítulos verificados manualmente.
- El primer segundo funciona sin audio para social.
- La versión vertical fue recompuesta.
- Derechos, consentimientos y fuentes registrados.

## Revisión en tres pasadas

1. **Sin sonido:** composición, continuidad, física y marca.
2. **Sólo sonido:** claridad, ritmo, respiración y mezcla.
3. **Completa:** emoción, comprensión, recordación y CTA.

No revisar únicamente a velocidad normal. Inspeccionar frames en los cortes y movimientos críticos, pero decidir actuación y ritmo reproduciendo la toma completa.
