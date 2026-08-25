---
name: blyndtek-cinematic-commercials
description: Diseñar, producir, revisar e iterar comerciales cinematográficos ultrarrealistas de Blyndtek con Higgsfield, desde la estrategia de marca y el guion hasta los assets, prompts, tomas, montaje, audio, control de calidad y variantes para Meta, Instagram, LinkedIn y YouTube. Usar cuando se pida un brand film, spot premium, anuncio audiovisual, campaña de awareness, storyboard, shot list, prompt para Seedance/Cinema Studio, revisión de un comercial o generación con Higgsfield para Blyndtek. No usar para UGC casual aislado, publicaciones estáticas ni videos de clientes ajenos a Blyndtek salvo pedido explícito.
---

# Blyndtek Cinematic Commercials

Producir películas de marca que parezcan dirigidas, filmadas y montadas por un equipo real. Priorizar historia, actuación, continuidad y sonido sobre espectáculo gratuito.

## Dependencias

- Usar `higgsfield-generate` para ejecutar generaciones, audio, upscale y Virality Predictor.
- Usar `higgsfield-soul-id` si Felipe, Luli, Gonza u otra persona real debe conservar identidad entre tomas.
- Usar `higgsfield-brandkit` sólo para aplicar o extender assets oficiales; nunca rediseñar el logo sin pedido y aprobación expresa.
- Preferir el MCP `higgsfield` cuando esté disponible. Usar la CLI oficial como alternativa.
- No gastar créditos sin mostrar el lote propuesto y recibir aprobación explícita. Consultar saldo/costo actual antes de cada lote pago.

## Cargar contexto

1. Leer [brand-lock.md](references/brand-lock.md) siempre.
2. Leer [creative-territories.md](references/creative-territories.md) para concepto, guion o campaña.
3. Leer [production-workflow.md](references/production-workflow.md) para preproducción o ejecución.
4. Leer [prompt-playbook.md](references/prompt-playbook.md) al escribir prompts o seleccionar modelos.
5. Leer [qa-scorecard.md](references/qa-scorecard.md) al revisar tomas, cortes o masters.
6. Leer [integration-governance.md](references/integration-governance.md) al conectar Higgsfield, presupuestar lotes o automatizar.
7. Leer [research-notes.md](references/research-notes.md) sólo al actualizar esta skill o verificar cambios de plataforma.

Si existe una versión más nueva del manual de marca en `../blyndtek-memoria/contenido/fundacional/manual-de-marca.md`, tratarla como fuente canónica y actualizar `brand-lock.md` antes de producir.

## Clasificar el pedido

- **Concepto**: entregar territorios, promesa, audiencia, emoción, sinopsis y riesgos. No generar.
- **Preproducción**: entregar brief, guion, beat sheet, asset registry, continuity bible y shot manifest.
- **Producción**: ejecutar sólo assets o tomas aprobadas; registrar modelo, referencias, prompt, costo y resultado.
- **Revisión**: puntuar cada toma con la rúbrica, marcar `select`, `repair` o `reject`, y proponer la reparación mínima.
- **Adaptación**: preservar el master narrativo y reconstruir encuadres; no recortar a ciegas de 16:9 a 9:16.

## Flujo obligatorio

### 1. Definir el trabajo de marca

Antes del guion fijar:

- objetivo único: recordación, autoridad, reconocimiento del problema o consideración;
- audiencia concreta y país;
- uno de los tres mensajes permanentes de Blyndtek;
- emoción principal y cambio que debe sentir el espectador;
- prueba permitida: dato real, captura ficticia declarada o metáfora visual;
- CTA, duración maestra y adaptaciones.

Rechazar conceptos cuyo único mérito sea “parece caro”. La película debe dejar una idea de negocio recordable.

### 2. Construir el paquete de preproducción

Crear un proyecto con:

```bash
python3 .agents/skills/blyndtek-cinematic-commercials/scripts/commercial_project.py init <slug>
```

Completar `brief.md`, `manifests/assets.json`, `manifests/shots.json` y `continuity.md`. Validar antes de generar:

```bash
python3 .agents/skills/blyndtek-cinematic-commercials/scripts/commercial_project.py validate creative-production/higgsfield/<slug>
```

No pasar a video con placeholders críticos sin resolver.

### 3. Bloquear el mundo visual

Crear y aprobar en este orden:

