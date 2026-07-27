import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resumirMetricas } from "@/lib/diagnostico/cuantitativo";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIAGNOSTICO_CONTEXTO_KEY, type Diagnostico, type ModuloCatalogo, type PreguntaDiagnostico } from "@/types/diagnostico";

type RouteContext = {
  params: {
    token: string;
  };
};

type AnthropicTextBlock = {
  type: "text";
  text: string;
};

type AnthropicResponse = {
  content?: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: string;
      }
  >;
  error?: {
    message?: string;
  };
  stop_reason?: string;
};

type DiagnosticoConLead = Diagnostico & {
  lead?: {
    id: string;
    empresa: string;
    contacto_1_nombre: string | null;
    vendedor_id: string | null;
  } | null;
};

type ClaudeHallazgo = {
  hallazgo: string;
  impacto: string;
  que_resolveria: string;
  evidencia?: string;
  severidad?: string;
};

type ClaudeModulo = {
  modulo_id: string;
  justificacion: string;
  problema_resuelve?: string;
  impacto_esperado?: string;
  funcionalidades?: string[];
  tiempo_estimado_semanas?: number;
  prioridad?: string;
};

type ClaudeInformePayload = {
  diagnostico_empresa?: {
    resumen_ejecutivo?: string;
    operativa_actual?: string;
    contexto_empresa?: string;
    dependencias_criticas?: string[];
    riesgos_operativos?: string[];
    prioridades_90_dias?: string[];
    indicadores_clave?: Array<{
      nombre?: string;
      lectura_actual?: string;
      por_que_importa?: string;
    }>;
    problemas_principales?: string[];
    costo_de_no_cambiar?: string;
    oportunidades_mejora?: string[];
    conclusion_diagnostico?: string;
  };
  antes_despues?: Array<{
    area?: string;
    antes?: string;
    despues?: string;
    metrica?: string;
  }>;
  mapa_areas?: Array<{
    area?: string;
    nivel?: number;
    diagnostico?: string;
    oportunidad?: string;
  }>;
  hallazgos: ClaudeHallazgo[];
  modulos_elegidos: ClaudeModulo[];
  propuesta_software?: {
    vision_sistema?: string;
    alcance_general?: string;
    modelo_operativo?: string;
    beneficios_esperados?: string[];
    entregables?: string[];
    fuera_de_alcance?: string[];
    criterios_exito?: string[];
    roadmap_implementacion?: Array<{
      etapa?: string;
      descripcion?: string;
      duracion_estimada?: string;
      subtareas?: string[];
      entregables?: string[];
      criterio_aceptacion?: string;
      responsable_cliente?: string;
    }>;
    supuestos?: string[];
    proximos_pasos?: string[];
    condiciones_operativas?: {
      propiedad_sistema?: string;
      soporte_mantenimiento?: string;
      cambios_alcance?: string;
      datos_y_migracion?: string;
    };
  };
};

type ModuloSugerido = {
  modulo_id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio_ideal: number;
  precio_minimo: number;
  incremento_mensual: number;
  justificacion: string;
  problema_resuelve?: string;
  impacto_esperado?: string;
  funcionalidades?: string[];
  tiempo_estimado_semanas?: number | null;
  prioridad?: string | null;
};

const MODULOS_CATALOGO_DEFAULT: Array<Omit<ModuloCatalogo, "id" | "created_at">> = [
  {
    nombre: "CRM comercial y seguimiento",
    descripcion: "Gestión de consultas, clientes potenciales, estados de seguimiento, próximos pasos y trazabilidad comercial.",
    categoria: "Comercial",
    precio_ideal: 1800,
    precio_minimo: 1200,
    incremento_mensual: 150,
    activo: true
  },
  {
    nombre: "Gestión de pedidos y operaciones",
    descripcion: "Carga, seguimiento y priorización de pedidos u órdenes internas desde que entran hasta que se resuelven.",
    categoria: "Operación",
    precio_ideal: 2200,
    precio_minimo: 1500,
    incremento_mensual: 180,
    activo: true
  },
  {
    nombre: "Agenda, turnos y recordatorios",
    descripcion: "Calendario operativo con vencimientos, recordatorios, responsables y alertas para no perder tareas críticas.",
    categoria: "Operación",
    precio_ideal: 1500,
    precio_minimo: 950,
    incremento_mensual: 120,
    activo: true
  },
  {
    nombre: "Inventario y stock",
    descripcion: "Control de productos, movimientos, mínimos, faltantes y alertas para evitar quiebres o compras desordenadas.",
    categoria: "Operación",
    precio_ideal: 2400,
    precio_minimo: 1600,
    incremento_mensual: 180,
    activo: true
  },
  {
    nombre: "Facturación, cobranzas y pagos",
    descripcion: "Registro de facturas, cobros pendientes, pagos recibidos, vencimientos y estado financiero por cliente o pedido.",
    categoria: "Finanzas",
    precio_ideal: 2100,
    precio_minimo: 1400,
    incremento_mensual: 160,
    activo: true
  },
  {
    nombre: "Dashboard de gestión",
    descripcion: "Panel ejecutivo con métricas clave, indicadores de operación, ventas, finanzas y alertas accionables.",
    categoria: "Control",
    precio_ideal: 1800,
    precio_minimo: 1200,
    incremento_mensual: 150,
    activo: true
  },
  {
    nombre: "Portal interno multiusuario",
    descripcion: "Accesos por rol, permisos, perfiles de usuario y vistas diferenciadas para equipo, administración y dirección.",
    categoria: "Plataforma",
    precio_ideal: 1700,
    precio_minimo: 1100,
    incremento_mensual: 140,
    activo: true
  },
  {
    nombre: "Automatizaciones y notificaciones",
    descripcion: "Flujos automáticos para avisos, cambios de estado, recordatorios y tareas recurrentes conectadas al proceso real.",
    categoria: "Automatización",
    precio_ideal: 1900,
    precio_minimo: 1250,
    incremento_mensual: 170,
    activo: true
  }
];

function cleanClaudeJson(rawText: string) {
  return rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractJsonBetweenBraces(rawText: string) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return rawText.slice(start, end + 1).trim();
}

