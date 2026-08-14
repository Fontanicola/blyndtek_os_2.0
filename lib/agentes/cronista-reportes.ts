import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularMetricasAsesor } from "@/lib/agentes/calcularMetricasAsesor";
import { callClaudeJson, fechaActualArgentina } from "@/lib/agentes/cronista";
import type { ClaudeUsage } from "@/lib/agentes/cronista";
import type {
  AgentesDatabase,
  CronistaLogDiario,
  CronistaReporte,
  CronistaReporteTipo
} from "@/types/agentes";
import type { Cliente } from "@/types/clientes";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { Lead } from "@/types/leads";
import type { Proyecto } from "@/types/proyectos";
import type { Suscripcion } from "@/types/suscripciones";

export const CRONISTA_REPORTE_SEMANAL_ENDPOINT = "/api/agentes/cronista/reportes/semanal";
export const CRONISTA_REPORTE_MENSUAL_ENDPOINT = "/api/agentes/cronista/reportes/mensual";

export type CronistaPeriodo = {
  inicio: string;
  fin: string;
  anteriorInicio: string;
  anteriorFin: string;
  etiqueta: string;
};

export type CronistaMetricasReporte = {
  generado_at: string;
  periodo: { inicio: string; fin: string };
  comercial: {
    leads_nuevos: number;
    diagnosticos_ejecutados: number;
    cierres: number;
    pipeline_actual_usd: number;
    pipeline_snapshot_at: string;
  };
  financiero: {
    ingresos_cobrados_usd: number;
    egresos_pagados_usd: number;
    resultado_caja_periodo_usd: number;
    caja_actual_usd: number;
    runway_actual_meses: number | null;
    runway_estado: "normal" | "estable" | "agotado";
    snapshot_at: string;
  };
  delivery: {
    features_completadas: number;
    fases_entregadas: number;
    incidentes_sistemas: number;
  };
};

export type CronistaReporteContenido = {
  que_paso: string[];
  decisiones: string[];
  aprendizajes: string[];
  pendientes: string[];
  lectura_interpretativa: string;
  evolucion_por_area: {
    comercial: string;
    finanzas: string;
    delivery: string;
  };
};

export type CronistaFuentesReporte = {
  logs_diarios: Array<Pick<CronistaLogDiario, "id" | "fecha" | "estado" | "log_estructurado">>;
  reportes_semanales: Array<Pick<CronistaReporte, "id" | "periodo_inicio" | "periodo_fin" | "reporte_markdown">>;
  reporte_anterior: Pick<CronistaReporte, "id" | "periodo_inicio" | "periodo_fin" | "metricas_duras" | "reporte_markdown"> | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  return dateOnly(new Date(parseDateOnly(value).getTime() + days * DAY_MS));
}

function startIsoArgentina(value: string) {
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 3)).toISOString();
}

function endExclusiveIsoArgentina(value: string) {
  return startIsoArgentina(addDays(value, 1));
}