1. style key o frame de tono;
2. personajes y wardrobe sheets;
3. locaciones limpias en ángulo 3/4;
4. props y pantallas críticas;
5. blocking frames, diagramas y primeros/últimos frames;
6. color pipeline común.

Nombrar cada referencia de forma estable (`@owner`, `@warehouse`, `@dashboard`, `@orca`). Nunca cambiar un tag a mitad de producción.

### 4. Diseñar tomas producibles

- Una toma debe tener un centro dramático, una acción y una intención de cámara.
- Separar diálogos, movimientos complejos y cambios geográficos en clips distintos.
- Empezar secuencias con múltiples sujetos usando un blocking shot claro.
- Preferir planos cerrados o medios cuando el fondo contenga demasiadas relaciones físicas.
- Construir inserts legibles de software y texto fuera del generador; componerlos después.
- Planear handles de 12–20 frames al inicio y final para editar.

### 5. Ejecutar por lotes pequeños

Generar primero una prueba de movimiento por escena. Proponer normalmente 4 variantes por toma crítica, no un render masivo. Tras cada lote:

1. registrar resultados;
2. puntuar con QA;
3. elegir fragmentos utilizables;
4. reparar el fallo dominante;
5. escalar sólo la dirección ganadora.

Nunca insistir cinco veces con el mismo prompt defectuoso. Corregir el asset, plate, blocking o complejidad antes de gastar otro lote.

### 6. Montar antes de perfeccionar

Armar un animatic y luego un rough cut con selects aunque algunas tomas sean temporales. Evaluar geografía, ritmo, respiración actoral y claridad de marca. Generar pickups sólo contra huecos concretos del montaje.

### 7. Sonido y acabado

- Diseñar primero foley, ambiente, respiración y silencios.
- Usar música como arquitectura emocional, no para esconder un montaje débil.
- Mantener voz y diálogos naturales; evitar tono institucional genérico.
- Hacer color, grano y textura al final para unificar fuentes.
- Aplicar logo y copy como overlays deterministas; no pedir al modelo que los dibuje.

### 8. QA y entrega

No aprobar un master con identidad inestable, manos/props rotos, geografía incoherente, logo mutado, texto inventado o actuación plástica. Entregar:

- master limpio;
- versiones con subtítulos y sin subtítulos;
- 16:9, 9:16 y 1:1 sólo cuando tengan composición propia;
- cutdowns 30s, 15s y 6s si el relato lo permite;
- miniatura/primer frame;
- manifiesto de prompts, modelos, fuentes y derechos;
- hipótesis de medición por variante.

## Contrato de salida de preproducción

Entregar siempre, en este orden:

1. **Idea rectora** — una frase.
2. **Trabajo de marca** — qué debe pensar/sentir/hacer la audiencia.
3. **Guion** — voz, diálogo y acciones, sin inventar resultados.
4. **Beat sheet** — tiempo, imagen, sonido y función narrativa.
5. **Asset registry** — tag, fuente, estado y restricciones.
6. **Shot manifest** — cámara, acción, continuidad, modelo y criterio de éxito.
7. **Plan de lotes** — qué se genera primero y qué aprobación desbloquea lo siguiente.
8. **Riesgos** — identidad, física, texto, marca, derechos y costo.

## Reglas duras

- Escribir en inglés idiomático toda voz, diálogo, copy, título, subtítulo y CTA destinados a la audiencia. Tratar el inglés como master creativo, no como traducción literal. Localizar a otro idioma sólo si Felipe lo pide explícitamente.
- No inventar clientes, métricas, ahorros, testimonios ni capacidades de Blyndtek.
- No usar marcas, interfaces o personas reconocibles de terceros sin derechos.
- No clonar voz o rostro sin consentimiento explícito.
- No mezclar el logo plano y la orca 3D en la misma pieza.
- No presentar stock corporativo sintético como si fuera una operación real de un cliente.
- No publicar automáticamente. La aprobación final siempre corresponde a Felipe.
- Guardar fuentes y prompts; una toma sin trazabilidad no es un master reproducible.

## Ejemplos de invocación

- “Creá un spot de 45 segundos donde un dueño descubre que su empresa opera a ciegas.”
- “Convertí este guion en assets, shot list y prompts de Seedance.”
- “Revisá estas ocho generaciones y elegí qué segundos sirven.”
- “Adaptá el master de marca a Reels sin perder composición.”
- “Usá Higgsfield para generar el primer lote, pero pedime aprobación antes de gastar.”
