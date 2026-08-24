import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { MarketingHubOverview, MarketingHubPeriod } from "@/types/marketingHub";

export const dynamic = "force-dynamic";

function startFor(period: MarketingHubPeriod) {
  const date = new Date();
  if (period === "7d") date.setUTCDate(date.getUTCDate() - 6);
  else if (period === "30d") date.setUTCDate(date.getUTCDate() - 29);
  else if (period === "90d") date.setUTCDate(date.getUTCDate() - 89);
  else date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0); return date;
}

function ratio(numerator: number, denominator: number) { return denominator ? numerator / denominator : null; }
function numberValue(value: unknown) { const valueNumber = Number(value ?? 0); return Number.isFinite(valueNumber) ? valueNumber : 0; }

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (!["admin", "marketing"].includes(user.rol)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const requested = request.nextUrl.searchParams.get("period");
  const period: MarketingHubPeriod = requested === "7d" || requested === "90d" || requested === "year" ? requested : "30d";
  const start = startFor(period); const startIso = start.toISOString(); const startDate = startIso.slice(0, 10);
  const db = createUntypedAdminClient();

  const [sessionsResult, eventsResult, leadsResult, conversationsResult, mediaResult, instagramInsightsResult, connectionResult] = await Promise.all([
    db.from("web_sessions").select("*").gte("started_at", startIso),
    db.from("web_events").select("event_name,path,session_id,occurred_at,properties").gte("occurred_at", startIso),
    db.from("leads").select("id,created_at,contacto_1_nombre,empresa,contacto_email,contacto_1_tel,etapa,responsable_id,canal_origen,campana_origen,meta_campaign_id,meta_adset_id,meta_ad_id,landing_url,web_session_id,meta_capi_status,motivo_descarte").or("canal_origen.eq.meta_ads,web_session_id.not.is.null").gte("created_at", startIso).order("created_at", { ascending: false }),
    db.from("whatsapp_conversations").select("status,unread_count,first_message_at,first_response_at").gte("created_at", startIso),
    db.from("instagram_media").select("*").order("posted_at", { ascending: false }).limit(50),
    db.from("instagram_insights_daily").select("media_id,date,metric,value").gte("date", startDate),
    db.from("meta_connections").select("instagram_account_id,permissions").order("updated_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const missingTable = [sessionsResult, eventsResult, conversationsResult, mediaResult, instagramInsightsResult].find((item) => item.error?.code === "42P01" || item.error?.code === "PGRST205");
  if (missingTable) return NextResponse.json({ error: "La migración del Marketing Hub todavía no fue aplicada." }, { status: 503 });
  const firstError = [sessionsResult, eventsResult, leadsResult, conversationsResult, mediaResult, instagramInsightsResult].find((item) => item.error);
  if (firstError?.error) return NextResponse.json({ error: firstError.error.message }, { status: 500 });

  const sessions = sessionsResult.data ?? []; const events = eventsResult.data ?? []; const leads = leadsResult.data ?? [];
  const webLeads = leads.filter((lead) => Boolean(lead.web_session_id));
  const sessionIdsWithLead = new Set(leads.map((lead) => lead.web_session_id).filter(Boolean));
  const visitors = new Set(sessions.map((session) => session.visitor_id));
  const eventCount = (name: string) => events.filter((event) => event.event_name === name).length;
  const pageViews = eventCount("page_view"); const formStarts = eventCount("form_start");
  const whatsappClicks = eventCount("whatsapp_click"); const calendlyClicks = eventCount("calendly_click");
  const engagedSessions = sessions.filter((session) => session.engaged).length;

  const trendMap = new Map<string, MarketingHubOverview["trend"][number]>();
  const trendPoint = (date: string) => { const current = trendMap.get(date) ?? { date, sessions: 0, pageViews: 0, engagedSessions: 0, formStarts: 0, leads: 0, whatsappClicks: 0 }; trendMap.set(date, current); return current; };
  for (const session of sessions) { const point = trendPoint(String(session.started_at).slice(0, 10)); point.sessions += 1; if (session.engaged) point.engagedSessions += 1; }
  for (const event of events) { const point = trendPoint(String(event.occurred_at).slice(0, 10)); if (event.event_name === "page_view") point.pageViews += 1; if (event.event_name === "form_start") point.formStarts += 1; if (event.event_name === "whatsapp_click") point.whatsappClicks += 1; }
  for (const lead of webLeads) trendPoint(String(lead.created_at).slice(0, 10)).leads += 1;

  const pageMap = new Map<string, { path: string; sessions: Set<string>; pageViews: number; leads: number }>();
  for (const event of events.filter((item) => item.event_name === "page_view")) { const path = event.path || "/"; const current = pageMap.get(path) ?? { path, sessions: new Set<string>(), pageViews: 0, leads: 0 }; current.sessions.add(event.session_id); current.pageViews += 1; if (sessionIdsWithLead.has(event.session_id)) current.leads += 1; pageMap.set(path, current); }
  const pages = [...pageMap.values()].map((item) => ({ path: item.path, sessions: item.sessions.size, pageViews: item.pageViews, leads: item.leads, conversionRate: ratio(item.leads, item.sessions.size) })).sort((a, b) => b.sessions - a.sessions).slice(0, 20);

  const sourceMap = new Map<string, { source: string; medium: string; campaign: string; sessions: number; leads: number }>();
  for (const session of sessions) { const source = session.utm_source || "direct"; const medium = session.utm_medium || "none"; const campaign = session.utm_campaign || "sin campaña"; const key = `${source}|${medium}|${campaign}`; const current = sourceMap.get(key) ?? { source, medium, campaign, sessions: 0, leads: 0 }; current.sessions += 1; if (session.converted_lead_id) current.leads += 1; sourceMap.set(key, current); }
  const sources = [...sourceMap.values()].map((item) => ({ ...item, conversionRate: ratio(item.leads, item.sessions) })).sort((a, b) => b.sessions - a.sessions);

  const conversations = conversationsResult.data ?? [];
  const responseMinutes = conversations.flatMap((conversation) => conversation.first_message_at && conversation.first_response_at ? [(new Date(conversation.first_response_at).getTime() - new Date(conversation.first_message_at).getTime()) / 60000] : []);
  const insightRows = instagramInsightsResult.data ?? [];
  const insightValue = (metric: string, mediaId?: string) => insightRows.filter((row) => row.metric === metric && (!mediaId || row.media_id === mediaId)).reduce((sum, row) => sum + numberValue(row.value), 0);
  const granted = new Set((connectionResult.data?.permissions as string[] | null) || []);
  const needed = ["pages_read_engagement", "instagram_basic", "instagram_manage_insights"];

  const data: MarketingHubOverview = {
    web: { sessions: sessions.length, visitors: visitors.size, pageViews, engagedSessions, engagementRate: ratio(engagedSessions, sessions.length), formStarts, leads: webLeads.length, conversionRate: ratio(webLeads.length, sessions.length), whatsappClicks, calendlyClicks },
    trend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)), pages, sources,
    leads: leads.map((lead) => ({ id: lead.id, createdAt: lead.created_at, name: lead.contacto_1_nombre, company: lead.empresa, email: lead.contacto_email, phone: lead.contacto_1_tel, stage: lead.etapa, ownerId: lead.responsable_id, source: lead.canal_origen, campaign: lead.campana_origen, campaignId: lead.meta_campaign_id, adsetId: lead.meta_adset_id, adId: lead.meta_ad_id, landingUrl: lead.landing_url, sessionId: lead.web_session_id, capiStatus: lead.meta_capi_status, discardReason: lead.motivo_descarte })),
    whatsapp: { clicks: whatsappClicks, conversations: conversations.length, qualified: conversations.filter((item) => item.status === "qualified").length, unread: conversations.reduce((sum, item) => sum + numberValue(item.unread_count), 0), averageFirstResponseMinutes: responseMinutes.length ? responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length : null },
    instagram: { connected: needed.every((permission) => granted.has(permission)), missingPermissions: needed.filter((permission) => !granted.has(permission)), followers: null, reach: insightValue("reach"), interactions: insightValue("total_interactions"), media: (mediaResult.data ?? []).map((media) => ({ id: media.id, caption: media.caption, mediaType: media.media_type, thumbnailUrl: media.thumbnail_url || media.media_url, permalink: media.permalink, postedAt: media.posted_at, likes: numberValue(media.like_count), comments: numberValue(media.comments_count), reach: insightValue("reach", media.id), interactions: insightValue("total_interactions", media.id) })) }
  };
  return NextResponse.json({ data, period });
}
