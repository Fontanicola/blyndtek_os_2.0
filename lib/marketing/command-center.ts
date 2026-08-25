import { getMetaOverview } from "@/lib/meta/overview";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { MarketingCommandCenter, MarketingPriority } from "@/types/marketingCommand";
import type { MarketingHubPeriod } from "@/types/marketingHub";

const QUALIFIED_STAGES = new Set(["calificado", "diagnostico_ofrecido", "diagnostico_pagado", "cotizacion", "ganado"]);

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function divide(a: number, b: number) {
  return b > 0 ? a / b : null;
}

function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function inferCreativeAngle(name: string, body: string | null) {
  const text = `${name} ${body || ""}`.toLocaleLowerCase("es");
  if (/caso|resultado|cliente|antes y despu[eé]s|testimonio/.test(text)) return "Prueba y resultados";
  if (/error|problema|caos|pierde|costo oculto|dolor/.test(text)) return "Dolor y costo de no actuar";
  if (/automat|tiempo|eficien|productiv|escalar/.test(text)) return "Eficiencia y escala";
  if (/c[oó]mo|paso|demo|mir[aá]|proceso/.test(text)) return "Demostración";
  if (/dato|n[uú]mero|porcentaje|\d+%/.test(text)) return "Dato contracultural";
  return "Propuesta de valor";
}

function mapGoal(row: Record<string, unknown> | null, month: string): MarketingCommandCenter["goal"] {
  return {
    id: row?.id ? String(row.id) : null,
    periodMonth: month,
    budgetUsd: num(row?.budget_usd),
    leadsTarget: num(row?.leads_target),
    qualifiedLeadsTarget: num(row?.qualified_leads_target),
    wonLeadsTarget: num(row?.won_leads_target),
    revenueTargetUsd: num(row?.revenue_target_usd),
    targetCpl: row?.target_cpl == null ? null : num(row.target_cpl),
    targetCpql: row?.target_cpql == null ? null : num(row.target_cpql),
    targetCac: row?.target_cac == null ? null : num(row.target_cac),
    targetCashRoas: row?.target_cash_roas == null ? null : num(row.target_cash_roas),
  };
}

function mapPriority(row: Record<string, unknown>): MarketingPriority {
  return {
    id: String(row.id),
    date: String(row.priority_date),
    title: String(row.title),
    reason: String(row.reason),
    action: String(row.recommended_action),
    impact: row.impact as MarketingPriority["impact"],
    confidence: num(row.confidence),
    effort: row.effort as MarketingPriority["effort"],
    source: String(row.source),
    entityType: row.entity_type ? String(row.entity_type) : null,
    entityId: row.entity_id ? String(row.entity_id) : null,
    status: row.status as MarketingPriority["status"],
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    taskId: row.task_id ? String(row.task_id) : null,
    dueAt: row.due_at ? String(row.due_at) : null,
  };
}