function formatIsoWeek(fecha: string) {
  const date = parseDateOnly(fecha);
  const thursday = new Date(date);
  const day = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${thursday.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

export function resolverPeriodoCronista(tipo: CronistaReporteTipo, referenceDate = new Date()): CronistaPeriodo {
  const hoy = fechaActualArgentina(referenceDate);
  const current = parseDateOnly(hoy);

  if (tipo === "semanal") {
    const weekday = current.getUTCDay();
    const fin = addDays(hoy, weekday === 0 ? 0 : 7 - weekday);
    const inicio = addDays(fin, -6);
    return {
      inicio,
      fin,
      anteriorInicio: addDays(inicio, -7),
      anteriorFin: addDays(fin, -7),
      etiqueta: formatIsoWeek(inicio)
    };
  }

  const firstCurrentMonth = `${hoy.slice(0, 7)}-01`;
  const fin = addDays(firstCurrentMonth, -1);
  const inicio = `${fin.slice(0, 7)}-01`;
  const anteriorFin = addDays(inicio, -1);
  const anteriorInicio = `${anteriorFin.slice(0, 7)}-01`;
  return { inicio, fin, anteriorInicio, anteriorFin, etiqueta: inicio.slice(0, 7) };
}

function numberSum(rows: Array<{ monto: number }>) {
  return rows.reduce((total, row) => total + Number(row.monto || 0), 0);
}

export async function reunirMetricasReporte(
  supabase: SupabaseClient<AgentesDatabase>,
  periodo: Pick<CronistaPeriodo, "inicio" | "fin">
): Promise<CronistaMetricasReporte> {
  const startIso = startIsoArgentina(periodo.inicio);
  const endIso = endExclusiveIsoArgentina(periodo.fin);
  const [
    leadsResult,
    clientesResult,
    proyectosResult,
    cobrosResult,
    egresosResult,
    suscripcionesResult,
    configResult,
    eventosResult,
    diagnosticosResult,
    incidentesResult
  ] = await Promise.all([
    supabase.from("leads").select("*"),
    supabase.from("clientes").select("*"),
    supabase.from("proyectos").select("*"),
    supabase.from("cobros").select("*"),
    supabase.from("egresos").select("*"),
    supabase.from("suscripciones").select("*"),
    supabase.from("config_finanzas").select("*").order("updated_at", { ascending: false }).limit(1),
    supabase
      .from("cronista_eventos_estado")
      .select("*")
      .gte("ocurrido_at", startIso)
      .lt("ocurrido_at", endIso),
    supabase
      .from("diagnosticos")
      .select("id,fecha_completado")
      .gte("fecha_completado", startIso)
      .lt("fecha_completado", endIso),
    supabase
      .from("sistemas_incidentes")
      .select("id,created_at")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
  ]);

  const errors = [
    leadsResult.error,
    clientesResult.error,
    proyectosResult.error,
    cobrosResult.error,
    egresosResult.error,
    suscripcionesResult.error,
    configResult.error,
    eventosResult.error,
    diagnosticosResult.error,
    incidentesResult.error
  ].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message ?? "No se pudieron reunir las métricas del reporte.");
  }

  const leads = (leadsResult.data ?? []) as Lead[];
  const clientes = (clientesResult.data ?? []) as Cliente[];
  const proyectos = (proyectosResult.data ?? []) as Proyecto[];
  const cobros = (cobrosResult.data ?? []) as Cobro[];
  const egresos = (egresosResult.data ?? []) as Egreso[];
  const suscripciones = (suscripcionesResult.data ?? []) as Suscripcion[];
  const eventos = eventosResult.data ?? [];
  const generadoAt = new Date().toISOString();
  const referencia = new Date(`${periodo.fin}T12:00:00-03:00`);
  const metricasSnapshot = calcularMetricasAsesor({
    cajaInicial: Number(configResult.data?.[0]?.caja_inicial ?? 0),
    runwayObjetivoMeses: 6,
    leads,
    clientes,
    proyectos,
    cobros,
    egresos,
    suscripciones,
    referenceDate: referencia
  });

  const ingresos = cobros.filter(
    (row) => row.estado === "cobrado" && Boolean(row.fecha_cobro) && row.fecha_cobro! >= periodo.inicio && row.fecha_cobro! <= periodo.fin
  );
  const egresosPagados = egresos.filter(
    (row) => row.pagado && Boolean(row.fecha_pago) && row.fecha_pago! >= periodo.inicio && row.fecha_pago! <= periodo.fin
  );
  const ingresosUsd = numberSum(ingresos);
  const egresosUsd = numberSum(egresosPagados);

  return {
    generado_at: generadoAt,
    periodo: { inicio: periodo.inicio, fin: periodo.fin },
    comercial: {
      leads_nuevos: leads.filter((row) => row.created_at >= startIso && row.created_at < endIso).length,
      diagnosticos_ejecutados: diagnosticosResult.data?.length ?? 0,
      cierres: eventos.filter(
        (row) => row.entidad_tipo === "lead" && row.estado_nuevo === "ganado"
      ).length,
      pipeline_actual_usd: metricasSnapshot.pipeline_ponderado_usd,
      pipeline_snapshot_at: generadoAt
    },
    financiero: {
      ingresos_cobrados_usd: ingresosUsd,
      egresos_pagados_usd: egresosUsd,
      resultado_caja_periodo_usd: ingresosUsd - egresosUsd,
      caja_actual_usd: metricasSnapshot.caja_actual_usd,
      runway_actual_meses: metricasSnapshot.runway_actual_meses,
      runway_estado: metricasSnapshot.runway_estado,
      snapshot_at: generadoAt
    },
    delivery: {
      features_completadas: eventos.filter(
        (row) => row.entidad_tipo === "feature" && row.estado_nuevo === "lista"
      ).length,
      fases_entregadas: eventos.filter(
        (row) => row.entidad_tipo === "fase_proyecto" && row.estado_nuevo === "lista"
      ).length,
      incidentes_sistemas: incidentesResult.data?.length ?? 0
    }
  };
}

