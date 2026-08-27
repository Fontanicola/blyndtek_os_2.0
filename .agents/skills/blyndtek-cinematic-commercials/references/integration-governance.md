# Integración, créditos y gobernanza

## Conexión recomendada

Higgsfield ofrece un MCP oficial en:

```text
https://mcp.higgsfield.ai/mcp
```

Codex admite servidores HTTP con OAuth en `.codex/config.toml`. Tras configurar, autenticar con:

```bash
codex mcp login higgsfield
```

Alternativa oficial para terminal:

```bash
npm i -g @higgsfield/cli
higgsfield auth login
```

Las skills oficiales instaladas en este repositorio envuelven la CLI y deben preferirse para comandos y parámetros vivos.

## Política de créditos

Higgsfield no ofrece un límite duro de créditos por sesión de agente. Aplicar control procedural:

1. consultar saldo;
2. resolver modelo y parámetros;
3. obtener costo actual si la herramienta lo expone;
4. mostrar lote, cantidad, resolución y propósito;
5. esperar aprobación explícita;
6. generar;
7. registrar costo real y selects;
8. detenerse al alcanzar el tope aprobado.

Lecturas de saldo, historial, modelos y costos no requieren aprobación. Generar, entrenar Soul, upscale, audio o cualquier acción que consuma créditos sí.

## Presupuesto por gates

No fijar precios estáticos en la skill. Distribuir el presupuesto aprobado por porcentajes:

- 10% exploración y style keys;
- 20% asset lock;
- 20% pruebas de movimiento;
- 35% tomas finales y pickups;
- 10% audio, upscale y acabado;
- 5% reserva.

Mover presupuesto entre gates sólo con una razón registrada. No gastar reserva antes del rough cut.

## Registro mínimo por job

- fecha y operador;
- campaña, escena y shot ID;
- modelo y versión visible;
- prompt o archivo de prompt;
- referencias usadas;
- parámetros;
- costo estimado y real;
- URL/ID de resultado;
- score QA;
- decisión y timecodes útiles.

## Permisos

- Felipe aprueba concepto, identidad, gasto y publicación.
- Luli puede preparar briefs, guiones, referencias y selects dentro de la marca.
- El sistema puede recomendar, puntuar y preparar lotes.
- Ninguna automatización publica o consume créditos sin el permiso definido para ese lote.

## Seguridad y derechos

- No guardar tokens ni cookies en el repositorio.
- Usar OAuth oficial o variables de entorno.
- No usar backends web privados o reverse-engineered.
- Confirmar términos comerciales del plan vigente antes de una campaña paga.
- Obtener consentimiento para rostro, voz y likeness.
- Registrar música, tipografías, stock y assets externos.
- Mantener una alternativa sin persona real si el consentimiento no está cerrado.

## Automatización futura

El módulo de Marketing puede almacenar proyectos, assets, jobs, costos, aprobaciones, QA y masters. Separar siempre:

- recomendación automática;
- acción preparada;
- aprobación humana;
- ejecución;
- resultado y auditoría.

No automatizar creatividad como una fábrica sin feedback. Automatizar ingestión, versionado, render queue, QA técnico, transcodificación y reporting; conservar decisión creativa y publicación como gates humanos.
