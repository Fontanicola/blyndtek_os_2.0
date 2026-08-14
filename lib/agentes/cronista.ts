import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentesDatabase,
  CronistaDatosDuros,
  CronistaPregunta
} from "@/types/agentes";

export const CRONISTA_SLUG = "cronista";
export const CRONISTA_AUTOMATIZACION_ENDPOINT = "/api/agentes/cronista/generar-preguntas";
export const CRONISTA_TIME_ZONE = "America/Argentina/Buenos_Aires";

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

export type ClaudeUsage = {
  tokensEntrada: number | null;
  tokensSalida: number | null;
  costoEstimadoUsd: number | null;
};

export type CronistaClasificacion = {
  hechos: string[];
  decisiones: string[];
  aprendizajes: string[];
  pendientes: string[];
  contexto_adicional: string[];
};

type EstadoLookupRow = {
  id: string;
  entidad_tipo: "lead" | "feature" | "fase_proyecto";
  entidad_id: string;
  estado_anterior: string;
  estado_nuevo: string;
  ocurrido_at: string;
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function compactText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function safeList(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => compactText(value))
    .filter(Boolean)
    .slice(0, 20);
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("Claude no devolvió JSON válido.");
  }

  return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
}

function extractClaudeText(payload: AnthropicResponse) {
  return payload.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}

function calculateUsage(payload: AnthropicResponse): ClaudeUsage {
  const tokensEntrada = payload.usage?.input_tokens ?? null;
  const tokensSalida = payload.usage?.output_tokens ?? null;
  const costoEstimadoUsd =
    tokensEntrada !== null || tokensSalida !== null
      ? Number((((tokensEntrada ?? 0) / 1_000_000) * 3 + ((tokensSalida ?? 0) / 1_000_000) * 15).toFixed(6))
      : null;

  return { tokensEntrada, tokensSalida, costoEstimadoUsd };
}

export async function callClaudeJson(system: string, user: string, maxTokens: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta ANTHROPIC_API_KEY.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature: 0.1,
      system,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: user }]
        }
      ]
    })
  });

  const payload = (await response.json()) as AnthropicResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Falló la generación con Claude.");
  }

  const text = extractClaudeText(payload);
  if (!text) {
    throw new Error("Claude no devolvió contenido textual.");
  }

  return { value: extractJsonObject(text), usage: calculateUsage(payload) };
}