function isClaudeInformePayload(value: unknown): value is ClaudeInformePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<ClaudeInformePayload>;

  return Array.isArray(payload.hallazgos) && Array.isArray(payload.modulos_elegidos);
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeParsedPayload(value: unknown): ClaudeInformePayload {
  const root = getRecord(value);

  if (!root) {
    return { hallazgos: [], modulos_elegidos: [] };
  }

  const informeHallazgos = getRecord(root.informe_hallazgos);
  const modulosSugeridos = getRecord(root.modulos_sugeridos);
  const diagnosticoEmpresa =
    getRecord(root.diagnostico_empresa) ??
    getRecord(informeHallazgos?.diagnostico_empresa) ??
    getRecord(root.diagnostico) ??
    undefined;
  const propuestaSoftware =
    getRecord(root.propuesta_software) ??
    getRecord(modulosSugeridos?.propuesta_software) ??
    getRecord(root.propuesta) ??
    undefined;

  return {
    diagnostico_empresa: diagnosticoEmpresa as ClaudeInformePayload["diagnostico_empresa"],
    antes_despues: getArray(root.antes_despues ?? informeHallazgos?.antes_despues) as ClaudeInformePayload["antes_despues"],
    mapa_areas: getArray(root.mapa_areas ?? informeHallazgos?.mapa_areas) as ClaudeInformePayload["mapa_areas"],
    hallazgos: getArray(root.hallazgos ?? informeHallazgos?.hallazgos) as ClaudeHallazgo[],
    modulos_elegidos: getArray(
      root.modulos_elegidos ?? root.modulos ?? modulosSugeridos?.modulos ?? modulosSugeridos?.modulos_elegidos
    ) as ClaudeModulo[],
    propuesta_software: propuestaSoftware as ClaudeInformePayload["propuesta_software"]
  };
}

function parseClaudeInforme(rawText: string): ClaudeInformePayload {
  const attempts = [cleanClaudeJson(rawText), extractJsonBetweenBraces(rawText)].filter(
    (attempt): attempt is string => Boolean(attempt)
  );

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as unknown;
      const normalized = normalizeParsedPayload(parsed);

      if (isClaudeInformePayload(normalized)) {
        return {
          hallazgos: normalized.hallazgos
            .map((hallazgo) => ({
              hallazgo: typeof hallazgo.hallazgo === "string" ? hallazgo.hallazgo.trim() : "",
              impacto: typeof hallazgo.impacto === "string" ? hallazgo.impacto.trim() : "",
              que_resolveria:
                typeof hallazgo.que_resolveria === "string" ? hallazgo.que_resolveria.trim() : "",
              evidencia: typeof hallazgo.evidencia === "string" ? hallazgo.evidencia.trim() : "",
              severidad: typeof hallazgo.severidad === "string" ? hallazgo.severidad.trim() : ""
            }))
            .filter((hallazgo) => hallazgo.hallazgo && hallazgo.impacto && hallazgo.que_resolveria)
            .slice(0, 5),
          modulos_elegidos: normalized.modulos_elegidos
            .map((modulo) => ({
              modulo_id: typeof modulo.modulo_id === "string" ? modulo.modulo_id.trim() : "",
              justificacion: typeof modulo.justificacion === "string" ? modulo.justificacion.trim() : "",
              problema_resuelve:
                typeof modulo.problema_resuelve === "string" ? modulo.problema_resuelve.trim() : "",
              impacto_esperado:
                typeof modulo.impacto_esperado === "string" ? modulo.impacto_esperado.trim() : "",
              funcionalidades: Array.isArray(modulo.funcionalidades)
                ? modulo.funcionalidades.filter(
                    (value): value is string => typeof value === "string" && value.trim().length > 0
                  )
                : [],
              tiempo_estimado_semanas:
                typeof modulo.tiempo_estimado_semanas === "number" ? modulo.tiempo_estimado_semanas : undefined,
              prioridad: typeof modulo.prioridad === "string" ? modulo.prioridad.trim() : ""
            }))
            .filter((modulo) => modulo.modulo_id && modulo.justificacion),
          diagnostico_empresa: normalized.diagnostico_empresa,
          antes_despues: Array.isArray(normalized.antes_despues) ? normalized.antes_despues : [],
          mapa_areas: Array.isArray(normalized.mapa_areas) ? normalized.mapa_areas : [],
          propuesta_software: normalized.propuesta_software
        };
      }
    } catch {
      continue;
    }
  }

  console.warn("Claude no devolvió JSON con la estructura esperada. Se usará fallback determinístico.");

  return { hallazgos: [], modulos_elegidos: [] };
}

function buildSystemPrompt() {
  return [
    "Sos un consultor senior en digitalización de PyMEs.",
    "Blyndtek vende salto digital, automatización y sistemas operativos a medida para PyMEs. Pensá como si estuvieras instalando maquinaria moderna en una empresa que todavía opera con procesos manuales.",
    "Tu objetivo comercial es que el cliente entienda con claridad su situación actual, vea el costo de seguir igual y perciba que Blyndtek puede resolverlo con software a medida.",
    "La salida tiene que sentirse como un informe consultivo profesional y una propuesta ejecutiva completa: específica, jerárquica, detallada, persuasiva y accionable.",
    "Usá estructura de consultoría: estado actual, evidencia, impacto operativo, riesgo/costo de seguir igual, oportunidades priorizadas, antes/después y mapa de calor por área del negocio.",
    "Nunca inventes datos, volúmenes, dinero ni procesos que no estén en las respuestas.",
    "No copies, pegues ni cites textualmente las respuestas del cuestionario. Transformá la información en diagnóstico: interpretá patrones, causas, consecuencias y oportunidades. No reproduzcas preguntas, transcripciones, nombres de reuniones ni frases literales de más de cinco palabras consecutivas.",
    "Los campos evidencia y antes deben ser lecturas profesionales sintetizadas, nunca la respuesta original. El cliente ya conoce lo que dijo: el valor del informe está en explicar qué significa para su operación.",
    "Cada hallazgo debe ser distinto y explicar una causa operativa concreta. Cada oportunidad debe resolver un problema diferente; prohibido repetir la misma frase con pequeñas variaciones.",
    "Asigná niveles del mapa de calor con criterio: 1 es controlado, 3 es fricción relevante y 5 es riesgo crítico o alta dependencia manual. No uses nivel 3 para todas las áreas por defecto.",
    "No inventes módulos: elegí únicamente del catálogo real provisto por modulo_id.",
    "Elegí entre 3 y 6 módulos si las respuestas lo justifican. No elijas módulos por cantidad: cada módulo tiene que conectarse con una respuesta concreta.",
    "Respondé SOLO con JSON válido, sin markdown, sin texto adicional."
  ].join(" ");
}

