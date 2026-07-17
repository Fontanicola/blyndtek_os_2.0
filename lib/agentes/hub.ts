import type { SupabaseClient } from "@supabase/supabase-js";
import { AGENTE_ASESOR_FINANCIERO_SLUG } from "@/lib/agentes/agentes";
import type { Agente, AgenteAnalisis, AgenteTipo, AgentesDatabase } from "@/types/agentes";

export type AgentesHubPeriod = "month" | "quarter" | "year";

export type AgentesHubFeedItem = {
  id: string;
  agente: string;
  agente_slug: string;
  tipo: AgenteTipo;
  resumen: string;
  fecha: string;
  costo_usd: number | null;
  pr_url: string | null;
  items_generados: number | null;
};

export type AgentesHubCostoItem = {
  agente: string;
  costo_usd: number;
};

export type AgentesHubCostoTotal = {
  total_usd: number;
  desglose: AgentesHubCostoItem[];
};

export type AgentesHubCostoHistoricoSerie = {
  slug: string;
  label: string;
  color: string;
};

export type AgentesHubCostoHistoricoPoint = {
  mes: string;
  mes_key: string;
  total_usd: number;
  [key: string]: number | string;
};

export type AgentesHubCostoHistorico = {
  series: AgentesHubCostoHistoricoSerie[];
  data: AgentesHubCostoHistoricoPoint[];
  total_usd: number;
};

type AgenteRow = Pick<Agente, "id" | "slug" | "nombre" | "tipo">;

type ChecklistQaRow = {
  id: string;
  fase_id: string;
  created_at: string;
  fases_proyecto?: {
    nombre: string | null;
  } | null;
};

type AiDevExecutionRow = {
  id: string;
  fase_id: string;
  estado: "en_curso" | "completado" | "fallido";
  pr_url: string | null;
  costo_estimado_usd: number | null;
  iniciado_at: string;
  finalizado_at: string | null;
  fases_proyecto?: {
    nombre: string | null;
  } | null;
};

type AgentAnalysisRow = Pick<AgenteAnalisis, "id" | "agente_id" | "analisis_texto" | "costo_estimado_usd" | "created_at"> & {
  agentes?: Pick<AgenteRow, "slug" | "nombre" | "tipo"> | null;
};

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(value: string) {
  const [yearValue, monthValue] = value.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  return new Date(year, month - 1, 1);
}

function getHistoricalMonthKeys(months = 6, referenceDate = new Date()) {
  const current = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const keys: string[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const monthDate = new Date(current.getFullYear(), current.getMonth() - offset, 1);
    keys.push(monthKey(monthDate));
  }

  return keys;
}

function formatHistoricalMonthLabel(monthKeyValue: string) {
  return new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" }).format(parseMonthKey(monthKeyValue));
}

function getSerieColor(index: number) {
  const colors = ["#1F44FF", "#38A169", "#D97706", "#E11D48", "#6B7280"];
  return colors[index % colors.length] ?? "#1F44FF";
}

function startOfPeriod(period: AgentesHubPeriod, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (period === "year") {
    return new Date(year, 0, 1);
  }

  if (period === "quarter") {
    const quarterStart = Math.floor(month / 3) * 3;
    return new Date(year, quarterStart, 1);
  }

  return new Date(year, month, 1);
}

function normalizePreview(text: string, maxLength = 100) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function humanizeAiDevStatus(status: AiDevExecutionRow["estado"], prUrl: string | null) {
  if (status === "fallido") {
    return "fallido";
  }

  if (prUrl) {
    return "abierto";
  }

  return status === "completado" ? "completado" : "en curso";
}

function buildAgenteFeedFromAnalisis(rows: AgentAnalysisRow[]): AgentesHubFeedItem[] {
  return rows.map((row) => ({
    id: `analisis-${row.id}`,
    agente: row.agentes?.nombre ?? "Asesor Financiero",
    agente_slug: row.agentes?.slug ?? AGENTE_ASESOR_FINANCIERO_SLUG,
    tipo: row.agentes?.tipo ?? "analista",
    resumen: normalizePreview(row.analisis_texto),
    fecha: row.created_at,
    costo_usd: row.costo_estimado_usd ?? null,
    pr_url: null,
    items_generados: null
  }));
}

function buildAgenteFeedFromChecklist(rows: ChecklistQaRow[]): AgentesHubFeedItem[] {
  const grouped = new Map<string, { faseId: string; faseNombre: string; createdAt: string; count: number }>();

  for (const row of rows) {
    const key = `${row.fase_id}:${row.created_at}`;
    const current = grouped.get(key);
    const faseNombre = row.fases_proyecto?.nombre ?? "Sin nombre";

    if (!current) {
      grouped.set(key, {
        faseId: row.fase_id,
        faseNombre,
        createdAt: row.created_at,
        count: 1
      });
      continue;
    }

    current.count += 1;
  }

  return Array.from(grouped.values()).map((group, index) => ({
    id: `checklist-${group.faseId}-${group.createdAt}-${index}`,
    agente: "Generador de Checklist QA",
    agente_slug: "checklist-qa",
    tipo: "generador",
    resumen: `Checklist generada para ${group.faseNombre}${group.count > 1 ? ` (${group.count} ítems)` : ""}`,
    fecha: group.createdAt,
    costo_usd: null,
    pr_url: null,
    items_generados: group.count
  }));
}