export function fechaActualArgentina(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CRONISTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(referenceDate);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year ?? ""}-${values.month ?? ""}-${values.day ?? ""}`;
}

export function isCronistaDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function argentinaDayRange(fecha: string) {
  const [year = 0, month = 0, day = 0] = fecha.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values));
}

export function emptyCronistaDatosDuros(): CronistaDatosDuros {
  return {
    leads_nuevos: [],
    cambios_etapa_leads: [],
    cobros: [],
    egresos: [],
    features_completadas: [],
    fases_movidas: [],
    diagnosticos_ejecutados: [],
    incidentes_sistemas: []
  };
}

export async function reunirDatosDurosCronista(
  supabase: SupabaseClient<AgentesDatabase>,
  fecha: string
): Promise<CronistaDatosDuros> {
  const { startIso, endIso } = argentinaDayRange(fecha);
  const [
    leadsResult,
    eventosResult,
    cobrosResult,
    egresosResult,
    diagnosticosResult,
    incidentesResult
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,empresa,canal,etapa,created_at")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("cronista_eventos_estado")
      .select("*")
      .gte("ocurrido_at", startIso)
      .lt("ocurrido_at", endIso)
      .order("ocurrido_at", { ascending: true }),
    supabase
      .from("cobros")
      .select("id,concepto,monto,estado,fecha_emision,fecha_cobro,clientes(empresa)")
      .or(`fecha_emision.eq.${fecha},fecha_cobro.eq.${fecha}`),
    supabase
      .from("egresos")
      .select("id,concepto,monto,categoria,pagado,fecha,fecha_pago,clientes(empresa)")
      .or(`fecha.eq.${fecha},fecha_pago.eq.${fecha}`),
    supabase
      .from("diagnosticos")
      .select("id,estado,fecha_completado,leads(empresa)")
      .gte("fecha_completado", startIso)
      .lt("fecha_completado", endIso),
    supabase
      .from("sistemas_incidentes")
      .select("id,titulo,severidad,detalle,created_at,sistemas_gestionados(nombre)")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true })
  ]);

  const baseErrors = [
    leadsResult.error,
    eventosResult.error,
    cobrosResult.error,
    egresosResult.error,
    diagnosticosResult.error,
    incidentesResult.error
  ].filter(Boolean);

  if (baseErrors.length > 0) {
    throw new Error(baseErrors[0]?.message ?? "No se pudieron reunir los datos duros del día.");
  }

  const eventos = (eventosResult.data ?? []) as EstadoLookupRow[];
  const leadIds = uniqueIds(eventos.filter((item) => item.entidad_tipo === "lead").map((item) => item.entidad_id));
  const featureIds = uniqueIds(eventos.filter((item) => item.entidad_tipo === "feature").map((item) => item.entidad_id));
  const faseIds = uniqueIds(eventos.filter((item) => item.entidad_tipo === "fase_proyecto").map((item) => item.entidad_id));

  const [changedLeadsResult, featuresResult, fasesResult] = await Promise.all([
    leadIds.length > 0
      ? supabase.from("leads").select("id,empresa").in("id", leadIds)
      : Promise.resolve({ data: [], error: null }),
    featureIds.length > 0
      ? supabase.from("features").select("id,nombre,proyectos(nombre)").in("id", featureIds)
      : Promise.resolve({ data: [], error: null }),
    faseIds.length > 0
      ? supabase.from("fases_proyecto").select("id,nombre,proyectos(nombre)").in("id", faseIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  const lookupErrors = [changedLeadsResult.error, featuresResult.error, fasesResult.error].filter(Boolean);
  if (lookupErrors.length > 0) {
    throw new Error(lookupErrors[0]?.message ?? "No se pudieron resolver los cambios de estado del día.");
  }

  const leadNames = new Map(
    ((changedLeadsResult.data ?? []) as Array<{ id: string; empresa: string }>).map((row) => [row.id, row.empresa])
  );
  const featureNames = new Map(
    ((featuresResult.data ?? []) as Array<{ id: string; nombre: string; proyectos?: { nombre?: string | null } | null }>).map(
      (row) => [row.id, { nombre: row.nombre, proyecto: row.proyectos?.nombre ?? "Proyecto sin nombre" }]
    )
  );
  const faseNames = new Map(
    ((fasesResult.data ?? []) as Array<{ id: string; nombre: string; proyectos?: { nombre?: string | null } | null }>).map(
      (row) => [row.id, { nombre: row.nombre, proyecto: row.proyectos?.nombre ?? "Proyecto sin nombre" }]
    )
  );

  return {
    leads_nuevos: ((leadsResult.data ?? []) as Array<{ id: string; empresa: string; canal: string; etapa: string }>).map(
      (row) => ({ id: row.id, empresa: row.empresa, canal: row.canal, etapa: row.etapa })
    ),
    cambios_etapa_leads: eventos
      .filter((item) => item.entidad_tipo === "lead")
      .map((item) => ({
        lead_id: item.entidad_id,
        empresa: leadNames.get(item.entidad_id) ?? "Lead sin nombre",
        desde: item.estado_anterior,
        hasta: item.estado_nuevo,
        ocurrido_at: item.ocurrido_at
      })),
    cobros: ((cobrosResult.data ?? []) as Array<{
      id: string;
      concepto: string;
      monto: number;
      estado: string;
      fecha_cobro: string | null;
      clientes?: { empresa?: string | null } | null;
    }>).map((row) => ({
      id: row.id,
      concepto: row.concepto,
      monto: Number(row.monto),
      estado: row.estado,
      fecha_cobro: row.fecha_cobro,
      cliente: row.clientes?.empresa ?? null
    })),
    egresos: ((egresosResult.data ?? []) as Array<{
      id: string;
      concepto: string;
      monto: number;
      categoria: string;
      pagado: boolean;
      clientes?: { empresa?: string | null } | null;
    }>).map((row) => ({
      id: row.id,
      concepto: row.concepto,
      monto: Number(row.monto),
      categoria: row.categoria,
      pagado: row.pagado,
      cliente: row.clientes?.empresa ?? null
    })),
    features_completadas: eventos
      .filter((item) => item.entidad_tipo === "feature" && item.estado_nuevo === "lista")
      .map((item) => {
        const feature = featureNames.get(item.entidad_id);
        return {
          feature_id: item.entidad_id,
          nombre: feature?.nombre ?? "Feature sin nombre",
          proyecto: feature?.proyecto ?? "Proyecto sin nombre",
          ocurrido_at: item.ocurrido_at
        };
      }),
    fases_movidas: eventos
      .filter((item) => item.entidad_tipo === "fase_proyecto")
      .map((item) => {
        const fase = faseNames.get(item.entidad_id);
        return {
          fase_id: item.entidad_id,
          nombre: fase?.nombre ?? "Fase sin nombre",
          proyecto: fase?.proyecto ?? "Proyecto sin nombre",
          desde: item.estado_anterior,
          hasta: item.estado_nuevo,
          ocurrido_at: item.ocurrido_at
        };
      }),
    diagnosticos_ejecutados: ((diagnosticosResult.data ?? []) as Array<{
      id: string;
      estado: string;
      fecha_completado: string | null;
      leads?: { empresa?: string | null } | null;
    }>)
      .filter((row): row is {
        id: string;
        estado: string;
        fecha_completado: string;
        leads?: { empresa?: string | null } | null;
      } => Boolean(row.fecha_completado))
      .map((row) => ({
        diagnostico_id: row.id,
        empresa: row.leads?.empresa ?? "Lead sin nombre",
        estado: row.estado,
        fecha_completado: row.fecha_completado
      })),
    incidentes_sistemas: ((incidentesResult.data ?? []) as Array<{
      id: string;
      titulo: string;
      severidad: string;
      detalle: string | null;
      created_at: string;
      sistemas_gestionados?: { nombre?: string | null } | null;
    }>).map((row) => ({
      incidente_id: row.id,
      sistema: row.sistemas_gestionados?.nombre ?? "Sistema sin nombre",
      titulo: row.titulo,
      severidad: row.severidad,
      detalle: row.detalle,
      ocurrido_at: row.created_at
    }))
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

export function preguntasFallbackCronista(datos: CronistaDatosDuros): CronistaPregunta[] {
  const preguntas: string[] = [];
  const cambioLead = datos.cambios_etapa_leads[0];
  const leadNuevo = datos.leads_nuevos[0];
  const diagnostico = datos.diagnosticos_ejecutados[0];
  const incidente = datos.incidentes_sistemas[0];
  const feature = datos.features_completadas[0];
  const fase = datos.fases_movidas[0];

  if (cambioLead) {
    preguntas.push(
      `${cambioLead.empresa} pasó de ${cambioLead.desde} a ${cambioLead.hasta}. ¿Qué conversación o criterio explicó ese cambio?`
    );
  }

  if (leadNuevo) {
    preguntas.push(
      `Entró ${leadNuevo.empresa} por ${leadNuevo.canal}. ¿Qué señal inicial vale recordar para decidir cómo avanzar con este lead?`
    );
  }

  if (diagnostico) {
    preguntas.push(
      `Se completó el diagnóstico de ${diagnostico.empresa}. ¿Qué hallazgo cambió más tu lectura del problema?`
    );
  }

  if (incidente) {
    preguntas.push(
      `${incidente.sistema} registró el incidente “${incidente.titulo}”. ¿Qué decisión o regla debería quedar documentada para evitar repetirlo?`
    );
  }

  if (feature) {
    preguntas.push(
      `Se completó “${feature.nombre}” en ${feature.proyecto}. ¿Hubo algún trade-off o aprendizaje técnico que valga conservar?`
    );
  } else if (fase) {
    preguntas.push(
      `La fase “${fase.nombre}” de ${fase.proyecto} pasó de ${fase.desde} a ${fase.hasta}. ¿Qué habilitó o condicionó ese avance?`
    );
  }

  if (datos.cobros.length > 0 || datos.egresos.length > 0) {
    const cobros = datos.cobros.reduce((sum, item) => sum + item.monto, 0);
    const egresos = datos.egresos.reduce((sum, item) => sum + item.monto, 0);
    preguntas.push(
      `Hoy quedaron registrados ${formatMoney(cobros)} en cobros y ${formatMoney(egresos)} en egresos. ¿Alguno refleja una decisión financiera que convenga explicar?`
    );
  }

  const generales = [
    "¿Tomaste hoy alguna decisión que alguien necesitaría entender dentro de un año?",
    "¿Apareció una objeción, señal o patrón nuevo que pueda cambiar una decisión futura?",
    "¿Hubo algún error o costo de tiempo que deje una regla reutilizable?",
    "¿Quedó alguna ambigüedad o riesgo abierto que convenga hacer explícito?"
  ];

  for (const pregunta of generales) {
    if (preguntas.length >= 3) {
      break;
    }
    preguntas.push(pregunta);
  }

  return preguntas.slice(0, 5).map((texto, index) => ({ id: `p${index + 1}`, texto }));
}

export async function generarPreguntasCronista(datos: CronistaDatosDuros) {
  const fallback = preguntasFallbackCronista(datos);

  try {
    const { value, usage } = await callClaudeJson(
      [
        "Sos Cronista, el agente de memoria organizacional de Blyndtek.",
        "Recibís únicamente datos duros reales del día y generás entre 3 y 5 preguntas breves para Felipe.",
        "Las preguntas deben capturar el criterio detrás de los hechos: razones, objeciones, decisiones, trade-offs, causas y aprendizajes.",
        "No repitas los datos como reporte, no inventes hechos, no presupongas motivos y no presentes inferencias como certezas.",
        "Si faltan datos relevantes, hacé preguntas generales sobre decisiones o aprendizajes del día sin afirmar que algo ocurrió.",
        'Respondé sólo JSON con la forma {"preguntas":["...?"]}.'
      ].join(" "),
      `Datos duros del día:\n${JSON.stringify(datos, null, 2)}`,
      700
    );

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { preguntas: fallback, usage };
    }

    const rawQuestions = safeList((value as Record<string, unknown>).preguntas)
      .filter((question) => question.length <= 320)
      .slice(0, 5);

    if (rawQuestions.length < 3) {
      return { preguntas: fallback, usage };
    }

    return {
      preguntas: rawQuestions.map((texto, index) => ({ id: `p${index + 1}`, texto })),
      usage
    };
  } catch {
    return {
      preguntas: fallback,
      usage: { tokensEntrada: null, tokensSalida: null, costoEstimadoUsd: null }
    };
  }
}

export async function clasificarRespuestaCronista(
  datos: CronistaDatosDuros,
  preguntas: CronistaPregunta[],
  respuesta: string
) {
  try {
    const { value, usage } = await callClaudeJson(
      [
        "Sos Cronista, el agente de memoria organizacional de Blyndtek.",
        "Clasificás una respuesta humana en hechos contextualizados, decisiones, aprendizajes, pendientes y contexto adicional.",
        "No agregues causas, motivos, conclusiones ni relaciones que no estén expresamente en la respuesta.",
        "No conviertas una duda en certeza. Conservá la ambigüedad y omití categorías sin evidencia.",
        "Los datos duros sirven sólo para resolver referencias; no los reinterpretes ni los dupliques.",
        'Respondé sólo JSON con arrays de strings: {"hechos":[],"decisiones":[],"aprendizajes":[],"pendientes":[],"contexto_adicional":[]}.'
      ].join(" "),
      [
        `Datos duros:\n${JSON.stringify(datos, null, 2)}`,
        `Preguntas realizadas:\n${JSON.stringify(preguntas, null, 2)}`,
        `Respuesta textual de Felipe:\n${respuesta}`
      ].join("\n\n"),
      1200
    );

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("La clasificación no tiene el formato esperado.");
    }

    const object = value as Record<string, unknown>;
    const clasificacion: CronistaClasificacion = {
      hechos: safeList(object.hechos),
      decisiones: safeList(object.decisiones),
      aprendizajes: safeList(object.aprendizajes),
      pendientes: safeList(object.pendientes),
      contexto_adicional: safeList(object.contexto_adicional)
    };

    return { clasificacion, usage };
  } catch {
    return {
      clasificacion: {
        hechos: [],
        decisiones: [],
        aprendizajes: [],
        pendientes: ["Revisar manualmente la clasificación de la respuesta antes de consolidar este log."],
        contexto_adicional: [respuesta]
      } satisfies CronistaClasificacion,
      usage: { tokensEntrada: null, tokensSalida: null, costoEstimadoUsd: null } satisfies ClaudeUsage
    };
  }
}

function formatEnum(value: string) {
  return value.replace(/_/g, " ");
}

function markdownText(value: string) {
  return compactText(value).replace(/([\\`*_{}\[\]<>])/g, "\\$1");
}