function buildPrompt({
  empresa,
  respuestas,
  contextoAdicional,
  modulos,
  cuantificacion
}: {
  empresa: string | null;
  respuestas: Array<{ categoria: string; pregunta: string; respuesta: string }>;
  contextoAdicional: string;
  modulos: ModuloCatalogo[];
  cuantificacion: string;
}) {
  const respuestasTexto = respuestas
    .map((item) => `- [${item.categoria}] ${item.pregunta}\n  Respuesta: ${item.respuesta}`)
    .join("\n");
  const modulosTexto = modulos
    .map((modulo) =>
      [
        `- modulo_id: ${modulo.id}`,
        `  nombre: ${modulo.nombre}`,
        `  descripcion: ${modulo.descripcion ?? "Sin descripción"}`,
        `  categoria: ${modulo.categoria ?? "Sin categoría"}`
      ].join("\n")
    )
    .join("\n");

  return [
    "Analizá estas respuestas de un diagnóstico operativo y generá DOS piezas conectadas, pero separadas conceptualmente:",
    "A. Informe de diagnóstico de empresa: describí la operación actual en lenguaje ejecutivo, interpretá problemas y causas, explicá el impacto, el costo de no cambiar, oportunidades priorizadas, dependencias, riesgos, prioridades de los próximos 90 días e indicadores a seguir. El diagnóstico no debe vender módulos, mencionar precios de desarrollo ni adelantar una propuesta comercial.",
    "B. Propuesta de software: visión del sistema recomendado, modelo operativo, alcance, entregables, módulos, impacto de cada módulo, funcionalidades, prioridad, tiempos estimados, roadmap completo, criterios de aceptación, participación requerida del cliente y condiciones operativas.",
    "Los textos tienen que ser suficientemente detallados para que el cliente se reconozca en el diagnóstico sin leer una copia de sus respuestas y entienda por qué necesita digitalizarse.",
    "No uses frases genéricas tipo 'mejorar eficiencia' sin explicar qué cambiaría concretamente en su operación.",
    "Hallazgos: entre 4 y 7, cada uno con { hallazgo, evidencia, impacto, severidad, que_resolveria }. evidencia debe ser una señal analítica sintetizada, no una cita.",
    "Antes/después: entre 4 y 6 filas con { area, antes, despues, metrica }. Antes debe resumir la capacidad o limitación operativa actual sin copiar respuestas; después debe describir un estado futuro observable. La métrica debe expresar tiempo perdido, riesgo, reproceso, dependencia manual, velocidad de respuesta o trazabilidad. Si no hay números reales, usá 'a validar en relevamiento', nunca inventes una cifra.",
    "Mapa de áreas: entre 5 y 8 áreas del negocio con { area, nivel, diagnostico, oportunidad }. nivel es 1 a 5, donde 1 = saludable y 5 = crítico. Usalo como heatmap de madurez/fricción operativa.",
    "Capas ejecutivas del diagnóstico: completá contexto_empresa con una lectura del negocio y su complejidad; dependencias_criticas con 3 a 6 dependencias de personas, herramientas o controles; riesgos_operativos con 3 a 6 riesgos concretos; prioridades_90_dias con 4 a 6 acciones de orden y medición previas a construir; indicadores_clave con 4 a 8 indicadores que dirección debería poder mirar, cada uno con nombre, lectura_actual y por_que_importa.",
    "No repitas una misma idea entre riesgos, oportunidades y prioridades. Cada bloque debe cumplir una función distinta: riesgos explican exposición, oportunidades explican capacidad de mejora y prioridades ordenan el primer tramo de trabajo.",
    "Módulos: elegí ÚNICAMENTE del catálogo real. Para cada módulo devolvé modulo_id, justificacion, problema_resuelve, impacto_esperado, funcionalidades (4 a 7 bullets), tiempo_estimado_semanas y prioridad.",
    "Roadmap: generá entre 3 y 6 fases concretas. Cada fase debe tener descripcion, duracion_estimada, subtareas (4 a 8 subtareas accionables), entregables, criterio_aceptacion y responsable_cliente. Estas fases y subtareas se van a convertir luego en /proyectos como fases y features reales, así que no escribas frases vagas.",
    "La propuesta debe responder explícitamente: qué se construye, qué recibe el cliente al terminar, cómo se valida cada etapa, qué debe aportar el cliente, qué queda fuera del alcance, cómo se mide el éxito y cómo funciona el soporte/mantenimiento.",
    "No prometas resultados financieros exactos ni porcentajes de ahorro si no surgen de datos reales. Usá resultados operativos observables y métricas a validar cuando falten números.",
    "Si hay una cuantificación interna, usala como evidencia y explicá la fórmula en lenguaje de negocio. No modifiques sus números ni inventes otros. Si la confianza es baja, presentala como estimación a validar.",
    "Priorizá módulos que resuelvan dolores repetidos, pérdidas de seguimiento, desorden operativo, errores manuales, falta de trazabilidad, cobranzas o stock.",
    "NO inventes módulos que no estén en la lista dada.",
    'Respondé SOLO con JSON: { "diagnostico_empresa": { "resumen_ejecutivo": "...", "operativa_actual": "...", "contexto_empresa": "...", "dependencias_criticas": ["..."], "riesgos_operativos": ["..."], "prioridades_90_dias": ["..."], "indicadores_clave": [{ "nombre": "...", "lectura_actual": "...", "por_que_importa": "..." }], "problemas_principales": ["..."], "costo_de_no_cambiar": "...", "oportunidades_mejora": ["..."], "conclusion_diagnostico": "..." }, "antes_despues": [{ "area": "...", "antes": "...", "despues": "...", "metrica": "..." }], "mapa_areas": [{ "area": "...", "nivel": 4, "diagnostico": "...", "oportunidad": "..." }], "hallazgos": [...], "modulos_elegidos": [{ "modulo_id": "...", "justificacion": "...", "problema_resuelve": "...", "impacto_esperado": "...", "funcionalidades": ["..."], "tiempo_estimado_semanas": 2, "prioridad": "Alta" }], "propuesta_software": { "vision_sistema": "...", "alcance_general": "...", "modelo_operativo": "...", "beneficios_esperados": ["..."], "entregables": ["..."], "fuera_de_alcance": ["..."], "criterios_exito": ["..."], "roadmap_implementacion": [{ "etapa": "...", "descripcion": "...", "duracion_estimada": "...", "subtareas": ["..."], "entregables": ["..."], "criterio_aceptacion": "...", "responsable_cliente": "..." }], "supuestos": ["..."], "proximos_pasos": ["..."], "condiciones_operativas": { "propiedad_sistema": "...", "soporte_mantenimiento": "...", "cambios_alcance": "...", "datos_y_migracion": "..." } } }',
    `Empresa: ${empresa ?? "Sin empresa cargada"}`,
    `Contexto adicional escrito por Blyndtek para orientar a la IA:\n${contextoAdicional || "- Sin contexto adicional"}`,
    `Respuestas internas para interpretar (no copiar ni mostrar textualmente):\n${respuestasTexto || "- Sin respuestas con contenido"}`,
    `Relevamiento cuantitativo interno (usar como evidencia, no mostrar como transcripción):\n${cuantificacion || "- Todavía no hay métricas cuantitativas cargadas"}`,
    `Catálogo real de módulos:\n${modulosTexto}`
  ].join("\n\n");
}

