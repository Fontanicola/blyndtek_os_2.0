import { getMetaConfig } from "@/lib/meta/config";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { MetaCampaignRow, MetaCreativeRow, MetaFunnelStage, MetaOverview, MetaPeriod } from "@/types/meta";

const qualifiedStages = new Set(["calificado", "diagnostico_ofrecido", "diagnostico_pagado", "cotizacion", "ganado"]);

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

export async function getMetaOverview(period: MetaPeriod): Promise<MetaOverview> {
  const db = createUntypedAdminClient();
  const start = periodStart(period);
  const startDate = start.toISOString().slice(0, 10);
  const config = getMetaConfig();

  const [connectionResult, insightsResult, campaignsResult, adsResult, creativesResult, leadsResult, runsResult, recommendationsResult] = await Promise.all([
    db.from("meta_connections").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("meta_insights_daily").select("*").gte("date_start", startDate).order("date_start"),
    db.from("meta_campaigns").select("*").order("name"),
    db.from("meta_ads").select("*").order("name"),
    db.from("meta_creatives").select("*").order("name"),
    db.from("leads").select("id, etapa, meta_campaign_id, meta_ad_id, campana_origen, created_at").eq("canal_origen", "meta_ads").gte("created_at", start.toISOString()),
    db.from("meta_sync_runs").select("*").order("started_at", { ascending: false }).limit(8),
    db.from("meta_recommendations").select("*").eq("status", "open").order("detected_at", { ascending: false }).limit(12)
  ]);

  const metaTablesUnavailable = [connectionResult, insightsResult, campaignsResult, adsResult, creativesResult, runsResult, recommendationsResult]
    .some((result) => result.error?.code === "42P01" || result.error?.code === "PGRST205");
  if (leadsResult.error && !metaTablesUnavailable) throw new Error(leadsResult.error.message);

  const insights = metaTablesUnavailable ? [] : (insightsResult.data ?? []);
  const campaignsData = metaTablesUnavailable ? [] : (campaignsResult.data ?? []);
  const adsData = metaTablesUnavailable ? [] : (adsResult.data ?? []);
  const creativesData = metaTablesUnavailable ? [] : (creativesResult.data ?? []);
  const leads = leadsResult.data ?? [];

  const leadIds = leads.map((lead) => lead.id);
  const { data: clients } = leadIds.length > 0
    ? await db.from("clientes").select("id, lead_id").in("lead_id", leadIds)
    : { data: [] };
  const clientsByLead = new Map((clients ?? []).map((client) => [client.lead_id as string, client.id as string]));
  const clientIds = [...clientsByLead.values()];
  const { data: charges } = leadIds.length || clientIds.length
    ? await db.from("cobros").select("lead_id, cliente_id, monto, estado, fecha_cobro")
      .eq("estado", "cobrado").gte("fecha_cobro", startDate)
      .or([leadIds.length ? `lead_id.in.(${leadIds.join(",")})` : null, clientIds.length ? `cliente_id.in.(${clientIds.join(",")})` : null].filter(Boolean).join(","))
    : { data: [] };

  const leadByClient = new Map([...clientsByLead.entries()].map(([leadId, clientId]) => [clientId, leadId]));
  const revenueByLead = new Map<string, number>();
  for (const charge of charges ?? []) {
    const leadId = (charge.lead_id as string | null) || leadByClient.get(charge.cliente_id as string) || null;
    if (leadId) revenueByLead.set(leadId, (revenueByLead.get(leadId) ?? 0) + n(charge.monto));
  }

  const totals = insights.reduce((acc, row) => {
    acc.spend += n(row.spend); acc.impressions += n(row.impressions); acc.reach += n(row.reach);
    acc.linkClicks += n(row.link_clicks); acc.landingPageViews += n(row.landing_page_views); acc.platformLeads += n(row.leads);
    return acc;
  }, { spend: 0, impressions: 0, reach: 0, linkClicks: 0, landingPageViews: 0, platformLeads: 0 });
  const qualifiedLeads = leads.filter((lead) => qualifiedStages.has(String(lead.etapa))).length;
  const wonLeads = leads.filter((lead) => lead.etapa === "ganado").length;
  const collectedRevenue = [...revenueByLead.values()].reduce((sum, value) => sum + value, 0);

  const insightsByCampaign = new Map<string, typeof totals>();
  const insightsByAd = new Map<string, typeof totals>();
  for (const row of insights) {
    for (const [id, map] of [[row.campaign_id, insightsByCampaign], [row.ad_id, insightsByAd]] as const) {
      if (!id) continue;
      const current = map.get(String(id)) ?? { spend: 0, impressions: 0, reach: 0, linkClicks: 0, landingPageViews: 0, platformLeads: 0 };
      current.spend += n(row.spend); current.impressions += n(row.impressions); current.reach += n(row.reach);
      current.linkClicks += n(row.link_clicks); current.landingPageViews += n(row.landing_page_views); current.platformLeads += n(row.leads);
      map.set(String(id), current);
    }
  }

  const campaigns: MetaCampaignRow[] = campaignsData.map((campaign) => {
    const metrics = insightsByCampaign.get(campaign.id) ?? { spend: 0, impressions: 0, reach: 0, linkClicks: 0, landingPageViews: 0, platformLeads: 0 };
    const campaignLeads = leads.filter((lead) => lead.meta_campaign_id === campaign.id || (!lead.meta_campaign_id && lead.campana_origen === campaign.name));
    const qualified = campaignLeads.filter((lead) => qualifiedStages.has(String(lead.etapa))).length;
    const won = campaignLeads.filter((lead) => lead.etapa === "ganado").length;
    const revenue = campaignLeads.reduce((sum, lead) => sum + (revenueByLead.get(lead.id) ?? 0), 0);
    return { id: campaign.id, name: campaign.name, status: campaign.effective_status || campaign.status || "UNKNOWN", objective: campaign.objective,
      spend: metrics.spend, impressions: metrics.impressions, linkClicks: metrics.linkClicks, platformLeads: metrics.platformLeads,
      crmLeads: campaignLeads.length, qualifiedLeads: qualified, wonLeads: won, collectedRevenue: revenue,
      ctr: metrics.impressions ? metrics.linkClicks / metrics.impressions * 100 : 0, cpl: divide(metrics.spend, metrics.platformLeads),
      cpql: divide(metrics.spend, qualified), cashRoas: divide(revenue, metrics.spend) };
  }).sort((a, b) => b.spend - a.spend);

  const creativeById = new Map(creativesData.map((creative) => [creative.id as string, creative]));
  const creatives: MetaCreativeRow[] = adsData.map((ad) => {
    const creative = creativeById.get(ad.creative_id as string); const metrics = insightsByAd.get(ad.id) ?? { spend: 0, impressions: 0, reach: 0, linkClicks: 0, landingPageViews: 0, platformLeads: 0 };
    return { id: (creative?.id as string) || ad.id, adId: ad.id, adName: ad.name, creativeName: (creative?.name as string) || ad.name,
      status: ad.effective_status || ad.status || "UNKNOWN", thumbnailUrl: (creative?.thumbnail_url as string | null) || null,
      title: (creative?.title as string | null) || null, body: (creative?.body as string | null) || null, format: (creative?.format as string | null) || null,
      spend: metrics.spend, impressions: metrics.impressions, linkClicks: metrics.linkClicks, platformLeads: metrics.platformLeads,
      ctr: metrics.impressions ? metrics.linkClicks / metrics.impressions * 100 : 0, cpl: divide(metrics.spend, metrics.platformLeads) };
  }).sort((a, b) => b.spend - a.spend);

  const trendMap = new Map<string, { date: string; spend: number; platformLeads: number; crmLeads: number }>();
  for (const row of insights) { const current = trendMap.get(row.date_start) ?? { date: row.date_start, spend: 0, platformLeads: 0, crmLeads: 0 }; current.spend += n(row.spend); current.platformLeads += n(row.leads); trendMap.set(row.date_start, current); }
  for (const lead of leads) { const date = String(lead.created_at).slice(0, 10); const current = trendMap.get(date) ?? { date, spend: 0, platformLeads: 0, crmLeads: 0 }; current.crmLeads += 1; trendMap.set(date, current); }

  const funnelSeed = [
    { key: "leads", label: "Leads CRM", count: leads.length },
    { key: "qualified", label: "Calificados", count: qualifiedLeads },
    { key: "diagnosis", label: "Diagnóstico", count: leads.filter((lead) => ["diagnostico_pagado", "cotizacion", "ganado"].includes(String(lead.etapa))).length },
    { key: "proposal", label: "Cotización", count: leads.filter((lead) => ["cotizacion", "ganado"].includes(String(lead.etapa))).length },
    { key: "won", label: "Ganados", count: wonLeads }
  ];
  const funnel: MetaFunnelStage[] = funnelSeed.map((stage, index) => ({ ...stage, conversionFromPrevious: index ? divide(stage.count, funnelSeed[index - 1]!.count) : null, conversionFromLead: index ? divide(stage.count, funnelSeed[0]!.count) : 1 }));

  const connection = metaTablesUnavailable ? null : connectionResult.data;
  const storedRecommendations = metaTablesUnavailable ? [] : (recommendationsResult.data ?? []).map((row) => ({ id: row.id, severity: row.severity, title: row.title, rationale: row.rationale, recommendedAction: row.recommended_action, detectedAt: row.detected_at }));
  const detectedAt = new Date().toISOString();
  const automaticRecommendations = [] as MetaOverview["recommendations"];
  if (!config.configured) automaticRecommendations.push({ id: "configuration", severity: "critical", title: "Completar la conexión con Meta", rationale: "Sin credenciales server-side no es posible leer inversión ni entrega publicitaria.", recommendedAction: "Cargar las variables pendientes en Vercel y ejecutar una sincronización manual.", detectedAt });
  if (totals.platformLeads > 0 && Math.abs(totals.platformLeads - leads.length) / totals.platformLeads > 0.25) automaticRecommendations.push({ id: "attribution-gap", severity: "warning", title: "Revisar la pérdida de atribución", rationale: `Meta registra ${totals.platformLeads} leads y el CRM ${leads.length} en el período.`, recommendedAction: "Validar UTMs, campos ocultos, webhook y deduplicación del formulario.", detectedAt });
  if (totals.spend >= 100 && qualifiedLeads === 0) automaticRecommendations.push({ id: "no-qualified", severity: "critical", title: "La inversión todavía no genera leads calificados", rationale: `Se invirtieron ${totals.spend.toFixed(0)} USD sin oportunidades calificadas en el CRM.`, recommendedAction: "Revisar oferta, formulario y calidad del tráfico antes de aumentar presupuesto.", detectedAt });
  const calculatedFrequency = totals.reach ? totals.impressions / totals.reach : 0;
  const calculatedCtr = totals.impressions ? totals.linkClicks / totals.impressions * 100 : 0;
  if (calculatedFrequency >= 3.5 && calculatedCtr < 0.8) automaticRecommendations.push({ id: "fatigue", severity: "warning", title: "Posible fatiga creativa", rationale: `Frecuencia ${calculatedFrequency.toFixed(1)} con CTR de enlace ${calculatedCtr.toFixed(2)}%.`, recommendedAction: "Preparar nuevos hooks y formatos antes de ampliar la audiencia o el presupuesto.", detectedAt });

  return {
    connection: { status: metaTablesUnavailable ? "not_configured" : (connection?.status || (config.configured ? "degraded" : "not_configured")), accountName: connection?.account_name || null,
      adAccountId: connection?.ad_account_id || (config.configured ? config.adAccountId : null), lastSyncAt: connection?.last_sync_at || null, lastError: connection?.last_error || null,
      missingEnvironmentVariables: config.missingEnvironmentVariables, writeAccessEnabled: false },
    period, periodStart: start.toISOString(),
    kpis: { ...totals, frequency: totals.reach ? totals.impressions / totals.reach : 0, crmLeads: leads.length, qualifiedLeads, wonLeads, collectedRevenue,
      ctr: totals.impressions ? totals.linkClicks / totals.impressions * 100 : 0, cpc: divide(totals.spend, totals.linkClicks) ?? 0, cpm: totals.impressions ? totals.spend / totals.impressions * 1000 : 0,
      costPerLead: divide(totals.spend, totals.platformLeads), costPerQualifiedLead: divide(totals.spend, qualifiedLeads), cashRoas: divide(collectedRevenue, totals.spend) },
    trend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)), campaigns, creatives, funnel,
    recommendations: [...automaticRecommendations, ...storedRecommendations],
    runs: metaTablesUnavailable ? [] : (runsResult.data ?? []).map((row) => ({ id: row.id, status: row.status, triggerType: row.trigger_type, startedAt: row.started_at, finishedAt: row.finished_at,
      records: n(row.records_campaigns) + n(row.records_adsets) + n(row.records_ads) + n(row.records_insights), errorMessage: row.error_message }))
  };
}

export function parseMetaPeriod(value: string | null): MetaPeriod {
  return value === "7d" || value === "90d" || value === "year" ? value : "30d";
}