function buildAgenteFeedFromAiDev(rows: AiDevExecutionRow[]): AgentesHubFeedItem[] {
  return rows.map((row) => ({
    id: `ai-dev-${row.id}`,
    agente: "Constructor de Fases (AI Dev)",
    agente_slug: "ai-dev",
    tipo: "ejecutor",
    resumen: `PR ${humanizeAiDevStatus(row.estado, row.pr_url)} para ${row.fases_proyecto?.nombre ?? "Sin nombre"}`,
    fecha: row.iniciado_at,
    costo_usd: row.costo_estimado_usd ?? null,
    pr_url: row.pr_url,
    items_generados: null
  }));
}

export async function fetchAgentesFeed(supabase: SupabaseClient<AgentesDatabase>, limit = 30) {
  const fetchLimit = Math.max(10, Math.min(limit * 3, 500));

  const [{ data: analysesData, error: analysesError }, { data: checklistData, error: checklistError }, { data: aiDevData, error: aiDevError }] =
    await Promise.all([
      supabase
        .from("agente_analisis")
        .select(
          `
            id,
            agente_id,
            analisis_texto,
            costo_estimado_usd,
            created_at,
            agentes (
              slug,
              nombre,
              tipo
            )
          `
        )
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
      supabase
        .from("checklist_qa")
        .select(
          `
            id,
            fase_id,
            created_at,
            fases_proyecto (
              nombre
            )
          `
        )
        .eq("generado_por_ia", true)
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
      supabase
        .from("ai_dev_ejecuciones")
        .select(
          `
            id,
            fase_id,
            estado,
            pr_url,
            costo_estimado_usd,
            iniciado_at,
            finalizado_at,
            fases_proyecto (
              nombre
            )
          `
        )
        .order("iniciado_at", { ascending: false })
        .limit(fetchLimit)
    ]);

  const errors = [analysesError, checklistError, aiDevError].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message ?? "No se pudo cargar la actividad de los agentes.");
  }

  const analyses = buildAgenteFeedFromAnalisis((analysesData ?? []) as AgentAnalysisRow[]);
  const checklists = buildAgenteFeedFromChecklist((checklistData ?? []) as ChecklistQaRow[]);
  const aiDev = buildAgenteFeedFromAiDev((aiDevData ?? []) as AiDevExecutionRow[]);

  return [...analyses, ...checklists, ...aiDev]
    .sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime())
    .slice(0, limit);
}

export async function fetchAgentesCostoTotal(
  supabase: SupabaseClient<AgentesDatabase>,
  period: AgentesHubPeriod = "month",
  referenceDate = new Date()
): Promise<AgentesHubCostoTotal> {
  const periodStart = startOfPeriod(period, referenceDate);
  const periodStartIso = periodStart.toISOString();

  const [
    { data: analysesData, error: analysesError },
    { data: aiDevData, error: aiDevError }
  ] = await Promise.all([
    supabase
      .from("agente_analisis")
      .select(
        `
          costo_estimado_usd,
          created_at,
          agentes (
            nombre
          )
        `
      )
      .gte("created_at", periodStartIso),
    supabase
      .from("ai_dev_ejecuciones")
      .select(
        `
          costo_estimado_usd,
          iniciado_at
        `
      )
      .gte("iniciado_at", periodStartIso)
  ]);

  const errors = [analysesError, aiDevError].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message ?? "No se pudo calcular el costo de IA.");
  }

  const breakdown = new Map<string, number>();

  for (const row of (analysesData ?? []) as Array<{ costo_estimado_usd: number | null; agentes?: { nombre?: string | null } | null }>) {
    const costo = Number(row.costo_estimado_usd ?? 0);
    if (costo <= 0) {
      continue;
    }

    const agente = row.agentes?.nombre ?? "Asesor Financiero";
    breakdown.set(agente, (breakdown.get(agente) ?? 0) + costo);
  }

  for (const row of (aiDevData ?? []) as Array<{ costo_estimado_usd: number | null }>) {
    const costo = Number(row.costo_estimado_usd ?? 0);
    if (costo <= 0) {
      continue;
    }

    breakdown.set("Constructor de Fases (AI Dev)", (breakdown.get("Constructor de Fases (AI Dev)") ?? 0) + costo);
  }

  const desglose = Array.from(breakdown.entries()).map(([agente, costo_usd]) => ({
    agente,
    costo_usd: Number(costo_usd.toFixed(6))
  }));

  const total_usd = Number(desglose.reduce((total, item) => total + item.costo_usd, 0).toFixed(6));

  return { total_usd, desglose };
}

type HistoricalCostRow = {
  costo_estimado_usd: number | null;
  created_at?: string;
  iniciado_at?: string;
  agentes?: {
    slug?: string | null;
    nombre?: string | null;
    tipo?: AgenteTipo | null;
  } | null;
};