function buildPriorities(input: {
  date: string;
  goalConfigured: boolean;
  spend: number;
  budget: number;
  leads: number;
  attributionGap: number;
  staleSyncHours: number | null;
  staleLeads: number;
  unassignedLeads: number;
  fatiguedCreative: { adId: string; name: string } | null;
  scheduledContent: number;
  luliOpenTasks: number;
}) {
  const priorities: MarketingPriority[] = [];
  const add = (priority: Omit<MarketingPriority, "id" | "date" | "status" | "assignedTo" | "taskId" | "dueAt"> & Partial<Pick<MarketingPriority, "assignedTo">>) => {
    priorities.push({ id: null, date: input.date, status: "suggested", assignedTo: priority.assignedTo ?? null, taskId: null, dueAt: null, ...priority });
  };

  if (!input.goalConfigured) add({ title: "Definir objetivos del mes", reason: "Sin metas no se puede medir pacing, desvíos ni probabilidad de cumplimiento.", action: "Cargar presupuesto, leads, calificados, ventas e ingresos objetivo.", impact: "high", confidence: 100, effort: "low", source: "goals", entityType: "goal", entityId: input.date.slice(0, 7) });
  if (input.staleSyncHours != null && input.staleSyncHours > 36) add({ title: "Recuperar la sincronización de Meta", reason: `La última sincronización fue hace ${Math.round(input.staleSyncHours)} horas.`, action: "Ejecutar sincronización y revisar el error antes de tomar decisiones de campaña.", impact: "high", confidence: 98, effort: "low", source: "data_health", entityType: "connection", entityId: "meta" });
  if (input.spend > 0 && input.leads === 0) add({ title: "Revisar inversión sin demanda atribuida", reason: `Se invirtieron USD ${input.spend.toFixed(0)} sin leads CRM atribuibles.`, action: "Validar landing, formulario, CAPI y propuesta antes de ampliar presupuesto.", impact: "high", confidence: 92, effort: "medium", source: "funnel", entityType: "account", entityId: "meta" });
  if (input.attributionGap > 25) add({ title: "Cerrar la brecha Meta–CRM", reason: `La diferencia de atribución es ${input.attributionGap.toFixed(0)}%.`, action: "Revisar UTMs, fbclid, web_session_id y deduplicación de leads.", impact: "high", confidence: 90, effort: "medium", source: "attribution", entityType: "tracking", entityId: "meta-crm" });
  if (input.staleLeads > 0) add({ title: `Resolver ${input.staleLeads} leads detenidos`, reason: "Permanecen abiertos sin movimiento reciente y pueden perder intención.", action: "Asignar próxima acción, responsable y fecha de seguimiento.", impact: "high", confidence: 88, effort: "medium", source: "crm", entityType: "lead", entityId: "stale" });
  if (input.unassignedLeads > 0) add({ title: `Asignar ${input.unassignedLeads} leads sin responsable`, reason: "No tienen dueño comercial y el tiempo de respuesta impacta la conversión.", action: "Asignarlos y realizar el primer contacto hoy.", impact: "high", confidence: 95, effort: "low", source: "crm", entityType: "lead", entityId: "unassigned" });
  if (input.fatiguedCreative) add({ title: `Preparar reemplazo para ${input.fatiguedCreative.name}`, reason: "La frecuencia y la caída de respuesta indican fatiga creativa.", action: "Crear una variante conservando el ángulo y cambiando hook, apertura y visual.", impact: "medium", confidence: 82, effort: "medium", source: "creative", entityType: "ad", entityId: input.fatiguedCreative.adId });
  if (input.scheduledContent < 2) add({ title: "Completar el calendario de contenido", reason: `Sólo hay ${input.scheduledContent} piezas programadas para los próximos siete días.`, action: "Aprobar y programar al menos dos piezas alineadas con los ángulos de campaña.", impact: "medium", confidence: 85, effort: "medium", source: "content", entityType: "content", entityId: "calendar" });
  if (input.luliOpenTasks === 0) add({ title: "Preparar el próximo bloque de producción de Luli", reason: "Luli no tiene tareas abiertas, pero el sistema debe priorizar trabajo con impacto y no volumen vacío.", action: "Asignar guiones, grabaciones o adaptaciones vinculadas al calendario y a necesidades de pauta.", impact: "medium", confidence: 90, effort: "low", source: "team", entityType: "user", entityId: "luli" });

  return priorities.sort((a, b) => (a.impact === b.impact ? b.confidence - a.confidence : a.impact === "high" ? -1 : 1)).slice(0, 8);
}

