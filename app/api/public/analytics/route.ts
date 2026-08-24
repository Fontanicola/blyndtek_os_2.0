import { NextRequest, NextResponse } from "next/server";

import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ALLOWED_ORIGINS = new Set(["https://blyndtek.com", "https://www.blyndtek.com"]);
const EVENT_NAMES = new Set(["page_view", "engaged_session", "scroll_depth", "form_start", "form_submit", "lead", "whatsapp_click", "calendly_click", "cta_click"]);

type AnalyticsBody = Record<string, unknown>;

function stringValue(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cors(origin: string) {
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}

function originFor(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const configured = (process.env.MARKETING_SITE_URLS || process.env.MARKETING_SITE_URL || "").split(",").map((item) => item.trim());
  return ALLOWED_ORIGINS.has(origin) || configured.includes(origin) ? origin : null;
}

export async function OPTIONS(request: NextRequest) {
  const origin = originFor(request);
  return origin ? new NextResponse(null, { status: 204, headers: cors(origin) }) : NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const origin = originFor(request);
  if (!origin) return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });

  let body: AnalyticsBody;
  try { body = await request.json() as AnalyticsBody; }
  catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400, headers: cors(origin) }); }

  const eventId = stringValue(body.event_id, 80);
  const sessionId = stringValue(body.session_id, 80);
  const visitorId = stringValue(body.visitor_id, 80);
  const eventName = stringValue(body.event_name, 50);
  if (!eventId || !sessionId || !visitorId || !EVENT_NAMES.has(eventName)) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400, headers: cors(origin) });
  }

  const occurredAt = new Date(stringValue(body.occurred_at, 40));
  const safeOccurredAt = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
  const properties = body.properties && typeof body.properties === "object" && JSON.stringify(body.properties).length <= 5000 ? body.properties : {};
  const db = createUntypedAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await db.from("web_sessions").select("started_at,engaged").eq("id", sessionId).maybeSingle();
  const { error: sessionError } = await db.from("web_sessions").upsert({
    id: sessionId, visitor_id: visitorId, started_at: existing?.started_at || safeOccurredAt.toISOString(), last_seen_at: now,
    landing_url: stringValue(body.landing_url) || null, landing_path: stringValue(body.landing_path || body.path, 300) || null,
    referrer: stringValue(body.referrer) || null, utm_source: stringValue(body.utm_source, 200) || null,
    utm_medium: stringValue(body.utm_medium, 200) || null, utm_campaign: stringValue(body.utm_campaign, 300) || null,
    utm_content: stringValue(body.utm_content, 300) || null, utm_term: stringValue(body.utm_term, 300) || null,
    meta_campaign_id: stringValue(body.meta_campaign_id, 100) || null, meta_adset_id: stringValue(body.meta_adset_id, 100) || null,
    meta_ad_id: stringValue(body.meta_ad_id, 100) || null, fbclid: stringValue(body.fbclid) || null,
    device_type: stringValue(body.device_type, 30) || null, engaged: Boolean(existing?.engaged) || eventName === "engaged_session", updated_at: now
  }, { onConflict: "id" });
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500, headers: cors(origin) });

  const { data: storedEvent, error: eventError } = await db.from("web_events").upsert({
    event_id: eventId, session_id: sessionId, visitor_id: visitorId, event_name: eventName,
    path: stringValue(body.path, 300) || null, url: stringValue(body.url) || null, properties,
    occurred_at: safeOccurredAt.toISOString()
  }, { onConflict: "event_id", ignoreDuplicates: true }).select("event_id").maybeSingle();
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500, headers: cors(origin) });

  if (storedEvent) await db.rpc("increment_web_session_event_count", { session_key: sessionId });
  return NextResponse.json({ accepted: true }, { status: 202, headers: cors(origin) });
}