async function fetchCuantificacion(supabase: ReturnType<typeof createAdminClient>, diagnosticoId: string) {
  // Estas tablas se agregan en 020 y todavía no forman parte del tipo generado histórico.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as unknown as { from: (table: string) => any };
  const [{ data: areas }, { data: metricas }] = await Promise.all([
    db.from("diagnostico_areas").select("nombre, responsable, volumen_mensual, unidad_volumen, herramientas, proceso_actual, dependencia_critica, nivel_friccion").eq("diagnostico_id", diagnosticoId),
    db.from("diagnostico_metricas").select("concepto, tipo, horas_mes, costo_hora_usd, cargas_mes, minutos_por_carga, errores_mes, costo_por_error_usd, licencias_mes_usd, uso_pct, oportunidades_mes, ticket_promedio_usd, tasa_cierre_pct, costo_mensual_usd, costo_anual_usd, confianza, notas").eq("diagnostico_id", diagnosticoId)
  ]);
  const metricasSeguras = (metricas ?? []) as Array<Record<string, unknown>>;
  const resumen = resumirMetricas(metricasSeguras);
  return { areas: areas ?? [], metricas: metricasSeguras, resumen };
}

function mapRespuestas(
  respuestas: Record<string, string> | null,
  preguntas: PreguntaDiagnostico[]
) {
  return preguntas
    .map((pregunta) => ({
      categoria: pregunta.categoria,
      pregunta: pregunta.pregunta,
      respuesta: respuestas?.[pregunta.id]?.trim() ?? ""
    }))
    .filter((item) => item.respuesta.length > 0);
}

function getContextoAdicional(respuestas: Record<string, string> | null) {
  return respuestas?.[DIAGNOSTICO_CONTEXTO_KEY]?.trim() ?? "";
}