export async function getMarketingCommandCenter(period: MarketingHubPeriod = "30d"): Promise<MarketingCommandCenter> {
  const db = createUntypedAdminClient();
  const now = new Date();
  const month = monthStart(now);
  const monthKey = dateKey(month);
  const today = dateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const sevenDays = new Date(now);
  sevenDays.setUTCDate(sevenDays.getUTCDate() + 7);

  const [meta, goalResult, experimentResult, priorityResult, sessionsResult, capiResult, leadsResult, connectionResult, piecesResult, luliResult, reportResult, adInsightsResult, taxonomyResult] = await Promise.all([
    getMetaOverview(period === "year" ? "year" : "30d"),
    db.from("marketing_goals").select("*").eq("period_month", monthKey).maybeSingle(),
    db.from("marketing_experiments").select("*").order("created_at", { ascending: false }).limit(30),
    db.from("marketing_daily_priorities").select("*").eq("priority_date", today).neq("status", "dismissed").order("created_at"),
    db.from("web_sessions").select("id,utm_source,utm_medium,utm_campaign,meta_campaign_id,fbclid").gte("started_at", month.toISOString()),
    db.from("meta_capi_events").select("id,status").gte("created_at", month.toISOString()),
    db.from("leads").select("id,etapa,responsable_id,created_at,updated_at,meta_campaign_id,campana_origen,web_session_id,canal_origen").gte("created_at", month.toISOString()),
    db.from("meta_connections").select("last_sync_at,status,last_error").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("piezas_contenido").select("id,estado,fecha_programada,plataforma").order("created_at", { ascending: false }).limit(250),
    db.from("usuarios").select("id,nombre").eq("rol", "marketing").ilike("nombre", "%Luli%").limit(1).maybeSingle(),
    db.from("marketing_weekly_reports").select("*").order("week_start", { ascending: false }).limit(1).maybeSingle(),
    db.from("meta_insights_daily").select("ad_id,impressions,reach,spend,link_clicks,leads,date_start").eq("entity_level", "ad").gte("date_start", dateKey(new Date(now.getTime() - 14 * 86400000))),
    db.from("marketing_creative_taxonomy").select("*").limit(500),
  ]);

  const missingCommandTables = [goalResult, experimentResult, priorityResult, reportResult, taxonomyResult].some((result) => result.error?.code === "42P01" || result.error?.code === "PGRST205");
  if (missingCommandTables) throw new Error("La migración del Marketing Command Center todavía no fue aplicada.");

  const goal = mapGoal((goalResult.data ?? null) as Record<string, unknown> | null, monthKey);
  const leads = leadsResult.data ?? [];
  const crmLeads = leads.filter((lead) => lead.canal_origen === "meta_ads" || lead.meta_campaign_id || lead.web_session_id);
  const qualified = crmLeads.filter((lead) => QUALIFIED_STAGES.has(String(lead.etapa)));
  const won = crmLeads.filter((lead) => lead.etapa === "ganado");

  const monthlyTrend = meta.trend.filter((point) => point.date >= monthKey);
  const spend = monthlyTrend.reduce((sum, point) => sum + point.spend, 0);
  const revenue = meta.kpis.collectedRevenue;
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const dayOfMonth = Math.min(now.getUTCDate(), daysInMonth);
  const expectedSpend = goal.budgetUsd * (dayOfMonth / daysInMonth);
  const projectedSpend = dayOfMonth ? (spend / dayOfMonth) * daysInMonth : 0;
  const projectedLeads = dayOfMonth ? (crmLeads.length / dayOfMonth) * daysInMonth : 0;
  const budgetVariance = spend - expectedSpend;
  const pacingStatus = !goal.budgetUsd ? "not_configured" : Math.abs(budgetVariance) <= goal.budgetUsd * 0.08 ? "on_track" : budgetVariance > 0 ? "ahead" : "behind";

  let cumulativeSpend = 0;
  const trend = monthlyTrend.map((point, index) => {
    cumulativeSpend += point.spend;
    const plannedSpend = goal.budgetUsd ? goal.budgetUsd / daysInMonth : 0;
    return { date: point.date, actualSpend: point.spend, plannedSpend, cumulativeSpend, cumulativePlan: plannedSpend * (index + 1) };
  });

  const sessions = sessionsResult.data ?? [];
  const sessionsWithAttribution = sessions.filter((session) => session.utm_campaign || session.meta_campaign_id || session.fbclid).length;
  const utmCoverage = sessions.length ? sessionsWithAttribution / sessions.length : 1;
  const capi = capiResult.data ?? [];
  const capiHealthy = capi.length ? capi.filter((row) => row.status === "sent").length / capi.length : null;
  const connection = connectionResult.data;
  const staleSyncHours = connection?.last_sync_at ? (Date.now() - new Date(connection.last_sync_at).getTime()) / 3600000 : null;
  const attributionGap = meta.kpis.platformLeads ? Math.abs(meta.kpis.platformLeads - crmLeads.length) / meta.kpis.platformLeads : 0;

  const activeLeads = crmLeads.filter((lead) => !["ganado", "descartado"].includes(String(lead.etapa)));
  const staleLeads = activeLeads.filter((lead) => Date.now() - new Date(lead.updated_at || lead.created_at).getTime() > 72 * 3600000).length;
  const unassignedLeads = activeLeads.filter((lead) => !lead.responsable_id).length;
  const ages = activeLeads.map((lead) => (Date.now() - new Date(lead.created_at).getTime()) / 3600000);

  const adInsightMap = new Map<string, { impressions: number; reach: number; spend: number; clicks: number; leads: number }>();
  for (const row of adInsightsResult.data ?? []) {
    if (!row.ad_id) continue;
    const current = adInsightMap.get(row.ad_id) ?? { impressions: 0, reach: 0, spend: 0, clicks: 0, leads: 0 };
    current.impressions += num(row.impressions); current.reach += num(row.reach); current.spend += num(row.spend); current.clicks += num(row.link_clicks); current.leads += num(row.leads);
    adInsightMap.set(row.ad_id, current);
  }
  const taxonomy = new Map((taxonomyResult.data ?? []).map((row) => [String(row.ad_id), row]));
  const creativeSignals = meta.creatives.map((creative) => {
    const delivery = adInsightMap.get(creative.adId);
    const classification = taxonomy.get(creative.adId);
    const frequency = delivery?.reach ? delivery.impressions / delivery.reach : 0;
    const fatigue = frequency >= 4 || (creative.spend >= 100 && creative.ctr < 0.7) ? "fatigued" : frequency >= 2.8 || (creative.spend >= 60 && creative.ctr < 0.9) ? "watch" : "fresh";
    return { adId: creative.adId, name: creative.adName, angle: classification?.angle || inferCreativeAngle(creative.adName, creative.body), format: classification?.format || creative.format, spend: creative.spend, ctr: creative.ctr, cpl: creative.cpl, frequency, fatigue, recommendation: fatigue === "fatigued" ? "Crear reemplazo y reducir exposición de la pieza actual." : fatigue === "watch" ? "Preparar una variante antes de que caiga el rendimiento." : "Mantener y documentar el aprendizaje." } as MarketingCommandCenter["creativeSignals"][number];
  }).sort((a, b) => b.spend - a.spend).slice(0, 12);

  const pieces = piecesResult.data ?? [];
  const pipelineMap = new Map<string, number>();
  for (const piece of pieces) pipelineMap.set(String(piece.estado), (pipelineMap.get(String(piece.estado)) ?? 0) + 1);
  const scheduledContent = pieces.filter((piece) => piece.estado === "programada" && piece.fecha_programada && new Date(piece.fecha_programada) >= now && new Date(piece.fecha_programada) <= sevenDays).length;
  const missingSchedule = pieces.filter((piece) => ["idea", "borrador", "lista"].includes(String(piece.estado)) && !piece.fecha_programada).length;

  const luli = luliResult.data;
  let luliTasks: Array<Record<string, unknown>> = [];
  let teamSetting: Record<string, unknown> | null = null;
  if (luli?.id) {
    const [taskResult, settingResult] = await Promise.all([
      db.from("tareas").select("id,estado,fecha_limite").eq("responsable_id", luli.id).neq("estado", "terminada"),
      db.from("marketing_team_settings").select("*").eq("user_id", luli.id).maybeSingle(),
    ]);
    luliTasks = taskResult.data ?? [];
    teamSetting = settingResult.data ?? null;
  }

  const generatedPriorities = buildPriorities({
    date: today,
    goalConfigured: Boolean(goal.id && goal.budgetUsd), spend, budget: goal.budgetUsd, leads: crmLeads.length,
    attributionGap: attributionGap * 100, staleSyncHours, staleLeads, unassignedLeads,
    fatiguedCreative: creativeSignals.find((item) => item.fatigue === "fatigued") ?? null,
    scheduledContent, luliOpenTasks: luliTasks.length,
  });
  const priorities = (priorityResult.data?.length ? priorityResult.data.map((row) => mapPriority(row as Record<string, unknown>)) : generatedPriorities);

  const checks: MarketingCommandCenter["dataHealth"]["checks"] = [
    { key: "meta_sync", label: "Sincronización Meta", status: staleSyncHours == null ? "critical" : staleSyncHours > 36 ? "critical" : staleSyncHours > 12 ? "warning" : "healthy", detail: staleSyncHours == null ? "Sin sincronización registrada" : `Última actualización hace ${Math.round(staleSyncHours)} h` },
    { key: "utm", label: "Cobertura de atribución web", status: utmCoverage >= 0.85 ? "healthy" : utmCoverage >= 0.6 ? "warning" : "critical", detail: `${Math.round(utmCoverage * 100)}% de sesiones identificables` },
    { key: "capi", label: "Conversions API", status: capiHealthy == null ? "warning" : capiHealthy >= 0.9 ? "healthy" : capiHealthy >= 0.7 ? "warning" : "critical", detail: capiHealthy == null ? "Todavía sin eventos" : `${Math.round(capiHealthy * 100)}% enviados correctamente` },
    { key: "reconciliation", label: "Reconciliación Meta–CRM", status: attributionGap <= 0.15 ? "healthy" : attributionGap <= 0.3 ? "warning" : "critical", detail: `${Math.round(attributionGap * 100)}% de diferencia` },
    { key: "ownership", label: "Responsables comerciales", status: unassignedLeads === 0 ? "healthy" : "critical", detail: unassignedLeads ? `${unassignedLeads} leads sin responsable` : "Todos los leads tienen responsable" },
  ];
  const healthScore = Math.round(checks.reduce((sum, check) => sum + (check.status === "healthy" ? 100 : check.status === "warning" ? 60 : 20), 0) / checks.length);

  const experiments = (experimentResult.data ?? []).map((row) => ({ id: row.id, title: row.title, hypothesis: row.hypothesis, status: row.status, category: row.category, primaryMetric: row.primary_metric, targetValue: row.target_value == null ? null : num(row.target_value), budgetUsd: num(row.budget_usd), startDate: row.start_date, endDate: row.end_date, campaignId: row.campaign_id, ownerId: row.owner_id, variables: row.variables ?? {}, result: row.result ?? {}, verdict: row.verdict, learning: row.learning }));
  const report = reportResult.data;

  return {
    period, generatedAt: now.toISOString(), goal,
    actuals: { spend, leads: crmLeads.length, qualifiedLeads: qualified.length, wonLeads: won.length, revenue, cpl: divide(spend, crmLeads.length), cpql: divide(spend, qualified.length), cac: divide(spend, won.length), cashRoas: divide(revenue, spend), leadToQualifiedRate: divide(qualified.length, crmLeads.length), leadToWonRate: divide(won.length, crmLeads.length) },
    pacing: { dayOfMonth, daysInMonth, elapsedPct: dayOfMonth / daysInMonth, expectedSpend, projectedSpend, projectedLeads, budgetVariance, status: pacingStatus, trend },
    priorities, experiments,
    dataHealth: { score: healthScore, checks },
    funnelHealth: { unassignedLeads, staleLeads, unattributedLeads: crmLeads.filter((lead) => !lead.meta_campaign_id && !lead.campana_origen).length, averageLeadAgeHours: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : null },
    contentOperations: { luli: { id: luli?.id ?? null, name: luli?.nombre ?? "Luli", openTasks: luliTasks.length, overdueTasks: luliTasks.filter((task) => task.fecha_limite && new Date(String(task.fecha_limite)) < now).length, capacityMinutes: num(teamSetting?.daily_capacity_minutes) || 360, automationEnabled: teamSetting?.automation_enabled == null ? true : Boolean(teamSetting.automation_enabled) }, pipeline: [...pipelineMap.entries()].map(([status, count]) => ({ status, count })), scheduledNext7Days: scheduledContent, missingSchedule },
    creativeSignals,
    latestWeeklyReport: report ? { weekStart: report.week_start, summary: report.summary, wins: report.wins ?? [], risks: report.risks ?? [], learnings: report.learnings ?? [], nextActions: report.next_actions ?? [] } : null,
  };
}

export async function persistDailyMarketingPriorities(period: MarketingHubPeriod = "30d") {
  const db = createUntypedAdminClient();
  const overview = await getMarketingCommandCenter(period);
  const rows = overview.priorities.filter((priority) => !priority.id).map((priority) => ({
    priority_date: priority.date, title: priority.title, reason: priority.reason, recommended_action: priority.action,
    impact: priority.impact, confidence: priority.confidence, effort: priority.effort, source: priority.source,
    entity_type: priority.entityType, entity_id: priority.entityId, assigned_to: priority.assignedTo,
  }));
  if (rows.length) await db.from("marketing_daily_priorities").upsert(rows, { onConflict: "priority_date,title,entity_type,entity_id", ignoreDuplicates: true });
  if (overview.creativeSignals.length) {
    await db.from("marketing_creative_taxonomy").upsert(overview.creativeSignals.map((creative) => ({
      ad_id: creative.adId,
      angle: creative.angle,
      format: creative.format,
      fatigue_status: creative.fatigue,
      classified_by: "rules_v1",
      classified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })), { onConflict: "ad_id" });
  }
  return getMarketingCommandCenter(period);
}
