import { getMetaConfig } from "@/lib/meta/config";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type {
  MetaCampaignRow,
  MetaCreativeRow,
  MetaFunnelStage,
  MetaGuardrails,
  MetaOverview,
  MetaPeriod,
} from "@/types/meta";

const qualifiedStages = new Set([
  "calificado",
  "diagnostico_ofrecido",
  "diagnostico_pagado",
  "cotizacion",
  "ganado",
]);

function periodStart(period: MetaPeriod) {
  const date = new Date();
  if (period === "7d") date.setUTCDate(date.getUTCDate() - 6);
  if (period === "30d") date.setUTCDate(date.getUTCDate() - 29);
  if (period === "90d") date.setUTCDate(date.getUTCDate() - 89);
  if (period === "year") date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function divide(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

const defaultGuardrails: MetaGuardrails = {
  targetCpl: 60,
  targetCpql: 180,
  targetCashRoas: 3,
  minLinkCtr: 0.8,
  maxFrequency: 3.5,
  maxAttributionGapPct: 25,
  minSpendForAlert: 100,
  staleSyncHours: 36,
};

function emptyDeliveryMetrics() {
  return {
    spend: 0,
    impressions: 0,
    reach: 0,
    linkClicks: 0,
    landingPageViews: 0,
    platformLeads: 0,
    videoPlays3s: 0,
    videoPlays15s: 0,
  };
}

export async function getMetaOverview(
  period: MetaPeriod,
): Promise<MetaOverview> {
  const db = createUntypedAdminClient();
  const start = periodStart(period);
  const startDate = start.toISOString().slice(0, 10);
  const config = getMetaConfig();

  const [
    connectionResult,
    insightsResult,
    campaignsResult,
    adSetsResult,
    adsResult,
    creativesResult,
    leadsResult,
    runsResult,
    recommendationsResult,
    guardrailsResult,
    actionsResult,
    executionPolicyResult,
  ] = await Promise.all([
    db
      .from("meta_connections")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("meta_insights_daily")
      .select("*")
      .gte("date_start", startDate)
      .order("date_start"),
    db.from("meta_campaigns").select("*").order("name"),
    db.from("meta_ad_sets").select("*").order("name"),
    db.from("meta_ads").select("*").order("name"),
    db.from("meta_creatives").select("*").order("name"),
    db
      .from("leads")
      .select(
        "id, etapa, meta_campaign_id, meta_ad_id, campana_origen, created_at, contacto_1_nombre, empresa",
      )
      .eq("canal_origen", "meta_ads")
      .gte("created_at", start.toISOString()),
    db
      .from("meta_sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(8),
    db
      .from("meta_recommendations")
      .select("*")
      .in("status", ["open", "acknowledged"])
      .order("last_detected_at", { ascending: false })
      .limit(20),
    db
      .from("meta_guardrails")
      .select("*")
      .eq(
        "ad_account_id",
        config.configured ? config.adAccountId : "not-configured",
      )
      .maybeSingle(),
    db
      .from("meta_action_queue")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(50),
    db
      .from("meta_execution_policy")
      .select("*")
      .eq(
        "ad_account_id",
        config.configured ? config.adAccountId : "not-configured",
      )
      .maybeSingle(),
  ]);

  const metaTablesUnavailable = [
    connectionResult,
    insightsResult,
    campaignsResult,
    adSetsResult,
    adsResult,
    creativesResult,
    runsResult,
    recommendationsResult,
  ].some(
    (result) =>
      result.error?.code === "42P01" || result.error?.code === "PGRST205",
  );
  if (leadsResult.error && !metaTablesUnavailable)
    throw new Error(leadsResult.error.message);

  const insights = metaTablesUnavailable ? [] : (insightsResult.data ?? []);
  const campaignsData = metaTablesUnavailable
    ? []
    : (campaignsResult.data ?? []);
  const adSetsData = metaTablesUnavailable ? [] : (adSetsResult.data ?? []);
  const adsData = metaTablesUnavailable ? [] : (adsResult.data ?? []);
  const creativesData = metaTablesUnavailable
    ? []
    : (creativesResult.data ?? []);
  const leads = leadsResult.data ?? [];

  const leadIds = leads.map((lead) => lead.id);
  const { data: clients } =
    leadIds.length > 0
      ? await db.from("clientes").select("id, lead_id").in("lead_id", leadIds)
      : { data: [] };
  const clientsByLead = new Map(
    (clients ?? []).map((client) => [
      client.lead_id as string,
      client.id as string,
    ]),
  );
  const clientIds = [...clientsByLead.values()];
  const { data: charges } =
    leadIds.length || clientIds.length
      ? await db
          .from("cobros")
          .select("lead_id, cliente_id, monto, estado, fecha_cobro")
          .eq("estado", "cobrado")
          .gte("fecha_cobro", startDate)
          .or(
            [
              leadIds.length ? `lead_id.in.(${leadIds.join(",")})` : null,
              clientIds.length
                ? `cliente_id.in.(${clientIds.join(",")})`
                : null,
            ]
              .filter(Boolean)
              .join(","),
          )
      : { data: [] };

  const leadByClient = new Map(
    [...clientsByLead.entries()].map(([leadId, clientId]) => [
      clientId,
      leadId,
    ]),
  );
  const revenueByLead = new Map<string, number>();
  for (const charge of charges ?? []) {
    const leadId =
      (charge.lead_id as string | null) ||
      leadByClient.get(charge.cliente_id as string) ||
      null;
    if (leadId)
      revenueByLead.set(
        leadId,
        (revenueByLead.get(leadId) ?? 0) + n(charge.monto),
      );
  }

  const totals = insights.reduce((acc, row) => {
    acc.spend += n(row.spend);
    acc.impressions += n(row.impressions);
    acc.reach += n(row.reach);
    acc.linkClicks += n(row.link_clicks);
    acc.landingPageViews += n(row.landing_page_views);
    acc.platformLeads += n(row.leads);
    acc.videoPlays3s += n(row.video_plays_3s);
    acc.videoPlays15s += n(row.video_plays_15s);
    return acc;
  }, emptyDeliveryMetrics());
  const qualifiedLeads = leads.filter((lead) =>
    qualifiedStages.has(String(lead.etapa)),
  ).length;
  const wonLeads = leads.filter((lead) => lead.etapa === "ganado").length;
  const collectedRevenue = [...revenueByLead.values()].reduce(
    (sum, value) => sum + value,
    0,
  );

  const insightsByCampaign = new Map<string, typeof totals>();
  const insightsByAd = new Map<string, typeof totals>();
  for (const row of insights) {
    for (const [id, map] of [
      [row.campaign_id, insightsByCampaign],
      [row.ad_id, insightsByAd],
    ] as const) {
      if (!id) continue;
      const current = map.get(String(id)) ?? emptyDeliveryMetrics();
      current.spend += n(row.spend);
      current.impressions += n(row.impressions);
      current.reach += n(row.reach);
      current.linkClicks += n(row.link_clicks);
      current.landingPageViews += n(row.landing_page_views);
      current.platformLeads += n(row.leads);
      current.videoPlays3s += n(row.video_plays_3s);
      current.videoPlays15s += n(row.video_plays_15s);
      map.set(String(id), current);
    }
  }

  const campaigns: MetaCampaignRow[] = campaignsData
    .map((campaign) => {
      const metrics =
        insightsByCampaign.get(campaign.id) ?? emptyDeliveryMetrics();
      const campaignLeads = leads.filter(
        (lead) =>
          lead.meta_campaign_id === campaign.id ||
          (!lead.meta_campaign_id && lead.campana_origen === campaign.name),
      );
      const qualified = campaignLeads.filter((lead) =>
        qualifiedStages.has(String(lead.etapa)),
      ).length;
      const won = campaignLeads.filter(
        (lead) => lead.etapa === "ganado",
      ).length;
      const revenue = campaignLeads.reduce(
        (sum, lead) => sum + (revenueByLead.get(lead.id) ?? 0),
        0,
      );
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.effective_status || campaign.status || "UNKNOWN",
        objective: campaign.objective,
        spend: metrics.spend,
        impressions: metrics.impressions,
        linkClicks: metrics.linkClicks,
        platformLeads: metrics.platformLeads,
        crmLeads: campaignLeads.length,
        qualifiedLeads: qualified,
        wonLeads: won,
        collectedRevenue: revenue,
        ctr: metrics.impressions
          ? (metrics.linkClicks / metrics.impressions) * 100
          : 0,
        cpl: divide(metrics.spend, metrics.platformLeads),
        cpql: divide(metrics.spend, qualified),
        cashRoas: divide(revenue, metrics.spend),
      };
    })
    .sort((a, b) => b.spend - a.spend);

  const adSets = adSetsData.map((adSet) => ({
    id: String(adSet.id),
    campaignId: String(adSet.campaign_id),
    name: String(adSet.name),
    status: String(adSet.effective_status || adSet.status || "UNKNOWN"),
    optimizationGoal: adSet.optimization_goal
      ? String(adSet.optimization_goal)
      : null,
    dailyBudget:
      adSet.daily_budget == null ? null : n(adSet.daily_budget) / 100,
  }));

  const creativeById = new Map(
    creativesData.map((creative) => [creative.id as string, creative]),
  );
  const creatives: MetaCreativeRow[] = adsData
    .map((ad) => {
      const creative = creativeById.get(ad.creative_id as string);
      const metrics = insightsByAd.get(ad.id) ?? emptyDeliveryMetrics();
      return {
        id: (creative?.id as string) || ad.id,
        adId: ad.id,
        adName: ad.name,
        creativeName: (creative?.name as string) || ad.name,
        status: ad.effective_status || ad.status || "UNKNOWN",
        thumbnailUrl: (creative?.thumbnail_url as string | null) || null,
        title: (creative?.title as string | null) || null,
        body: (creative?.body as string | null) || null,
        format: (creative?.format as string | null) || null,
        spend: metrics.spend,
        impressions: metrics.impressions,
        linkClicks: metrics.linkClicks,
        platformLeads: metrics.platformLeads,
        ctr: metrics.impressions
          ? (metrics.linkClicks / metrics.impressions) * 100
          : 0,
        cpl: divide(metrics.spend, metrics.platformLeads),
        videoPlays3s: metrics.videoPlays3s,
        videoPlays15s: metrics.videoPlays15s,
        hookRate: divide(metrics.videoPlays3s, metrics.impressions),
        holdRate: divide(metrics.videoPlays15s, metrics.videoPlays3s),
      };
    })
    .sort((a, b) => b.spend - a.spend);

  const trendMap = new Map<
    string,
    { date: string; spend: number; platformLeads: number; crmLeads: number }
  >();
  for (const row of insights) {
    const current = trendMap.get(row.date_start) ?? {
      date: row.date_start,
      spend: 0,
      platformLeads: 0,
      crmLeads: 0,
    };
    current.spend += n(row.spend);
    current.platformLeads += n(row.leads);
    trendMap.set(row.date_start, current);
  }
  for (const lead of leads) {
    const date = String(lead.created_at).slice(0, 10);
    const current = trendMap.get(date) ?? {
      date,
      spend: 0,
      platformLeads: 0,
      crmLeads: 0,
    };
    current.crmLeads += 1;
    trendMap.set(date, current);
  }

  const funnelSeed = [
    { key: "leads", label: "Leads CRM", count: leads.length },
    { key: "qualified", label: "Calificados", count: qualifiedLeads },
    {
      key: "diagnosis",
      label: "Diagnóstico",
      count: leads.filter((lead) =>
        ["diagnostico_pagado", "cotizacion", "ganado"].includes(
          String(lead.etapa),
        ),
      ).length,
    },
    {
      key: "proposal",
      label: "Cotización",
      count: leads.filter((lead) =>
        ["cotizacion", "ganado"].includes(String(lead.etapa)),
      ).length,
    },
    { key: "won", label: "Ganados", count: wonLeads },
  ];
  const funnel: MetaFunnelStage[] = funnelSeed.map((stage, index) => ({
    ...stage,
    conversionFromPrevious: index
      ? divide(stage.count, funnelSeed[index - 1]!.count)
      : null,
    conversionFromLead: index ? divide(stage.count, funnelSeed[0]!.count) : 1,
  }));

  const connection = metaTablesUnavailable ? null : connectionResult.data;
  const storedRecommendations = metaTablesUnavailable
    ? []
    : (recommendationsResult.data ?? []).map((row) => ({
        id: row.id,
        severity: row.severity,
        status: row.status,
        ruleKey: row.rule_key,
        entityType: row.entity_type,
        entityId: row.entity_id,
        title: row.title,
        rationale: row.rationale,
        recommendedAction: row.recommended_action,
        detectedAt: row.detected_at,
        lastDetectedAt: row.last_detected_at || row.detected_at,
        occurrences: n(row.occurrences) || 1,
      }));
  const detectedAt = new Date().toISOString();
  const automaticRecommendations = [] as MetaOverview["recommendations"];
  if (!config.configured)
    automaticRecommendations.push({
      id: "configuration",
      severity: "critical",
      status: "open",
      ruleKey: "configuration",
      entityType: "account",
      entityId: null,
      title: "Completar la conexión con Meta",
      rationale:
        "Sin credenciales server-side no es posible leer inversión ni entrega publicitaria.",
      recommendedAction:
        "Cargar las variables pendientes en Vercel y ejecutar una sincronización manual.",
      detectedAt,
      lastDetectedAt: detectedAt,
      occurrences: 1,
    });

  const guardrailRow = guardrailsResult.error ? null : guardrailsResult.data;
  const guardrails: MetaGuardrails = guardrailRow
    ? {
        targetCpl: n(guardrailRow.target_cpl),
        targetCpql: n(guardrailRow.target_cpql),
        targetCashRoas: n(guardrailRow.target_cash_roas),
        minLinkCtr: n(guardrailRow.min_link_ctr),
        maxFrequency: n(guardrailRow.max_frequency),
        maxAttributionGapPct: n(guardrailRow.max_attribution_gap_pct),
        minSpendForAlert: n(guardrailRow.min_spend_for_alert),
        staleSyncHours: n(guardrailRow.stale_sync_hours),
      }
    : defaultGuardrails;
  const healthPenalty = storedRecommendations.reduce(
    (total, item) =>
      total +
      (item.status === "acknowledged"
        ? 0
        : item.severity === "critical"
          ? 20
          : item.severity === "warning"
            ? 8
            : 2),
    0,
  );
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      (connection?.status === "connected" ? 100 : 60) - healthPenalty,
    ),
  );
  const actions = actionsResult.error
    ? []
    : (actionsResult.data ?? []).map((row) => ({
        id: row.id,
        recommendationId: row.recommendation_id,
        actionType: row.action_type,
        entityType: row.entity_type,
        entityId: row.entity_id,
        title: row.title,
        rationale: row.rationale,
        proposedAction: row.proposed_action,
        proposedPayload: row.proposed_payload || {},
        riskLevel: row.risk_level,
        status: row.status,
        requestedAt: row.requested_at,
        reviewedAt: row.reviewed_at,
        notes: row.notes,
        errorMessage: row.error_message,
        simulatedAt: row.simulated_at,
        simulationResult: row.simulation_result,
        executedAt: row.executed_at,
        metaRequestId: row.meta_request_id,
      }));
  const policyRow = executionPolicyResult.error
    ? null
    : executionPolicyResult.data;
  const executionPolicy = {
    executionEnabled: Boolean(policyRow?.execution_enabled),
    dryRunOnly: policyRow?.dry_run_only !== false,
    allowPause: policyRow?.allow_pause !== false,
    allowResume: Boolean(policyRow?.allow_resume),
    allowBudgetChanges: Boolean(policyRow?.allow_budget_changes),
    maxBudgetIncreasePct: n(policyRow?.max_budget_increase_pct) || 20,
    maxDailyBudgetUsd: n(policyRow?.max_daily_budget_usd) || 100,
    cooldownMinutes: n(policyRow?.cooldown_minutes) || 30,
    environmentWriteEnabled: config.configured ? config.writeEnabled : false,
  };

  return {
    connection: {
      status: metaTablesUnavailable
        ? "not_configured"
        : connection?.status ||
          (config.configured ? "degraded" : "not_configured"),
      accountName: connection?.account_name || null,
      adAccountId:
        connection?.ad_account_id ||
        (config.configured ? config.adAccountId : null),
      lastSyncAt: connection?.last_sync_at || null,
      lastError: connection?.last_error || null,
      tokenExpiresAt: config.configured ? config.tokenExpiresAt : null,
      missingEnvironmentVariables: config.missingEnvironmentVariables,
      writeAccessEnabled:
        executionPolicy.executionEnabled &&
        !executionPolicy.dryRunOnly &&
        executionPolicy.environmentWriteEnabled,
    },
    period,
    periodStart: start.toISOString(),
    healthScore,
    guardrails,
    executionPolicy,
    kpis: {
      ...totals,
      frequency: totals.reach ? totals.impressions / totals.reach : 0,
      crmLeads: leads.length,
      qualifiedLeads,
      wonLeads,
      collectedRevenue,
      ctr: totals.impressions
        ? (totals.linkClicks / totals.impressions) * 100
        : 0,
      cpc: divide(totals.spend, totals.linkClicks) ?? 0,
      cpm: totals.impressions ? (totals.spend / totals.impressions) * 1000 : 0,
      costPerLead: divide(totals.spend, totals.platformLeads),
      costPerQualifiedLead: divide(totals.spend, qualifiedLeads),
      cashRoas: divide(collectedRevenue, totals.spend),
      videoPlays3s: totals.videoPlays3s,
      videoPlays15s: totals.videoPlays15s,
    },
    trend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
    campaigns,
    adSets,
    creatives,
    funnel,
    funnelLeads: leads.map((lead) => ({
      id: lead.id,
      name: lead.contacto_1_nombre || "Sin nombre",
      company: lead.empresa || "Sin empresa",
      stage: lead.etapa,
      campaign: lead.campana_origen,
      createdAt: lead.created_at,
    })),
    recommendations: [...automaticRecommendations, ...storedRecommendations],
    actions,
    runs: metaTablesUnavailable
      ? []
      : (runsResult.data ?? []).map((row) => ({
          id: row.id,
          status: row.status,
          triggerType: row.trigger_type,
          startedAt: row.started_at,
          finishedAt: row.finished_at,
          records:
            n(row.records_campaigns) +
            n(row.records_adsets) +
            n(row.records_ads) +
            n(row.records_insights),
          errorMessage: row.error_message,
        })),
  };
}

export function parseMetaPeriod(value: string | null): MetaPeriod {
  return value === "7d" || value === "90d" || value === "year" ? value : "30d";
}
