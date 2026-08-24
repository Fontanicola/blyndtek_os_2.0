import { getMetaConfig } from "@/lib/meta/config";

type MetaPage<T> = {
  data: T[];
  paging?: { next?: string };
  error?: { message?: string; code?: number };
};

export type MetaCampaignApiRow = {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  buying_type?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
};

export type MetaAdSetApiRow = {
  id: string;
  campaign_id: string;
  name: string;
  status?: string;
  effective_status?: string;
  optimization_goal?: string;
  billing_event?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  targeting?: Record<string, unknown>;
};

export type MetaAdApiRow = {
  id: string;
  campaign_id: string;
  adset_id: string;
  name: string;
  status?: string;
  effective_status?: string;
  creative?: {
    id?: string;
    name?: string;
    thumbnail_url?: string;
    image_url?: string;
    video_id?: string;
    object_type?: string;
    title?: string;
    body?: string;
    call_to_action_type?: string;
    object_url?: string;
  };
};

export type MetaInsightApiRow = {
  date_start: string;
  date_stop: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  video_3_sec_watched_actions?: Array<{ action_type: string; value: string }>;
  video_15_sec_watched_actions?: Array<{ action_type: string; value: string }>;
};

async function getAllPages<T>(url: URL, accessToken: string) {
  const records: T[] = [];
  let next: string | undefined = url.toString();

  while (next) {
    const response = await fetch(next, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    });
    const payload = (await response.json()) as MetaPage<T>;

    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `Meta Graph API respondió ${response.status}.`);
    }

    records.push(...(payload.data || []));
    next = payload.paging?.next;
  }

  return records;
}

function buildUrl(path: string, fields: string, params: Record<string, string> = {}) {
  const config = getMetaConfig();

  if (!config.configured) {
    throw new Error(`Faltan variables de Meta: ${config.missingEnvironmentVariables.join(", ")}.`);
  }

  const url = new URL(`https://graph.facebook.com/${config.graphApiVersion}/${path}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "200");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return { url, config };
}

export async function getMetaAccount() {
  const { url, config } = buildUrl(configuredAccountPath(), "id,name,currency,timezone_name,account_status");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${config.accessToken}` }, cache: "no-store" });
  const payload = (await response.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "No se pudo leer la cuenta de Meta.");
  return payload;
}

function configuredAccountPath() {
  const config = getMetaConfig();
  if (!config.configured) throw new Error(`Faltan variables de Meta: ${config.missingEnvironmentVariables.join(", ")}.`);
  return config.adAccountId;
}

export async function getMetaCampaigns() {
  const { url, config } = buildUrl(`${configuredAccountPath()}/campaigns`, "id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,start_time,stop_time");
  return getAllPages<MetaCampaignApiRow>(url, config.accessToken);
}

export async function getMetaAdSets() {
  const { url, config } = buildUrl(`${configuredAccountPath()}/adsets`, "id,campaign_id,name,status,effective_status,optimization_goal,billing_event,daily_budget,lifetime_budget,targeting");
  return getAllPages<MetaAdSetApiRow>(url, config.accessToken);
}

export async function getMetaAds() {
  const creativeFields = "creative{id,name,thumbnail_url,image_url,video_id,object_type,title,body,call_to_action_type,object_url}";
  const { url, config } = buildUrl(`${configuredAccountPath()}/ads`, `id,campaign_id,adset_id,name,status,effective_status,${creativeFields}`);
  return getAllPages<MetaAdApiRow>(url, config.accessToken);
}

export async function getMetaInsights(since: string, until: string) {
  const fields = "date_start,date_stop,campaign_id,adset_id,ad_id,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,cost_per_action_type,video_3_sec_watched_actions,video_15_sec_watched_actions";
  const { url, config } = buildUrl(`${configuredAccountPath()}/insights`, fields, {
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since, until })
  });
  return getAllPages<MetaInsightApiRow>(url, config.accessToken);
}
