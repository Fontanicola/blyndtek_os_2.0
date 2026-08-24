import { getMetaConfig } from "@/lib/meta/config";
import { safelyGenerateMetaRecommendations } from "@/lib/meta/intelligence";
import {
  getMetaAccount,
  getMetaAds,
  getMetaAdSets,
  getMetaCampaigns,
  getMetaInsights,
  type MetaInsightApiRow
} from "@/lib/meta/client";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

function number(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function actionValue(actions: Array<{ action_type: string; value: string }> | undefined, names: string[]) {
  return (actions ?? [])
    .filter((action) => names.includes(action.action_type))
    .reduce((total, action) => total + number(action.value), 0);
}

function mapInsight(row: MetaInsightApiRow, adAccountId: string, currencyToUsd: number) {
  const leads = actionValue(row.actions, ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"]);
  const linkClicks = actionValue(row.actions, ["link_click"]);
  const landingPageViews = actionValue(row.actions, ["landing_page_view"]);
  const costPerLead = actionValue(row.cost_per_action_type, ["lead", "onsite_conversion.lead_grouped"]);

  return {
    ad_account_id: adAccountId,
    date_start: row.date_start,
    date_stop: row.date_stop,
    entity_level: "ad",
    entity_id: row.ad_id || "unknown",
    campaign_id: row.campaign_id || null,
    adset_id: row.adset_id || null,
    ad_id: row.ad_id || null,
    spend: number(row.spend) * currencyToUsd,
    impressions: number(row.impressions),
    reach: number(row.reach),
    frequency: number(row.frequency),
    clicks: number(row.clicks),
    link_clicks: linkClicks,
    landing_page_views: landingPageViews,
    leads,
    // In Graph API v26, 3-second views are exposed as the video_view action and
    // 15-second/completed views are exposed through the ThruPlay metric.
    video_plays_3s: actionValue(row.actions, ["video_view"]),
    video_plays_15s: actionValue(row.video_thruplay_watched_actions, ["video_view"]),
    ctr: number(row.ctr),
    cpc: number(row.cpc) * currencyToUsd,
    cpm: number(row.cpm) * currencyToUsd,
    cost_per_lead: costPerLead ? costPerLead * currencyToUsd : null,
    raw: row,
    synced_at: new Date().toISOString()
  };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function syncMetaAds(initiatedBy: string | null, triggerType: "manual" | "cron" = "manual") {
  const config = getMetaConfig();
  if (!config.configured) {
    throw new Error(`Configuración incompleta: ${config.missingEnvironmentVariables.join(", ")}.`);
  }

  const db = createUntypedAdminClient();
  const { data: run, error: runError } = await db
    .from("meta_sync_runs")
    .insert({ ad_account_id: config.adAccountId, trigger_type: triggerType, status: "running", initiated_by: initiatedBy })
    .select("id")
    .single();

  if (runError || !run) throw new Error(runError?.message || "No se pudo iniciar la sincronización.");

  try {
    const until = new Date();
    const since = new Date(until);
    since.setUTCDate(since.getUTCDate() - 90);

    const [account, campaigns, adSets, ads, insights] = await Promise.all([
      getMetaAccount(),
      getMetaCampaigns(),
      getMetaAdSets(),
      getMetaAds(),
      getMetaInsights(isoDate(since), isoDate(until))
    ]);
    const syncedAt = new Date().toISOString();

    const { error: connectionError } = await db.from("meta_connections").upsert(
      {
        ad_account_id: config.adAccountId,
        account_name: typeof account.name === "string" ? account.name : null,
        business_id: config.businessId,
        page_id: config.pageId,
        pixel_id: config.pixelId,
        currency: typeof account.currency === "string" ? account.currency : "USD",
        timezone_name: typeof account.timezone_name === "string" ? account.timezone_name : null,
        status: "connected",
        last_sync_at: syncedAt,
        last_error: null,
        updated_at: syncedAt
      },
      { onConflict: "ad_account_id" }
    );
    if (connectionError) throw connectionError;

    if (campaigns.length > 0) {
      const { error } = await db.from("meta_campaigns").upsert(
        campaigns.map((row) => ({
          id: row.id, ad_account_id: config.adAccountId, name: row.name, status: row.status || null,
          effective_status: row.effective_status || null, objective: row.objective || null,
          buying_type: row.buying_type || null, daily_budget: number(row.daily_budget) || null,
          lifetime_budget: number(row.lifetime_budget) || null, start_time: row.start_time || null,
          stop_time: row.stop_time || null, raw: row, synced_at: syncedAt
        }))
      );
      if (error) throw error;
    }

    if (adSets.length > 0) {
      const { error } = await db.from("meta_ad_sets").upsert(
        adSets.map((row) => ({
          id: row.id, campaign_id: row.campaign_id, ad_account_id: config.adAccountId, name: row.name,
          status: row.status || null, effective_status: row.effective_status || null,
          optimization_goal: row.optimization_goal || null, billing_event: row.billing_event || null,
          daily_budget: number(row.daily_budget) || null, lifetime_budget: number(row.lifetime_budget) || null,
          targeting: row.targeting || null, raw: row, synced_at: syncedAt
        }))
      );
      if (error) throw error;
    }

    const creatives = ads.flatMap((row) => row.creative?.id ? [{
      id: row.creative.id, ad_account_id: config.adAccountId, name: row.creative.name || null,
      thumbnail_url: row.creative.thumbnail_url || null, image_url: row.creative.image_url || null,
      video_id: row.creative.video_id || null, format: row.creative.object_type || null,
      destination_url: row.creative.object_url || null, title: row.creative.title || null,
      body: row.creative.body || null, call_to_action: row.creative.call_to_action_type || null,
      raw: row.creative, synced_at: syncedAt
    }] : []);
    if (creatives.length > 0) {
      const { error } = await db.from("meta_creatives").upsert(creatives);
      if (error) throw error;
    }

    if (ads.length > 0) {
      const { error } = await db.from("meta_ads").upsert(
        ads.map((row) => ({
          id: row.id, campaign_id: row.campaign_id, adset_id: row.adset_id,
          creative_id: row.creative?.id || null, ad_account_id: config.adAccountId, name: row.name,
          status: row.status || null, effective_status: row.effective_status || null, raw: row, synced_at: syncedAt
        }))
      );
      if (error) throw error;
    }

    if (insights.length > 0) {
      const { error } = await db.from("meta_insights_daily").upsert(
        insights.map((row) => mapInsight(row, config.adAccountId, Number.isFinite(config.accountCurrencyToUsd) && config.accountCurrencyToUsd > 0 ? config.accountCurrencyToUsd : 1)),
        { onConflict: "ad_account_id,date_start,entity_level,entity_id" }
      );
      if (error) throw error;
    }

    const records = campaigns.length + adSets.length + ads.length + insights.length;
    await db.from("meta_sync_runs").update({
      status: "success", finished_at: new Date().toISOString(), records_campaigns: campaigns.length,
      records_adsets: adSets.length, records_ads: ads.length, records_insights: insights.length
    }).eq("id", run.id);

    const intelligence = await safelyGenerateMetaRecommendations();

    return { records, campaigns: campaigns.length, adSets: adSets.length, ads: ads.length, insights: insights.length, intelligence };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al sincronizar Meta.";
    await Promise.all([
      db.from("meta_sync_runs").update({ status: "error", finished_at: new Date().toISOString(), error_message: message }).eq("id", run.id),
      db.from("meta_connections").upsert({ ad_account_id: config.adAccountId, status: "error", last_error: message, updated_at: new Date().toISOString() }, { onConflict: "ad_account_id" })
    ]);
    throw new Error(message);
  }
}