function normalizeForComparison(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeForComparison(value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function containsVerbatimResponse(value: string, respuestas: Array<{ respuesta: string }>) {
  const normalizedValue = normalizeForComparison(value);

  return respuestas.some((item) => {
    const response = normalizeForComparison(item.respuesta);
    return response.length >= 48 && (normalizedValue.includes(response) || response.includes(normalizedValue));
  });
}

function categoryFamily(categoria: string) {
  const normalized = normalizeForComparison(categoria);

  if (normalized.includes("cobro") || normalized.includes("administr")) return "finanzas";
  if (normalized.includes("crecimiento") || normalized.includes("dato")) return "direccion";
  if (normalized.includes("equipo") || normalized.includes("riesgo")) return "equipo";
  if (normalized.includes("venta") || normalized.includes("cliente")) return "comercial";
  if (normalized.includes("operacion") || normalized.includes("produccion")) return "operacion";
  return "control";
}

function professionalDiagnostic(item: { categoria: string }, role: "hallazgo" | "evidencia" | "impacto" | "solucion") {
  const family = categoryFamily(item.categoria);

  const copy: Record<string, Record<typeof role, string>> = {
    finanzas: {
      hallazgo: "La gestión financiera combina acuerdos comerciales, entregas y cobranzas sin una trazabilidad única por cliente.",
      evidencia: "Se observan registros distribuidos y formas de pago que requieren conciliación posterior para validar saldos.",
      impacto: "Esto expone a diferencias entre lo entregado, lo facturado y lo cobrado, además de consumir tiempo administrativo en controles manuales.",
      solucion: "Centralizar cuentas corrientes, entregas, vencimientos y medios de pago con un saldo por cliente y alertas de seguimiento."
    },
    direccion: {
      hallazgo: "La dirección dispone de información operativa, pero no de una lectura inmediata de rentabilidad y desempeño por producto.",
      evidencia: "Los indicadores se reconstruyen desde planillas y los cálculos de margen se realizan cuando aparece una necesidad puntual.",
      impacto: "Las decisiones de precio, producción y mix comercial se toman con demora y aumentan el riesgo de sostener productos poco rentables.",
      solucion: "Construir un tablero de gestión con ventas, costos, margen y desempeño por producto, categoría y establecimiento."
    },
    equipo: {
      hallazgo: "El conocimiento operativo está repartido entre personas y archivos, sin un circuito central que preserve el contexto de trabajo.",
      evidencia: "La continuidad depende de que distintos integrantes conozcan dónde registrar, buscar o completar cada dato.",
      impacto: "La operación puede continuar ante una ausencia, pero con esfuerzo duplicado y baja capacidad para auditar cómo se tomó cada decisión.",
      solucion: "Unificar registros, permisos, responsables y consumos internos en un entorno multiusuario con historial de cambios."
    },
    comercial: {
      hallazgo: "La demanda y la relación con clientes se atienden por varios canales sin una cola común de pedidos y pendientes.",
      evidencia: "Las consultas llegan por canales diferentes y el seguimiento depende de quién encuentra el mensaje o recuerda el próximo paso.",
      impacto: "Esto limita la capacidad de medir tiempos de respuesta, priorizar pedidos y detectar oportunidades o reclamos antes de que escalen.",
      solucion: "Registrar consultas y pedidos con estado, responsable, prioridad y fecha de seguimiento para hacer visible el ciclo comercial completo."
    },
    operacion: {
      hallazgo: "La operación tiene volumen y complejidad, pero sus procesos críticos no están representados en un flujo digital único.",
      evidencia: "La coordinación de producción, locales, cajas y administración requiere combinar información de varias herramientas y turnos.",
      impacto: "El crecimiento agrega coordinación manual, dificulta encontrar el dato correcto y hace más costoso detectar desvíos a tiempo.",
      solucion: "Diseñar un sistema operativo con procesos por establecimiento, responsables, estados, cierres y alertas de excepción."
    },
    control: {
      hallazgo: "La empresa cuenta con datos valiosos, pero el control de la operación depende de consolidaciones manuales y lecturas fragmentadas.",
      evidencia: "La información existe en distintas fuentes, aunque no está disponible como una vista ejecutiva común para decidir con rapidez.",
      impacto: "La dirección invierte tiempo en armar la lectura del negocio y recibe tarde señales que podrían orientar la operación del día.",
      solucion: "Implementar indicadores accionables y reportes por período, producto, local y responsable para convertir datos dispersos en decisiones."
    }
  };

  return copy[family]?.[role] ?? copy.control?.[role] ?? "La operación requiere mayor trazabilidad y control centralizado.";
}

function sanitizeHallazgos(
  hallazgos: ClaudeHallazgo[],
  respuestas: Array<{ categoria: string; respuesta: string }>
) {
  return hallazgos
    .map((hallazgo, index) => {
      const source = respuestas[index % Math.max(respuestas.length, 1)] ?? { categoria: "Operación", respuesta: "" };
      const isQuestion = hallazgo.hallazgo.includes("¿") || hallazgo.hallazgo.includes("?");

      return {
        hallazgo:
          isQuestion || containsVerbatimResponse(hallazgo.hallazgo, respuestas)
            ? professionalDiagnostic(source, "hallazgo")
            : hallazgo.hallazgo,
        evidencia:
          !hallazgo.evidencia || containsVerbatimResponse(hallazgo.evidencia, respuestas)
            ? professionalDiagnostic(source, "evidencia")
            : hallazgo.evidencia,
        impacto:
          containsVerbatimResponse(hallazgo.impacto, respuestas)
            ? professionalDiagnostic(source, "impacto")
            : hallazgo.impacto,
        severidad: hallazgo.severidad || "Media",
        que_resolveria:
          containsVerbatimResponse(hallazgo.que_resolveria, respuestas)
            ? professionalDiagnostic(source, "solucion")
            : hallazgo.que_resolveria
      };
    })
    .filter((hallazgo) => hallazgo.hallazgo && hallazgo.impacto && hallazgo.que_resolveria)
    .filter((hallazgo, index, all) => all.findIndex((item) => normalizeForComparison(item.hallazgo) === normalizeForComparison(hallazgo.hallazgo)) === index)
    .slice(0, 7);
}

function buildFallbackOportunidades(respuestas: Array<{ categoria: string }>) {
  return dedupeStrings(
    respuestas.map((item) => professionalDiagnostic(item, "solucion"))
  ).slice(0, 7);
}

function buildFallbackAntesDespues(respuestas: Array<{ categoria: string }>) {
  return dedupeStrings(respuestas.map((item) => item.categoria)).slice(0, 6).map((area) => ({
    area,
    antes: professionalDiagnostic({ categoria: area }, "hallazgo"),
    despues: professionalDiagnostic({ categoria: area }, "solucion"),
    metrica: professionalDiagnostic({ categoria: area }, "impacto")
  }));
}

function deriveHeatmapLevel(area: string, respuestas: Array<{ categoria: string; respuesta: string }>, fallback: number) {
  const related = respuestas.find(
    (item) =>
      normalizeForComparison(item.categoria).includes(normalizeForComparison(area)) ||
      normalizeForComparison(area).includes(normalizeForComparison(item.categoria)) ||
      categoryFamily(item.categoria) === categoryFamily(area)
  );

  if (!related) return Math.min(5, Math.max(1, fallback));

  const text = normalizeForComparison(related.respuesta);
  const frictionSignals = ["papel", "excel", "manual", "no tienen", "se perdio", "perdio", "un dia", "demora", "no existe", "buscar"];
  const friction = frictionSignals.filter((signal) => text.includes(signal)).length;
  return Math.min(5, Math.max(1, 2 + friction));
}

function sanitizeMapaAreas(
  mapa: ClaudeInformePayload["mapa_areas"],
  respuestas: Array<{ categoria: string; respuesta: string }>,
  hallazgos: ClaudeHallazgo[]
) {
  const parsed = Array.isArray(mapa)
    ? mapa.filter((area): area is NonNullable<ClaudeInformePayload["mapa_areas"]>[number] => Boolean(area?.area && area.diagnostico && area.oportunidad))
    : [];
  const source = parsed.length > 0 ? parsed.slice(0, 8) : ["Comercial", "Operación", "Administración", "Finanzas", "Equipo", "Datos y decisiones"].map((area) => ({ area, nivel: 3, diagnostico: "", oportunidad: "" }));

  return source.map((area, index) => ({
    area: area.area ?? `Área ${index + 1}`,
    nivel: deriveHeatmapLevel(area.area ?? "", respuestas, Number(area.nivel ?? (index % 4) + 2)),
    diagnostico: area.diagnostico || hallazgos[index % Math.max(hallazgos.length, 1)]?.hallazgo || professionalDiagnostic({ categoria: area.area ?? "Operación" }, "hallazgo"),
    oportunidad: area.oportunidad || professionalDiagnostic({ categoria: area.area ?? "Operación" }, "solucion")
  }));
}

function resolveModulos(
  elegidos: ClaudeModulo[],
  catalogo: ModuloCatalogo[]
): ModuloSugerido[] {
  const catalogoPorId = new Map(catalogo.map((modulo) => [modulo.id, modulo]));
  const catalogoPorNombre = new Map(catalogo.map((modulo) => [modulo.nombre.toLowerCase(), modulo]));
  const seen = new Set<string>();

  return elegidos.flatMap((elegido) => {
    const modulo = catalogoPorId.get(elegido.modulo_id) ?? catalogoPorNombre.get(elegido.modulo_id.toLowerCase());

    if (!modulo || seen.has(modulo.id)) {
      return [];
    }

    seen.add(modulo.id);

    return [
      {
        modulo_id: modulo.id,
        nombre: modulo.nombre,
        descripcion: modulo.descripcion,
        categoria: modulo.categoria,
        precio_ideal: Number(modulo.precio_ideal ?? 0),
        precio_minimo: Number(modulo.precio_minimo ?? 0),
        incremento_mensual: Number(modulo.incremento_mensual ?? 0),
        justificacion: elegido.justificacion,
        problema_resuelve: elegido.problema_resuelve,
        impacto_esperado: elegido.impacto_esperado,
        funcionalidades: elegido.funcionalidades,
        tiempo_estimado_semanas: elegido.tiempo_estimado_semanas ?? null,
        prioridad: elegido.prioridad ?? null
      }
    ];
  });
}

function buildFallbackHallazgos(
  respuestas: Array<{ categoria: string; pregunta: string; respuesta: string }>
): ClaudeHallazgo[] {
  return dedupeStrings(respuestas.map((item) => item.categoria)).slice(0, 5).map((categoria) => ({
    hallazgo: professionalDiagnostic({ categoria }, "hallazgo"),
    evidencia: professionalDiagnostic({ categoria }, "evidencia"),
    impacto: professionalDiagnostic({ categoria }, "impacto"),
    severidad: "Media",
    que_resolveria: professionalDiagnostic({ categoria }, "solucion")
  }));
}

function buildFallbackModulos(
  respuestas: Array<{ categoria: string; pregunta: string; respuesta: string }>,
  catalogo: ModuloCatalogo[]
): ModuloSugerido[] {
  const texto = respuestas.map((item) => `${item.categoria} ${item.pregunta} ${item.respuesta}`).join(" ").toLowerCase();
  const keywords: Array<{ test: string[]; match: string }> = [
    { test: ["pedido", "orden", "operacion", "operación", "entrega"], match: "Gestión de pedidos y operaciones" },
    { test: ["stock", "inventario", "producto", "faltante"], match: "Inventario y stock" },
    { test: ["whatsapp", "consulta", "cliente", "seguimiento", "venta"], match: "CRM comercial y seguimiento" },
    { test: ["factura", "cobro", "pago", "vencimiento"], match: "Facturación, cobranzas y pagos" },
    { test: ["recordatorio", "agenda", "turno", "fecha"], match: "Agenda, turnos y recordatorios" },
    { test: ["reporte", "indicador", "control", "métrica", "metrica"], match: "Dashboard de gestión" },
    { test: ["usuario", "rol", "permiso", "equipo"], match: "Portal interno multiusuario" },
    { test: ["automático", "automatico", "aviso", "notificación", "notificacion"], match: "Automatizaciones y notificaciones" }
  ];
  const selectedNames = new Set<string>();

  for (const keyword of keywords) {
    if (keyword.test.some((word) => texto.includes(word))) {
      selectedNames.add(keyword.match);
    }
  }

  if (selectedNames.size < 3) {
    for (const modulo of catalogo) {
      selectedNames.add(modulo.nombre);
      if (selectedNames.size >= 3) {
        break;
      }
    }
  }

  return catalogo
    .filter((modulo) => selectedNames.has(modulo.nombre))
    .slice(0, 6)
    .map((modulo) => ({
      modulo_id: modulo.id,
      nombre: modulo.nombre,
      descripcion: modulo.descripcion,
      categoria: modulo.categoria,
      precio_ideal: Number(modulo.precio_ideal ?? 0),
      precio_minimo: Number(modulo.precio_minimo ?? 0),
      incremento_mensual: Number(modulo.incremento_mensual ?? 0),
      justificacion: "Seleccionado por los dolores operativos detectados en las respuestas del diagnóstico.",
      problema_resuelve: "Desorden operativo y dependencia de seguimiento manual.",
      impacto_esperado: "Más trazabilidad, menos errores y mejor capacidad de control para la dirección.",
      funcionalidades: [
        "Registro centralizado de información",
        "Estados claros por proceso",
        "Responsables y próximos pasos",
        "Alertas y seguimiento operativo"
      ],
      tiempo_estimado_semanas: 2,
      prioridad: "Alta"
    }));
}

function sum(items: ModuloSugerido[], key: "precio_ideal" | "precio_minimo" | "incremento_mensual") {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

async function fetchOrBootstrapModulos(supabase: ReturnType<typeof createAdminClient>) {
  const { data: activeModulos, error: activeError } = await supabase
    .from("modulos_catalogo")
    .select("*")
    .eq("activo", true)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true })
    .returns<ModuloCatalogo[]>();

  if (activeError) {
    throw new Error(activeError.message);
  }

  if ((activeModulos ?? []).length > 0) {
    return activeModulos ?? [];
  }

  const { count: catalogCount, error: countError } = await supabase
    .from("modulos_catalogo")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(countError.message);
  }

  if (Number(catalogCount ?? 0) === 0) {
    const { error: insertError } = await supabase.from("modulos_catalogo").insert(MODULOS_CATALOGO_DEFAULT);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { data: nextModulos, error: nextError } = await supabase
    .from("modulos_catalogo")
    .select("*")
    .eq("activo", true)
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true })
    .returns<ModuloCatalogo[]>();

  if (nextError) {
    throw new Error(nextError.message);
  }

  return nextModulos ?? [];
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const token = params.token.trim();

    if (!token) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data: diagnostico, error: diagnosticoError } = await supabase
      .from("diagnosticos")
      .select("*, lead:leads(id, empresa, contacto_1_nombre, vendedor_id)")
      .eq("token_publico", token)
      .maybeSingle<DiagnosticoConLead>();

    if (diagnosticoError) {
      return NextResponse.json({ error: diagnosticoError.message }, { status: 500 });
    }

    if (!diagnostico) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    if (
      currentUser.rol !== "admin" &&
      (currentUser.rol !== "comercial" || diagnostico.lead?.vendedor_id !== currentUser.id)
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const [{ data: preguntas, error: preguntasError }, modulos] = await Promise.all([
      supabase
        .from("preguntas_diagnostico")
        .select("*")
        .eq("activa", true)
        .order("categoria", { ascending: true })
        .order("orden", { ascending: true })
        .returns<PreguntaDiagnostico[]>(),
      fetchOrBootstrapModulos(supabase)
    ]);

    if (preguntasError) {
      return NextResponse.json({ error: preguntasError.message }, { status: 500 });
    }

    const respuestas = mapRespuestas(diagnostico.respuestas, preguntas ?? []);
    const contextoAdicional = getContextoAdicional(diagnostico.respuestas);

    if (respuestas.length === 0) {
      return NextResponse.json(
        { error: "El diagnóstico todavía no tiene respuestas para analizar." },
        { status: 400 }
      );
    }

    if (modulos.length === 0) {
      return NextResponse.json(
        { error: "No hay módulos disponibles en el catálogo para armar la propuesta." },
        { status: 409 }
      );
    }

    const cuantificacion = await fetchCuantificacion(supabase, diagnostico.id);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY." }, { status: 500 });
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 9000,
        temperature: 0.2,
        system: buildSystemPrompt(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildPrompt({
                  empresa: diagnostico.lead?.empresa ?? null,
                  respuestas,
                  contextoAdicional,
                  modulos,
                  cuantificacion: JSON.stringify(cuantificacion, null, 2)
                })
              } satisfies AnthropicTextBlock
            ]
          }
        ]
      })
    });

    const anthropicPayload = (await anthropicResponse.json()) as AnthropicResponse;

    if (!anthropicResponse.ok) {
      return NextResponse.json(
        { error: anthropicPayload.error?.message ?? "Falló la generación con Claude." },
        { status: 500 }
      );
    }

    const responseText = anthropicPayload.content
      ?.filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!responseText) {
      return NextResponse.json({ error: "Claude no devolvió contenido textual." }, { status: 500 });
    }

    const parsed = parseClaudeInforme(responseText);
    const hallazgosCrudos = parsed.hallazgos.length > 0 ? parsed.hallazgos : buildFallbackHallazgos(respuestas);
    const hallazgosLimpios = sanitizeHallazgos(hallazgosCrudos, respuestas);
    const hallazgos = hallazgosLimpios.length > 0 ? hallazgosLimpios : buildFallbackHallazgos(respuestas);
    const resolvedModulos = resolveModulos(parsed.modulos_elegidos, modulos);
    const modulosSugeridos =
      resolvedModulos.length > 0 ? resolvedModulos : buildFallbackModulos(respuestas, modulos);

    const diagnosticoClaude = parsed.diagnostico_empresa ?? {};
    const oportunidadesClaude = Array.isArray(diagnosticoClaude.oportunidades_mejora)
      ? diagnosticoClaude.oportunidades_mejora
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .filter((value) => !containsVerbatimResponse(value, respuestas))
          .filter((value) => !normalizeForComparison(value).startsWith("un sistema a medida permitiria ordenar este flujo"))
      : [];
    const oportunidades = dedupeStrings(oportunidadesClaude);
    const oportunidadesFinales = dedupeStrings([...oportunidades, ...buildFallbackOportunidades(respuestas)]).slice(0, 7);
    const problemasClaude = Array.isArray(diagnosticoClaude.problemas_principales)
      ? diagnosticoClaude.problemas_principales.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0 && !containsVerbatimResponse(value, respuestas)
        )
      : [];
    const problemasFinales = dedupeStrings(problemasClaude).length >= 3
      ? dedupeStrings(problemasClaude).slice(0, 7)
      : hallazgos.map((hallazgo) => hallazgo.hallazgo);
    const antesDespuesLimpio = (Array.isArray(parsed.antes_despues) ? parsed.antes_despues : [])
      .filter((item) => item?.area && item.antes && item.despues && item.metrica)
      .map((item, index) => {
        const categoria = item.area ?? respuestas[index % Math.max(respuestas.length, 1)]?.categoria ?? "Operación";
        return {
          area: categoria,
          antes: containsVerbatimResponse(item.antes ?? "", respuestas)
            ? professionalDiagnostic({ categoria }, "hallazgo")
            : item.antes ?? "",
          despues: containsVerbatimResponse(item.despues ?? "", respuestas)
            ? professionalDiagnostic({ categoria }, "solucion")
            : item.despues ?? "",
          metrica: containsVerbatimResponse(item.metrica ?? "", respuestas)
            ? professionalDiagnostic({ categoria }, "impacto")
            : item.metrica ?? ""
        };
      });
    const antesDespues = antesDespuesLimpio.length > 0 ? antesDespuesLimpio : buildFallbackAntesDespues(respuestas);
    const mapaAreas = sanitizeMapaAreas(parsed.mapa_areas, respuestas, hallazgos);

    const precioIdealDesarrollo = sum(modulosSugeridos, "precio_ideal");
    const precioMinimoDesarrollo = sum(modulosSugeridos, "precio_minimo");
    const precioMensual = sum(modulosSugeridos, "incremento_mensual");

    const informeDiagnosticoPayload = {
      diagnostico_empresa: {
        resumen_ejecutivo:
          parsed.diagnostico_empresa?.resumen_ejecutivo && !containsVerbatimResponse(parsed.diagnostico_empresa.resumen_ejecutivo, respuestas)
            ? parsed.diagnostico_empresa.resumen_ejecutivo
            : "La operación tiene una base comercial y productiva valiosa, pero el crecimiento está sostenido por registros distribuidos y controles manuales que reducen la trazabilidad.",
        operativa_actual:
          parsed.diagnostico_empresa?.operativa_actual && !containsVerbatimResponse(parsed.diagnostico_empresa.operativa_actual, respuestas)
            ? parsed.diagnostico_empresa.operativa_actual
            : professionalDiagnostic({ categoria: respuestas[0]?.categoria ?? "Operación" }, "hallazgo"),
        problemas_principales: problemasFinales,
        costo_de_no_cambiar:
          parsed.diagnostico_empresa?.costo_de_no_cambiar && !containsVerbatimResponse(parsed.diagnostico_empresa.costo_de_no_cambiar, respuestas)
            ? parsed.diagnostico_empresa.costo_de_no_cambiar
            : "Mantener la operación sin un sistema central sostiene el reproceso, demora la lectura de la rentabilidad y aumenta el riesgo de diferencias que sólo aparecen al conciliar.",
        oportunidades_mejora: oportunidadesFinales,
        conclusion_diagnostico:
          parsed.diagnostico_empresa?.conclusion_diagnostico && !containsVerbatimResponse(parsed.diagnostico_empresa.conclusion_diagnostico, respuestas)
            ? parsed.diagnostico_empresa.conclusion_diagnostico
            : "La prioridad no es digitalizar por digitalizar: es instalar trazabilidad en los procesos que hoy concentran riesgo, tiempo manual y dependencia de memoria."
        ,
        contexto_empresa: parsed.diagnostico_empresa?.contexto_empresa && !containsVerbatimResponse(parsed.diagnostico_empresa.contexto_empresa, respuestas)
          ? parsed.diagnostico_empresa.contexto_empresa
          : "La empresa presenta una operación con múltiples puntos de coordinación que requieren visibilidad transversal y criterios comunes de seguimiento.",
        dependencias_criticas: dedupeStrings((parsed.diagnostico_empresa?.dependencias_criticas ?? []).filter((item) => typeof item === "string" && !containsVerbatimResponse(item, respuestas))).slice(0, 6),
        riesgos_operativos: dedupeStrings((parsed.diagnostico_empresa?.riesgos_operativos ?? []).filter((item) => typeof item === "string" && !containsVerbatimResponse(item, respuestas))).slice(0, 6),
        prioridades_90_dias: dedupeStrings((parsed.diagnostico_empresa?.prioridades_90_dias ?? []).filter((item) => typeof item === "string" && !containsVerbatimResponse(item, respuestas))).slice(0, 6),
        indicadores_clave: (parsed.diagnostico_empresa?.indicadores_clave ?? []).flatMap((item) => {
          if (!item || typeof item.nombre !== "string" || typeof item.lectura_actual !== "string" || typeof item.por_que_importa !== "string") return [];
          if (containsVerbatimResponse(item.lectura_actual, respuestas)) return [];
          return [{ nombre: item.nombre, lectura_actual: item.lectura_actual, por_que_importa: item.por_que_importa }];
        }).slice(0, 8),
        costo_mensual_estimado_usd: cuantificacion.resumen.total_mensual_usd,
        costo_anual_estimado_usd: cuantificacion.resumen.total_anual_usd,
        confianza_cuantificacion: cuantificacion.resumen.confianza
      },
      antes_despues: antesDespues,
      mapa_areas: mapaAreas,
      hallazgos,
      cuantificacion: cuantificacion.resumen
    };
    const propuestaPayload = {
      propuesta_software: parsed.propuesta_software ?? {
        vision_sistema: "Construir un sistema operativo propio para ordenar la operación y automatizar procesos críticos.",
        alcance_general: "El alcance inicial queda organizado por los módulos propuestos.",
        modelo_operativo: "Blyndtek implementa el sistema por fases, validando cada flujo con usuarios clave antes de avanzar al siguiente bloque.",
        beneficios_esperados: modulosSugeridos.map((modulo) => modulo.impacto_esperado || modulo.justificacion),
        entregables: [
          "Sistema web operativo con los módulos priorizados",
          "Usuarios, permisos y estados de trabajo definidos",
          "Capacitación inicial y acompañamiento de puesta en marcha"
        ],
        fuera_de_alcance: [
          "Integraciones o funcionalidades no detalladas en los módulos aprobados",
          "Carga histórica que requiera limpieza o transformación extraordinaria"
        ],
        criterios_exito: [
          "Los usuarios clave pueden completar los flujos priorizados sin depender de planillas paralelas",
          "La dirección puede consultar el estado de la operación desde una vista central"
        ],
        roadmap_implementacion: [
          {
            etapa: "Relevamiento y diseño funcional",
            descripcion: "Aterrizar flujos reales, roles, pantallas y prioridades.",
            duracion_estimada: "1 semana",
            subtareas: [
              "Mapear procesos actuales con responsables",
              "Definir entidades y permisos",
              "Priorizar módulos del MVP",
              "Cerrar alcance funcional validado"
            ],
            entregables: ["Mapa funcional validado", "Alcance priorizado", "Criterios de aceptación iniciales"],
            criterio_aceptacion: "El cliente valida por escrito el alcance, los roles y el orden de implementación.",
            responsable_cliente: "Disponibilizar usuarios clave y validar los flujos relevados."
          },
          {
            etapa: "Construcción del sistema",
            descripcion: "Desarrollar los módulos principales y validar con datos reales.",
            duracion_estimada: "4 a 7 semanas",
            subtareas: [
              "Construir módulos priorizados",
              "Crear flujos de estados y responsables",
              "Implementar tableros de control",
              "Probar con casos reales"
            ],
            entregables: ["Módulos priorizados funcionando", "Flujos de estados", "Primera versión de métricas"],
            criterio_aceptacion: "Los usuarios clave completan casos reales y se registran los ajustes pendientes.",
            responsable_cliente: "Probar casos reales, aportar feedback y designar un referente por área."
          },
          {
            etapa: "Implementación",
            descripcion: "Capacitar al equipo, ajustar fricciones y dejar el sistema operando.",
            duracion_estimada: "1 a 2 semanas",
            subtareas: [
              "Capacitar usuarios clave",
              "Migrar datos iniciales necesarios",
              "Ajustar fricciones de uso",
              "Dejar próximos pasos operativos"
            ],
            entregables: ["Usuarios capacitados", "Datos iniciales cargados", "Sistema listo para operación"],
            criterio_aceptacion: "El equipo ejecuta el flujo acordado y cuenta con un canal de soporte definido.",
            responsable_cliente: "Coordinar la adopción interna y confirmar el cierre de la etapa."
          }
        ],
        supuestos: ["El alcance final se confirma antes del inicio del desarrollo."],
        proximos_pasos: ["Revisar informe", "Validar módulos", "Cerrar alcance e iniciar proyecto"],
        condiciones_operativas: {
          propiedad_sistema: "El sistema desarrollado para el cliente queda destinado a su operación; los alcances de licencia, código y hosting se detallan en el acuerdo final.",
          soporte_mantenimiento: "El mantenimiento mensual cubre continuidad operativa, correcciones y ajustes menores dentro del alcance acordado.",
          cambios_alcance: "Nuevos módulos o cambios que alteren el alcance se estiman y aprueban por separado antes de construirse.",
          datos_y_migracion: "La migración inicial se limita a datos disponibles y utilizables; la limpieza extraordinaria se estima aparte si fuera necesaria."
        }
      },
      condiciones_comerciales: {
        precio_desarrollo_usd: precioIdealDesarrollo,
        adelanto_pct: 25,
        fecha_adelanto: null,
        cantidad_cuotas: 1,
        dia_pago: 10,
        fecha_primera_cuota: null,
        mantenimiento_mensual_usd: precioMensual,
        dia_facturacion_mantenimiento: precioMensual > 0 ? 10 : null
      },
      modulos: modulosSugeridos
    };

    const updatePayload = {
      informe_hallazgos: informeDiagnosticoPayload,
      modulos_sugeridos: propuestaPayload,
      precio_ideal_desarrollo: precioIdealDesarrollo,
      precio_minimo_desarrollo: precioMinimoDesarrollo,
      precio_ideal_mensual: precioMensual,
      precio_minimo_mensual: precioMensual,
      estado: "informe_generado"
    };

    const { data: updatedDiagnostico, error: updateError } = await supabase
      .from("diagnosticos")
      .update(updatePayload)
      .eq("id", diagnostico.id)
      .select("*")
      .single();

    if (updateError || !updatedDiagnostico) {
      return NextResponse.json(
        { error: updateError?.message ?? "No se pudo guardar el informe." },
        { status: 500 }
      );
    }

    const { error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        monto_propuesto_desarrollo: precioIdealDesarrollo,
        monto_propuesto_mensual: precioMensual > 0 ? precioMensual : null
      })
      .eq("id", diagnostico.lead_id);

    if (leadUpdateError) {
      return NextResponse.json({ error: leadUpdateError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        diagnostico: updatedDiagnostico as Diagnostico,
        informe_hallazgos: informeDiagnosticoPayload,
        modulos_sugeridos: propuestaPayload,
        precio_ideal_desarrollo: precioIdealDesarrollo,
        precio_minimo_desarrollo: precioMinimoDesarrollo,
        precio_ideal_mensual: precioMensual,
        precio_minimo_mensual: precioMensual,
        informe_url: `/diagnostico/${token}/informe`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
