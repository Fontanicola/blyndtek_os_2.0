import { getMetaConfig } from "@/lib/meta/config";
import { getMetaOverview } from "@/lib/meta/overview";
import { logServerError, logServerEvent } from "@/lib/observability/logger";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { MetaGuardrails } from "@/types/meta";

type Finding = {
  ruleKey: string;
  severity: "info" | "warning" | "critical";
  entityType: "account" | "campaign" | "ad";
  entityId: string;
  title: string;
  rationale: string;
  recommendedAction: string;
  evidence: Record<string, number | string | null>;
};

const defaults: MetaGuardrails = {
  targetCpl: 60,
  targetCpql: 180,
  targetCashRoas: 3,
  minLinkCtr: 0.8,
  maxFrequency: 3.5,
  maxAttributionGapPct: 25,
  minSpendForAlert: 100,
  staleSyncHours: 36
};

const managedRules = [
  "connection_stale", "attribution_gap", "no_qualified", "cpl_over_target",
  "cpql_over_target", "cash_roas_under_target", "campaign_cpl_over_target",
  "creative_low_hook", "creative_low_hold", "creative_fatigue"
];

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hoursSince(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - new Date(value).getTime()) / 3_600_000);
}

export async function getMetaGuardrails(): Promise<MetaGuardrails> {
  const db = createUntypedAdminClient();
  const config = getMetaConfig();
  if (!config.configured) return defaults;
  const { data, error } = await db.from("meta_guardrails").select("*").eq("ad_account_id", config.adAccountId).maybeSingle();
  if (error && error.code !== "42P01" && error.code !== "PGRST205") throw error;
  if (!data) return defaults;
  return {
    targetCpl: n(data.target_cpl) || defaults.targetCpl,
    targetCpql: n(data.target_cpql) || defaults.targetCpql,
    targetCashRoas: n(data.target_cash_roas) || defaults.targetCashRoas,
    minLinkCtr: n(data.min_link_ctr) || defaults.minLinkCtr,
    maxFrequency: n(data.max_frequency) || defaults.maxFrequency,
    maxAttributionGapPct: n(data.max_attribution_gap_pct),
    minSpendForAlert: n(data.min_spend_for_alert),
    staleSyncHours: n(data.stale_sync_hours) || defaults.staleSyncHours
  };
}

export async function saveMetaGuardrails(input: MetaGuardrails, userId: string) {
  const config = getMetaConfig();
  if (!config.configured) throw new Error("La conexión con Meta todavía no está configurada.");
  const db = createUntypedAdminClient();
  const payload = {
    ad_account_id: config.adAccountId,
    target_cpl: input.targetCpl,
    target_cpql: input.targetCpql,
    target_cash_roas: input.targetCashRoas,
    min_link_ctr: input.minLinkCtr,
    max_frequency: input.maxFrequency,
    max_attribution_gap_pct: input.maxAttributionGapPct,
    min_spend_for_alert: input.minSpendForAlert,
    stale_sync_hours: input.staleSyncHours,
    updated_by: userId,
    updated_at: new Date().toISOString()
  };
  const { error } = await db.from("meta_guardrails").upsert(payload, { onConflict: "ad_account_id" });
  if (error) throw error;
  return getMetaGuardrails();
}

