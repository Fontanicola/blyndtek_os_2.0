# Módulo SEO y visibilidad en IA

## Estado de implementación — 27 de agosto de 2026

- UI publicada en `https://sistema.blyndtek.com/seo` y verificada en escritorio y móvil.
- Migración `048_seo_visibility.sql` aplicada al proyecto productivo `blyndtek_os_2.0` (`gyspazxpnzwkzrqlikqw`) después de una ejecución completa con `ROLLBACK`.
- Verificación posterior: 11 tablas SEO, 11 con RLS habilitado, 22 políticas, 7 fuentes iniciales y 7 prompts de control.
- La etiqueta de verificación de la propiedad `https://www.blyndtek.com/` está publicada; falta la confirmación final dentro de Search Console.
- Se guardó la primera ronda real de visibilidad en IA: 28 respuestas, 4 motores, 7 prompts y 0 menciones de Blyndtek. El módulo lee estos registros desde Supabase.
- GA4 y Bing continúan sin conexión verificable; sus métricas permanecen como “sin datos”.

## Principios

- Search Console, GA4, Bing y PageSpeed son fuentes; Blyndtek OS conserva histórico, contexto y decisiones.
- Una ausencia de conexión se muestra como “sin datos”, nunca como cero.
- Cada medición de posición guarda país, dispositivo, idioma, fuente y fecha.
- Las respuestas de IA guardan evidencia y contexto; no se presentan como determinísticas.
- Alertas detectan cambios. Acciones registran decisiones, aprobación, responsable e impacto.

## Superficies

1. Resumen ejecutivo: orgánico, conversiones, indexación, rangos, IA y salud de fuentes.
2. Consultas: filtros, comparación, detalle e historial.
3. Páginas: indexación, consultas, tráfico, conversión, enlaces y mantenimiento editorial.
4. Competidores: dominios compartidos, páginas y oportunidades de diferenciación.
5. IA: prompts, respuestas, menciones, citas, exactitud y evidencia.
6. Acciones: impacto, urgencia, esfuerzo, aprobación, responsable y resultado.
7. Alertas: caídas, indexación, sitemap, canonical, CWV, duplicación y tracking.

## Integraciones

- Google Search Console API: rendimiento, sitemaps e inspección cuando esté habilitada.
- Google Analytics Data API: sesiones, eventos, conversiones y referidos de IA.
- Bing Webmaster Tools REST API: consultas, indexación, backlinks y sitemaps.
- PageSpeed Insights API y CrUX: laboratorio y campo.
- Vercel: estado de despliegue, dominios y errores de producción.
- Supabase: histórico, configuración, acciones y alertas.

Las credenciales son server-side. Ningún secreto se expone al navegador ni se guarda en las tablas del módulo.

## Alertas iniciales

- Consulta prioritaria: caída >= 3 posiciones o salida de top 10.
- Tráfico: caída >= 30% comparando períodos equivalentes con volumen mínimo.
- Indexación: noindex, canonical o status distinto del esperado.
- Sitemap: error HTTP, XML inválido o URL importante ausente.
- CWV: cambio a “needs improvement” o “poor”.
- Conversión: evento sin registros durante una ventana con tráfico suficiente.
- Contenido nuevo: no indexado después de 7 días; crítico después de 14 si es comercial.
- IA: pérdida en dos mediciones comparables consecutivas, no en una ejecución aislada.

## Fases de implementación

1. Esquema, navegación, UI de línea de base y estados de conexión.
2. OAuth/credenciales e ingesta de GSC, GA4 y Bing.
3. Jobs diarios, snapshots y alertas.
4. Evidencia de IA y comparación semanal.
5. Atribución completa hasta lead, oportunidad y facturación.
