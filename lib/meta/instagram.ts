import { getMetaConfig } from "@/lib/meta/config";
import { getMetaGrantedPermissions } from "@/lib/meta/client";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

type Media = { id: string; caption?: string; media_type?: string; media_product_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string; timestamp?: string; like_count?: number; comments_count?: number };
type Insight = { name: string; period?: string; values?: Array<{ value: number; end_time?: string }>; total_value?: { value?: number }; id?: string };

async function graph<T>(path: string, params: Record<string, string>) {
  const config = getMetaConfig(); if (!config.configured) throw new Error("Meta no está configurado.");
  const url = new URL(`https://graph.facebook.com/${config.graphApiVersion}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${config.accessToken}` }, cache: "no-store" });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "Instagram Graph API rechazó la solicitud.");
  return payload;
}

export async function syncInstagram() {
  const config = getMetaConfig();
  if (!config.configured || !config.instagramAccountId) throw new Error("Falta META_INSTAGRAM_ACCOUNT_ID.");
  const permissions = await getMetaGrantedPermissions();
  const required = ["pages_read_engagement", "instagram_basic", "instagram_manage_insights"];
  const missing = required.filter((permission) => !permissions.includes(permission));
  if (missing.length) throw new Error(`Faltan permisos de Instagram: ${missing.join(", ")}.`);

  const db = createUntypedAdminClient(); const accountId = config.instagramAccountId; const syncedAt = new Date().toISOString();
  const mediaResponse = await graph<{ data: Media[] }>(`${accountId}/media`, { fields: "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count", limit: "100" });
  if (mediaResponse.data.length) await db.from("instagram_media").upsert(mediaResponse.data.map((media) => ({ id: media.id, account_id: accountId, caption: media.caption || null, media_type: media.media_type || null, media_product_type: media.media_product_type || null, media_url: media.media_url || null, thumbnail_url: media.thumbnail_url || null, permalink: media.permalink || null, posted_at: media.timestamp || null, like_count: media.like_count || 0, comments_count: media.comments_count || 0, raw: media, synced_at: syncedAt })));

  const date = syncedAt.slice(0, 10); let insights = 0; const recentMedia = mediaResponse.data.slice(0, 25);
  for (let offset = 0; offset < recentMedia.length; offset += 5) {
    const batch = await Promise.all(recentMedia.slice(offset, offset + 5).map(async (media) => {
      try {
        const response = await graph<{ data: Insight[] }>(`${media.id}/insights`, { metric: "reach,total_interactions,views,saved,shares" });
        return response.data.map((item) => ({ account_id: accountId, media_id: media.id, date, metric: item.name, value: Number(item.total_value?.value ?? item.values?.[0]?.value ?? 0), raw: item, synced_at: syncedAt }));
      } catch { return []; /* Algunas métricas no aplican a todos los formatos. */ }
    }));
    const rows = batch.flat();
    if (rows.length) { await db.from("instagram_insights_daily").upsert(rows, { onConflict: "account_id,media_id,date,metric" }); insights += rows.length; }
  }

  await db.from("meta_connections").update({ instagram_account_id: accountId, permissions, updated_at: syncedAt }).eq("ad_account_id", config.adAccountId);
  return { media: mediaResponse.data.length, insights, permissions };
}