export async function generateMetaRecommendations() {
  const config = getMetaConfig();
  if (!config.configured) return { detected: 0, open: 0 };

  const db = createUntypedAdminClient();
  const [guardrails, overview, connectionResult, insightsResult] = await Promise.all([
    getMetaGuardrails(),
    getMetaOverview("30d"),
    db.from("meta_connections").select("last_sync_at").eq("ad_account_id", config.adAccountId).maybeSingle(),
    db.from("meta_insights_daily").select("campaign_id,ad_id,spend,impressions,reach,link_clicks,leads,video_plays_3s,video_plays_15s")
      .eq("ad_account_id", config.adAccountId).gte("date_start", overviewDateStart())
  ]);

  if (connectionResult.error) throw connectionResult.error;
  if (insightsResult.error) throw insightsResult.error;

  const findings: Finding[] = [];
  const accountId = config.adAccountId;
  const kpis = overview.kpis;
  const add = (finding: Finding) => findings.push(finding);
  const syncedHoursAgo = hoursSince(connectionResult.data?.last_sync_at ?? null);

  if (syncedHoursAgo > guardrails.staleSyncHours) add({
    ruleKey: "connection_stale", severity: "critical", entityType: "account", entityId: accountId,
    title: "La sincronización de Meta está atrasada",
    rationale: `La última lectura ocurrió hace ${Math.floor(syncedHoursAgo)} horas; el límite interno es ${guardrails.staleSyncHours} horas.`,
    recommendedAction: "Revisar el cron, el token y ejecutar una sincronización manual antes de tomar decisiones.",
    evidence: { syncedHoursAgo: Math.round(syncedHoursAgo), limitHours: guardrails.staleSyncHours }
  });

  if (kpis.platformLeads > 0) {
    const gapPct = Math.abs(kpis.platformLeads - kpis.crmLeads) / kpis.platformLeads * 100;
    if (gapPct > guardrails.maxAttributionGapPct) add({
      ruleKey: "attribution_gap", severity: gapPct >= 50 ? "critical" : "warning", entityType: "account", entityId: accountId,
      title: "Pérdida de atribución entre Meta y el CRM",
      rationale: `Meta registra ${kpis.platformLeads} leads y el CRM ${kpis.crmLeads}; la diferencia es ${gapPct.toFixed(1)}%.`,
      recommendedAction: "Auditar UTMs, campos ocultos, deduplicación y el ingreso del lead al CRM.",
      evidence: { platformLeads: kpis.platformLeads, crmLeads: kpis.crmLeads, gapPct }
    });
  }

  if (kpis.spend >= guardrails.minSpendForAlert && kpis.qualifiedLeads === 0) add({
    ruleKey: "no_qualified", severity: "critical", entityType: "account", entityId: accountId,
    title: "La inversión no generó oportunidades calificadas",
    rationale: `Se invirtieron USD ${kpis.spend.toFixed(0)} en 30 días sin leads calificados en el CRM.`,
    recommendedAction: "No escalar presupuesto; revisar promesa, segmentación, formulario y velocidad comercial.",
    evidence: { spend: kpis.spend, qualifiedLeads: 0 }
  });

  if (kpis.costPerLead && kpis.costPerLead > guardrails.targetCpl) add({
    ruleKey: "cpl_over_target", severity: kpis.costPerLead > guardrails.targetCpl * 1.5 ? "critical" : "warning", entityType: "account", entityId: accountId,
    title: "CPL por encima del objetivo",
    rationale: `El CPL es USD ${kpis.costPerLead.toFixed(2)} frente al objetivo de USD ${guardrails.targetCpl.toFixed(2)}.`,
    recommendedAction: "Revisar campañas y creatividades con mayor gasto antes de redistribuir presupuesto.",
    evidence: { actualCpl: kpis.costPerLead, targetCpl: guardrails.targetCpl }
  });

  if (kpis.costPerQualifiedLead && kpis.costPerQualifiedLead > guardrails.targetCpql) add({
    ruleKey: "cpql_over_target", severity: "critical", entityType: "account", entityId: accountId,
    title: "Costo por lead calificado fuera de objetivo",
    rationale: `El CPQL es USD ${kpis.costPerQualifiedLead.toFixed(2)} frente al límite de USD ${guardrails.targetCpql.toFixed(2)}.`,
    recommendedAction: "Separar el problema de adquisición del problema de calificación y priorizar el tramo con mayor pérdida.",
    evidence: { actualCpql: kpis.costPerQualifiedLead, targetCpql: guardrails.targetCpql }
  });

  if (kpis.spend >= guardrails.minSpendForAlert && (kpis.cashRoas ?? 0) < guardrails.targetCashRoas) add({
    ruleKey: "cash_roas_under_target", severity: kpis.wonLeads ? "warning" : "critical", entityType: "account", entityId: accountId,
    title: "Cash ROAS debajo del objetivo",
    rationale: `El retorno cobrado es ${(kpis.cashRoas ?? 0).toFixed(2)}x frente al objetivo de ${guardrails.targetCashRoas.toFixed(2)}x.`,
    recommendedAction: "Validar cierres y cobranza atribuida antes de aumentar inversión.",
    evidence: { cashRoas: kpis.cashRoas ?? 0, targetCashRoas: guardrails.targetCashRoas, collectedRevenue: kpis.collectedRevenue }
  });

  for (const campaign of overview.campaigns) {
    if (campaign.spend < guardrails.minSpendForAlert) continue;
    if (!campaign.cpl || campaign.cpl > guardrails.targetCpl) add({
      ruleKey: "campaign_cpl_over_target", severity: campaign.cpl ? "warning" : "critical", entityType: "campaign", entityId: campaign.id,
      title: `Campaña a revisar: ${campaign.name}`,
      rationale: campaign.cpl ? `CPL de USD ${campaign.cpl.toFixed(2)} con USD ${campaign.spend.toFixed(0)} invertidos.` : `Gastó USD ${campaign.spend.toFixed(0)} sin registrar leads.`,
      recommendedAction: "Revisar anuncios, audiencia y landing; preparar una acción para aprobación sin aplicarla automáticamente.",
      evidence: { spend: campaign.spend, cpl: campaign.cpl, targetCpl: guardrails.targetCpl }
    });
  }

  const ads = new Map<string, { spend: number; impressions: number; reach: number; linkClicks: number; views3s: number; views15s: number }>();
  for (const row of insightsResult.data ?? []) {
    if (!row.ad_id) continue;
    const current = ads.get(row.ad_id) ?? { spend: 0, impressions: 0, reach: 0, linkClicks: 0, views3s: 0, views15s: 0 };
    current.spend += n(row.spend); current.impressions += n(row.impressions); current.reach += n(row.reach);
    current.linkClicks += n(row.link_clicks); current.views3s += n(row.video_plays_3s); current.views15s += n(row.video_plays_15s);
    ads.set(row.ad_id, current);
  }
  const creativeNames = new Map(overview.creatives.map((creative) => [creative.adId, creative.adName]));
  for (const [adId, metrics] of ads) {
    const adName = creativeNames.get(adId) || adId;
    const ctr = metrics.impressions ? metrics.linkClicks / metrics.impressions * 100 : 0;
    const frequency = metrics.reach ? metrics.impressions / metrics.reach : 0;
    const hookRate = metrics.impressions ? metrics.views3s / metrics.impressions * 100 : 0;
    const holdRate = metrics.views3s ? metrics.views15s / metrics.views3s * 100 : 0;
    if (metrics.impressions >= 1000 && metrics.views3s > 0 && hookRate < 15) add({
      ruleKey: "creative_low_hook", severity: "warning", entityType: "ad", entityId: adId,
      title: `Hook débil: ${adName}`, rationale: `Solo ${hookRate.toFixed(1)}% de las impresiones llegó a 3 segundos.`,
      recommendedAction: "Probar una apertura más específica, visual y orientada al dolor en los primeros dos segundos.",
      evidence: { impressions: metrics.impressions, hookRate }
    });
    if (metrics.views3s >= 100 && holdRate < 20) add({
      ruleKey: "creative_low_hold", severity: "warning", entityType: "ad", entityId: adId,
      title: `Retención baja: ${adName}`, rationale: `${holdRate.toFixed(1)}% de quienes superaron 3 segundos alcanzó ThruPlay.`,
      recommendedAction: "Acortar la pieza, adelantar la prueba y eliminar contexto que no empuja la promesa.",
      evidence: { views3s: metrics.views3s, views15s: metrics.views15s, holdRate }
    });
    if (metrics.spend >= guardrails.minSpendForAlert && frequency >= guardrails.maxFrequency && ctr < guardrails.minLinkCtr) add({
      ruleKey: "creative_fatigue", severity: "warning", entityType: "ad", entityId: adId,
      title: `Posible fatiga: ${adName}`, rationale: `Frecuencia ${frequency.toFixed(1)} con CTR ${ctr.toFixed(2)}%.`,
      recommendedAction: "Preparar una variante de hook o formato y revisar la audiencia antes de ampliar presupuesto.",
      evidence: { spend: metrics.spend, frequency, ctr }
    });
  }

  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await db.from("meta_recommendations").select("id,rule_key,entity_type,entity_id,status,occurrences").in("rule_key", managedRules).in("status", ["open", "acknowledged"]);
  if (existingError) throw existingError;
  const activeKeys = new Set(findings.map((item) => `${item.ruleKey}:${item.entityType}:${item.entityId}`));

  for (const finding of findings) {
    const current = (existing ?? []).find((item) => item.rule_key === finding.ruleKey && item.entity_type === finding.entityType && item.entity_id === finding.entityId);
    const payload = { severity: finding.severity, title: finding.title, rationale: finding.rationale, recommended_action: finding.recommendedAction, evidence: finding.evidence, last_detected_at: now, updated_at: now };
    if (current) {
      const { error } = await db.from("meta_recommendations").update({ ...payload, occurrences: n(current.occurrences) + 1 }).eq("id", current.id);
      if (error) throw error;
    } else {
      const { error } = await db.from("meta_recommendations").insert({ rule_key: finding.ruleKey, status: "open", entity_type: finding.entityType, entity_id: finding.entityId, detected_at: now, ...payload });
      if (error) throw error;
    }
  }

  const staleIds = (existing ?? []).filter((item) => !activeKeys.has(`${item.rule_key}:${item.entity_type}:${item.entity_id}`)).map((item) => item.id);
  if (staleIds.length) {
    const { error } = await db.from("meta_recommendations").update({ status: "resolved", resolved_at: now, updated_at: now }).in("id", staleIds);
    if (error) throw error;
  }

  logServerEvent("meta.intelligence.completed", { detected: findings.length, resolved: staleIds.length });
  return { detected: findings.length, open: findings.length, resolved: staleIds.length };
}

export async function safelyGenerateMetaRecommendations() {
  try {
    return await generateMetaRecommendations();
  } catch (error) {
    logServerError("meta.intelligence.failed", error);
    return { detected: 0, open: 0, resolved: 0, failed: true };
  }
}

function overviewDateStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
}