export async function reunirFuentesReporte(
  supabase: SupabaseClient<AgentesDatabase>,
  tipo: CronistaReporteTipo,
  periodo: CronistaPeriodo
): Promise<CronistaFuentesReporte> {
  const [logsResult, weeklyResult, previousResult] = await Promise.all([
    supabase
      .from("logs_diarios")
      .select("id,fecha,estado,log_estructurado")
      .gte("fecha", periodo.inicio)
      .lte("fecha", periodo.fin)
      .order("fecha", { ascending: true }),
    tipo === "mensual"
      ? supabase
          .from("reportes_cronista")
          .select("id,periodo_inicio,periodo_fin,reporte_markdown")
          .eq("tipo", "semanal")
          .eq("estado", "completado")
          .gte("periodo_inicio", periodo.inicio)
          .lte("periodo_fin", periodo.fin)
          .order("periodo_inicio", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("reportes_cronista")
      .select("id,periodo_inicio,periodo_fin,metricas_duras,reporte_markdown")
      .eq("tipo", tipo)
      .eq("estado", "completado")
      .eq("periodo_inicio", periodo.anteriorInicio)
      .maybeSingle()
  ]);

  const errors = [logsResult.error, weeklyResult.error, previousResult.error].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message ?? "No se pudieron reunir las fuentes del reporte.");
  }

  const reportesSemanales = (weeklyResult.data ?? []) as CronistaFuentesReporte["reportes_semanales"];
  const logsDiarios = ((logsResult.data ?? []) as CronistaFuentesReporte["logs_diarios"]).filter((log) =>
    tipo !== "mensual" || !reportesSemanales.some(
      (reporte) => log.fecha >= reporte.periodo_inicio && log.fecha <= reporte.periodo_fin
    )
  );

  return {
    logs_diarios: logsDiarios,
    reportes_semanales: reportesSemanales,
    reporte_anterior: (previousResult.data ?? null) as CronistaFuentesReporte["reporte_anterior"]
  };
}

function safeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20)
    : [];
}

function safeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function generarContenidoReporte(params: {
  tipo: CronistaReporteTipo;
  periodo: CronistaPeriodo;
  metricas: CronistaMetricasReporte;
  fuentes: CronistaFuentesReporte;
}): Promise<{ contenido: CronistaReporteContenido; usage: ClaudeUsage }> {
  const { value, usage } = await callClaudeJson(
    [
      "Sos Cronista, el agente de memoria organizacional de Blyndtek.",
      "Generás un reporte confidencial para los socios usando exclusivamente las métricas y fuentes provistas.",
      "El destinatario es el grupo de socios: no omitas evidencia societaria ni financiera por sensibilidad; tratala como confidencial.",
      "No inventes causas, decisiones, aprendizajes ni comparaciones. Si no hay evidencia, indicá que no hay contexto suficiente.",
      "Diferenciá flujos del período de snapshots actuales; nunca presentes un snapshot actual como estado histórico.",
      "Una ausencia de log humano se expresa como 'sin contexto humano', nunca se completa con inferencias.",
      "La lectura interpretativa puede conectar evidencia explícita, pero debe marcar cualquier interpretación como tal.",
      'Respondé sólo JSON: {"que_paso":[],"decisiones":[],"aprendizajes":[],"pendientes":[],"lectura_interpretativa":"","evolucion_por_area":{"comercial":"","finanzas":"","delivery":""}}.'
    ].join(" "),
    [
      `Tipo: ${params.tipo}. Período: ${params.periodo.inicio} a ${params.periodo.fin}.`,
      `Métricas duras:\n${JSON.stringify(params.metricas, null, 2)}`,
      `Fuentes del período y comparación disponible:\n${JSON.stringify(params.fuentes, null, 2)}`
    ].join("\n\n"),
    params.tipo === "mensual" ? 3000 : 2400
  );

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Claude devolvió un reporte con formato inválido.");
  }
  const object = value as Record<string, unknown>;
  const areas = object.evolucion_por_area && typeof object.evolucion_por_area === "object" && !Array.isArray(object.evolucion_por_area)
    ? object.evolucion_por_area as Record<string, unknown>
    : {};

  return {
    contenido: {
      que_paso: safeStringList(object.que_paso),
      decisiones: safeStringList(object.decisiones),
      aprendizajes: safeStringList(object.aprendizajes),
      pendientes: safeStringList(object.pendientes),
      lectura_interpretativa: safeText(object.lectura_interpretativa, "No hay contexto suficiente para una lectura interpretativa."),
      evolucion_por_area: {
        comercial: safeText(areas.comercial, "Sin contexto suficiente."),
        finanzas: safeText(areas.finanzas, "Sin contexto suficiente."),
        delivery: safeText(areas.delivery, "Sin contexto suficiente.")
      }
    },
    usage
  };
}