export async function fetchAgentesCostoHistorico(
  supabase: SupabaseClient<AgentesDatabase>,
  months = 6,
  referenceDate = new Date()
): Promise<AgentesHubCostoHistorico> {
  const monthKeys = getHistoricalMonthKeys(months, referenceDate);
  const periodStart = new Date(parseMonthKey(monthKeys[0] ?? monthKey(referenceDate)).getTime());
  const periodStartIso = periodStart.toISOString();

  const [analysesResult, aiDevResult] = await Promise.all([
    supabase
      .from("agente_analisis")
      .select(
        `
          costo_estimado_usd,
          created_at,
          agentes (
            slug,
            nombre,
            tipo
          )
        `
      )
      .gte("created_at", periodStartIso),
    supabase
      .from("ai_dev_ejecuciones")
      .select(
        `
          costo_estimado_usd,
          iniciado_at
        `
      )
      .gte("iniciado_at", periodStartIso)
  ]);

  const errors = [analysesResult.error, aiDevResult.error].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message ?? "No se pudo cargar el histórico de costos.");
  }

  const rows = [
    ...((analysesResult.data ?? []) as HistoricalCostRow[]),
    ...((aiDevResult.data ?? []) as HistoricalCostRow[])
  ];

  const seriesMetaMap = new Map<string, AgentesHubCostoHistoricoSerie>();
  const seriesByMonth = new Map<string, AgentesHubCostoHistoricoPoint>();

  for (const monthKeyValue of monthKeys) {
    seriesByMonth.set(monthKeyValue, { mes_key: monthKeyValue, mes: formatHistoricalMonthLabel(monthKeyValue), total_usd: 0 });
  }

  for (const row of rows) {
    const costo = Number(row.costo_estimado_usd ?? 0);
    if (costo <= 0) {
      continue;
    }

    const dateValue = row.created_at ?? row.iniciado_at;
    if (!dateValue) {
      continue;
    }

    const monthValue = monthKey(new Date(dateValue));
    const current = seriesByMonth.get(monthValue);
    if (!current) {
      continue;
    }

    const slug = row.agentes?.slug ?? "ai-dev";
    const label = row.agentes?.nombre ?? (slug === "ai-dev" ? "Constructor de Fases (AI Dev)" : "Asesor Financiero");
    const serie = seriesMetaMap.get(slug);

    if (!serie) {
      seriesMetaMap.set(slug, {
        slug,
        label,
        color: getSerieColor(seriesMetaMap.size)
      });
    }

    const currentValue = Number(current[slug] ?? 0);
    current[slug] = Number((currentValue + costo).toFixed(6));
    current.total_usd = Number((current.total_usd + costo).toFixed(6));
  }

  const series = Array.from(seriesMetaMap.values());
  const data = monthKeys.map((monthValue) => {
    const base = seriesByMonth.get(monthValue) ?? { mes_key: monthValue, mes: formatHistoricalMonthLabel(monthValue), total_usd: 0 };
    const point: AgentesHubCostoHistoricoPoint = {
      ...base
    } as AgentesHubCostoHistoricoPoint;

    for (const serie of series) {
      point[serie.slug] = Number(point[serie.slug] ?? 0);
    }

    return point;
  });

  const total_usd = Number(
    data.reduce((total, point) => total + Number(point.total_usd ?? 0), 0).toFixed(6)
  );

  return { series, data, total_usd };
}

export function getAgentesTipoSectionLabel(tipo: AgenteTipo) {
  switch (tipo) {
    case "analista":
      return "Analistas";
    case "generador":
      return "Generadores";
    case "ejecutor":
      return "Ejecutores";
    case "vigilante":
      return "Vigilantes";
  }
}

export function getAgentesTipoBadgeVariant(tipo: AgenteTipo) {
  switch (tipo) {
    case "analista":
      return "signal" as const;
    case "generador":
      return "success" as const;
    case "ejecutor":
      return "warning" as const;
    case "vigilante":
      return "ghost" as const;
  }
}

export function getAgentesTipoResumen(tipo: AgenteTipo) {
  switch (tipo) {
    case "analista":
      return "Analiza números reales y propone caminos con razonamiento.";
    case "generador":
      return "Genera checklists de QA y otras salidas estructuradas.";
    case "ejecutor":
      return "Coordina tareas de AI Dev y registra PRs / webhooks.";
    case "vigilante":
      return "Supervisa señales y alertas automáticas del sistema.";
  }
}

export function getAgentesTipoActivityLabel(tipo: AgenteTipo) {
  switch (tipo) {
    case "analista":
      return "análisis";
    case "generador":
      return "checklist";
    case "ejecutor":
      return "ejecución";
    case "vigilante":
      return "alerta";
  }
}

export function formatAgentesRelativeTime(dateString: string, referenceDate = new Date()) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "hace un momento";
  }

  const diffMs = referenceDate.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) {
    return "hace un momento";
  }
  if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `hace ${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `hace ${diffDays} d`;
  }

  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date);
}

export function getAgentesCurrentMonthLabel(referenceDate = new Date()) {
  return monthKey(referenceDate);
}