function buildHardFacts(datos: CronistaDatosDuros) {
  const facts: string[] = [];

  for (const item of datos.leads_nuevos) {
    facts.push(`Lead nuevo: ${markdownText(item.empresa)} (${formatEnum(item.canal)}, etapa ${formatEnum(item.etapa)}).`);
  }
  for (const item of datos.cambios_etapa_leads) {
    facts.push(`Lead ${markdownText(item.empresa)}: etapa ${formatEnum(item.desde)} → ${formatEnum(item.hasta)}.`);
  }
  for (const item of datos.cobros) {
    facts.push(
      `Cobro: ${markdownText(item.concepto)}${item.cliente ? ` — ${markdownText(item.cliente)}` : ""}, ${formatMoney(item.monto)}, estado ${formatEnum(item.estado)}.`
    );
  }
  for (const item of datos.egresos) {
    facts.push(
      `Egreso: ${markdownText(item.concepto)}${item.cliente ? ` — ${markdownText(item.cliente)}` : ""}, ${formatMoney(item.monto)}, categoría ${formatEnum(item.categoria)}${item.pagado ? ", pagado" : ", pendiente"}.`
    );
  }
  for (const item of datos.features_completadas) {
    facts.push(`Feature completada: ${markdownText(item.nombre)} en ${markdownText(item.proyecto)}.`);
  }
  for (const item of datos.fases_movidas) {
    facts.push(
      `Fase ${markdownText(item.nombre)} de ${markdownText(item.proyecto)}: ${formatEnum(item.desde)} → ${formatEnum(item.hasta)}.`
    );
  }
  for (const item of datos.diagnosticos_ejecutados) {
    facts.push(`Diagnóstico ejecutado: ${markdownText(item.empresa)}, estado ${formatEnum(item.estado)}.`);
  }
  for (const item of datos.incidentes_sistemas) {
    facts.push(
      `Incidente de sistema: ${markdownText(item.sistema)} — ${markdownText(item.titulo)} (severidad ${formatEnum(item.severidad)}).`
    );
  }

  return facts;
}