function bullets(items: string[], empty: string) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export function construirReporteMarkdown(params: {
  tipo: CronistaReporteTipo;
  periodo: CronistaPeriodo;
  metricas: CronistaMetricasReporte;
  fuentes: CronistaFuentesReporte;
  contenido: CronistaReporteContenido;
}) {
  const { tipo, periodo, metricas, fuentes, contenido } = params;
  const title = `Log ${tipo} — ${periodo.etiqueta}`;
  const sinContexto = fuentes.logs_diarios.filter((log) => log.estado === "sin_contexto_humano").map((log) => log.fecha);
  const sourceLines = tipo === "mensual"
    ? [
        ...fuentes.reportes_semanales.map((row) => `- Reporte semanal ${row.periodo_inicio} a ${row.periodo_fin} (id: ${row.id}).`),
        ...fuentes.logs_diarios.map((row) => `- Log diario de borde ${row.fecha} — ${row.estado} (id: ${row.id}).`)
      ]
    : fuentes.logs_diarios.map((row) => `- Log diario ${row.fecha} — ${row.estado} (id: ${row.id}).`);

  return [
    "---",
    `titulo: "${title}"`,
    `fecha: ${periodo.inicio}`,
    "area: transversal",
    "areas:",
    "  - comercial",
    "  - finanzas",
    "  - delivery",
    `tags: [cronista, ${tipo}, socios, confidencial]`,
    "estado: consolidado",
    `periodo_inicio: ${periodo.inicio}`,
    `periodo_fin: ${periodo.fin}`,
    "---",
    "",
    `# ${title}`,
    "",
    "> Documento confidencial para socios de Blyndtek.",
    "",
    "## Qué pasó",
    "",
    bullets(contenido.que_paso, "No hubo hechos con contexto suficiente para consolidar."),
    "",
    "## Qué se decidió",
    "",
    bullets(contenido.decisiones, "No hay decisiones documentadas en las fuentes del período."),
    "",
    "## Qué se aprendió",
    "",
    bullets(contenido.aprendizajes, "No hay aprendizajes documentados en las fuentes del período."),
    "",
    "## Qué quedó pendiente",
    "",
    bullets(contenido.pendientes, "No hay pendientes documentados en las fuentes del período."),
    "",
    "## Lectura interpretativa",
    "",
    contenido.lectura_interpretativa,
    "",
    "## Evolución por área",
    "",
    `- Comercial: ${contenido.evolucion_por_area.comercial}`,
    `- Finanzas: ${contenido.evolucion_por_area.finanzas}`,
    `- Delivery: ${contenido.evolucion_por_area.delivery}`,
    "",
    "## Métricas duras",
    "",
    `- Comercial: ${metricas.comercial.leads_nuevos} leads nuevos, ${metricas.comercial.diagnosticos_ejecutados} diagnósticos, ${metricas.comercial.cierres} cierres; pipeline actual ${money(metricas.comercial.pipeline_actual_usd)} (snapshot ${metricas.comercial.pipeline_snapshot_at}).`,
    `- Finanzas: ingresos ${money(metricas.financiero.ingresos_cobrados_usd)}, egresos ${money(metricas.financiero.egresos_pagados_usd)}, resultado del período ${money(metricas.financiero.resultado_caja_periodo_usd)}; caja actual ${money(metricas.financiero.caja_actual_usd)} y runway ${metricas.financiero.runway_estado === "estable" ? "estable" : `${metricas.financiero.runway_actual_meses ?? "sin dato"} meses`} (snapshot ${metricas.financiero.snapshot_at}).`,
    `- Delivery: ${metricas.delivery.features_completadas} features completadas, ${metricas.delivery.fases_entregadas} fases entregadas, ${metricas.delivery.incidentes_sistemas} incidentes.`,
    "",
    "## Cobertura de contexto humano",
    "",
    sinContexto.length > 0 ? `- Sin contexto humano: ${sinContexto.join(", ")}.` : "- No hay días marcados sin contexto humano entre las fuentes disponibles.",
    "",
    "## Fuentes consolidadas",
    "",
    sourceLines.length > 0 ? sourceLines.join("\n") : "- No hay fuentes temporales disponibles; el reporte se apoya sólo en métricas duras.",
    ""
  ].join("\n");
}
