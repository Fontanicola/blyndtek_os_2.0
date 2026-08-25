# Investigación y procedencia

Última revisión: 2026-08-25.

Este archivo registra fuentes y conclusiones derivadas. No conserva transcripciones ni reproduce íntegramente prompts de terceros.

## Fuentes principales

1. Video oficial de Higgsfield: “How I Built a Car Commercial With AI (Every Prompt I Used)” — `https://www.youtube.com/watch?v=GNxmt_4IifA`.
2. Breakdown y assets oficiales asociados — `https://higgsfield.ai/s/car-commercial-higgsfieldai-agFzmN`.
3. Curso oficial “The 3-Step Realistic AI Ad Workflow” — `https://higgsfield.ai/academy/courses/ai-ad-3-step`.
4. Guía oficial “3-Step Workflow To Make Ultra-Realistic AI Ads” — `https://higgsfield.ai/blog/cinematic_headphones`.
5. MCP y ayuda oficial — `https://higgsfield.ai/mcp` y `https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent`.
6. Skills oficiales, versión observada `0.12.0` — `https://github.com/higgsfield-ai/skills`.
7. OpenAI Docs para MCP y skills — `https://developers.openai.com/codex/mcp` y `https://developers.openai.com/codex/skills`.
8. Manual de marca Blyndtek, revisión 2026-08-01 — repositorio `blyndtek-memoria`.

## Conclusiones transferibles

- El pipeline repetible es assets → setup/continuidad → generaciones → montaje.
- Los assets neutrales y etiquetados son la unidad de consistencia.
- Un style key y color transfer unifican películas generadas con modelos distintos.
- “Clean the plate”: quitar antes de animar todo elemento que pueda mutar.
- Un video de estáticos puede producir varios ángulos interiores coherentes para usar como referencias.
- El plano inicial de una secuencia debe fijar blocking cuando hay varios sujetos.
- Los encuadres más cerrados reducen slop en escenas dinámicas.
- La continuidad geográfica y emocional recae en dirección y montaje, no en el modelo.
- Es normal rescatar tomas de generaciones distintas; el master se construye en edición.
- Si una escena contiene demasiados beats, dividirla y bloquear primero el beat central.
- Diagramas simples y marcas sobre plates ayudan a fijar trayectorias y posiciones.
- La actuación mejora describiendo microacciones, no adjetivos emocionales.
- Texto, logos e interfaces exactas deben componerse después.
- Higgsfield ofrece MCP oficial con OAuth y CLI oficial; evitar integraciones reverse-engineered.
- Cada generación conectada consume créditos y no existe un hard cap nativo por sesión: usar gates de aprobación.

## Elementos que deben verificarse de nuevo

Antes de una producción paga comprobar en vivo:

- modelos disponibles y sus IDs;
- límites de duración, resolución y referencias;
- costo por job y saldo;
- derechos comerciales del plan vigente;
- disponibilidad de MCP/CLI y scopes OAuth;
- modos y resolución de Marketing Studio;
- estado del brand kit y Souls de Blyndtek.
