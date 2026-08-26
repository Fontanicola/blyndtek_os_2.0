import { NextRequest, NextResponse } from "next/server";

import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_ORIGINS = new Set(["https://blyndtek.com", "https://www.blyndtek.com"]);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;

type RateLimitEntry = { count: number; resetAt: number };
type PublicNewsletterBody = Record<string, unknown>;

const rateLimitStore = new Map<string, RateLimitEntry>();

function value(input: unknown, max = 1000) {
  return typeof input === "string" ? input.trim().slice(0, max) : "";
}

function allowedOrigins() {
  const configured = (process.env.MARKETING_SITE_URLS || process.env.MARKETING_SITE_URL || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...configured]);
}

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function requestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  return allowedOrigins().has(origin) ? origin : null;
}

function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function allowRequest(ip: string) {
  const now = Date.now();
  const current = rateLimitStore.get(ip);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function OPTIONS(request: NextRequest) {
  const origin = requestOrigin(request);
  return origin
    ? new NextResponse(null, { status: 204, headers: cors(origin) })
    : NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const origin = requestOrigin(request);
  if (!origin) return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  const headers = cors(origin);

  if (!allowRequest(requestIp(request))) {
    return NextResponse.json({ error: "Demasiados intentos. Probá nuevamente en un minuto." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  }

  let body: PublicNewsletterBody;
  try { body = await request.json() as PublicNewsletterBody; }
  catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400, headers }); }

  if (value(body.honeypot)) {
    return NextResponse.json({ message: "La suscripción quedó registrada." }, { status: 200, headers });
  }

  const email = value(body.email, 254).toLowerCase();
  if (!validEmail(email)) return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400, headers });
  if (body.consentimiento !== true) return NextResponse.json({ error: "Necesitamos tu consentimiento para completar la suscripción." }, { status: 400, headers });

  const db = createUntypedAdminClient();
  const now = new Date().toISOString();
  const requestedWebSessionId = value(body.web_session_id, 100) || null;
  let webSessionId: string | null = null;
  if (requestedWebSessionId) {
    const session = await db.from("web_sessions").select("id").eq("id", requestedWebSessionId).maybeSingle();
    if (session.data?.id) webSessionId = session.data.id as string;
  }
  const existing = await db.from("newsletter_suscriptores").select("id,estado").ilike("email", email).maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500, headers });

  const subscriber = {
    email,
    nombre: value(body.nombre, 120) || null,
    empresa: value(body.empresa, 160) || null,
    estado: "activo",
    fuente: value(body.source, 120) || null,
    landing_url: value(body.landing_url) || null,
    referrer: value(body.referrer) || null,
    utm_source: value(body.utm_source, 200) || null,
    utm_medium: value(body.utm_medium, 200) || null,
    utm_campaign: value(body.utm_campaign, 300) || null,
    utm_content: value(body.utm_content, 300) || null,
    utm_term: value(body.utm_term, 300) || null,
    visitor_id: value(body.visitor_id, 100) || null,
    web_session_id: webSessionId,
    consentimiento_at: now,
    desuscripto_at: null,
    updated_at: now,
  };

  const write = existing.data
    ? await db.from("newsletter_suscriptores").update(subscriber).eq("id", existing.data.id)
    : await db.from("newsletter_suscriptores").insert(subscriber);

  if (write.error) return NextResponse.json({ error: write.error.message }, { status: 500, headers });

  return NextResponse.json({
    message: existing.data?.estado === "activo"
      ? "Ya estabas suscripto a La Operación. Te avisaremos cuando salga la próxima edición."
      : "Ya sos parte de La Operación. Te avisaremos cuando salga la próxima edición.",
  }, { status: existing.data ? 200 : 201, headers });
}