function deriveAreas(datos: CronistaDatosDuros) {
  const areas = new Set<string>();
  if (datos.leads_nuevos.length > 0 || datos.cambios_etapa_leads.length > 0 || datos.diagnosticos_ejecutados.length > 0) {
    areas.add("comercial");
  }
  if (datos.cobros.length > 0 || datos.egresos.length > 0) {
    areas.add("finanzas");
  }
  if (datos.features_completadas.length > 0 || datos.fases_movidas.length > 0 || datos.incidentes_sistemas.length > 0) {
    areas.add("delivery");
  }
  return areas.size > 0 ? Array.from(areas) : ["transversal"];
}

function markdownList(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return `- ${emptyMessage}`;
  }
  return items.map((item) => `- ${markdownText(item)}`).join("\n");
}

export function construirLogMarkdown(params: {
  fecha: string;
  datos: CronistaDatosDuros;
  clasificacion?: CronistaClasificacion | null;
}) {
  const { fecha, datos, clasificacion = null } = params;
  const areas = deriveAreas(datos);
  const facts = [...buildHardFacts(datos), ...(clasificacion?.hechos ?? [])];
  const hasHumanContext = Boolean(clasificacion);
  const tags = ["cronista", "log-diario", ...(hasHumanContext ? [] : ["sin-contexto-humano"])]
    .map((tag) => `  - ${tag}`)
    .join("\n");

  return [
    "---",
    `titulo: "Log diario — ${fecha}"`,
    `fecha: ${fecha}`,
    "area: transversal",
    "areas:",
    ...areas.map((area) => `  - ${area}`),
    "tags:",
    tags,
    "estado: borrador",
    "---",
    "",
    `# Log diario — ${fecha}`,
    "",
    "## Qué pasó",
    "",
    markdownList(facts, "No se registraron hechos duros relevantes en Blyndtek OS para este día."),
    "",
    "## Decisiones tomadas",
    "",
    hasHumanContext
      ? markdownList(clasificacion?.decisiones ?? [], "No se identificaron decisiones explícitas en la respuesta.")
      : "- Sin contexto humano: no se registraron decisiones.",
    "",
    "## Aprendizajes",
    "",
    hasHumanContext
      ? markdownList(clasificacion?.aprendizajes ?? [], "No se identificaron aprendizajes explícitos en la respuesta.")
      : "- Sin contexto humano: no se registraron aprendizajes.",
    "",
    "## Pendientes abiertos",
    "",
    hasHumanContext
      ? markdownList(clasificacion?.pendientes ?? [], "No se identificaron pendientes explícitos en la respuesta.")
      : "- Responder las preguntas de Cronista para incorporar el criterio humano del día.",
    "",
    "## Contexto adicional",
    "",
    hasHumanContext
      ? markdownList(clasificacion?.contexto_adicional ?? [], "No se agregó contexto adicional.")
      : "- Estado de contexto humano: sin contexto humano.",
    ""
  ].join("\n");
}

export function addUsage(current: ClaudeUsage, next: ClaudeUsage): ClaudeUsage {
  const tokensEntrada =
    current.tokensEntrada !== null || next.tokensEntrada !== null
      ? (current.tokensEntrada ?? 0) + (next.tokensEntrada ?? 0)
      : null;
  const tokensSalida =
    current.tokensSalida !== null || next.tokensSalida !== null
      ? (current.tokensSalida ?? 0) + (next.tokensSalida ?? 0)
      : null;
  const costoEstimadoUsd =
    current.costoEstimadoUsd !== null || next.costoEstimadoUsd !== null
      ? Number(((current.costoEstimadoUsd ?? 0) + (next.costoEstimadoUsd ?? 0)).toFixed(6))
      : null;

  return { tokensEntrada, tokensSalida, costoEstimadoUsd };
}
