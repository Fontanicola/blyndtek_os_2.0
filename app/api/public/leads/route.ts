import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { CanalOrigenLead } from "@/types/leads";

export const runtime = "nodejs";

const DEFAULT_MARKETING_SITE_URL = "https://blyndtek.com";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type PublicLeadBody = {
  nombre?: unknown;
  empresa?: unknown;
  email?: unknown;
  telefono?: unknown;
  mensaje_inicial?: unknown;
  utm_source?: unknown;
  utm_campaign?: unknown;
  utm_medium?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  meta_campaign_id?: unknown;
  meta_adset_id?: unknown;
  meta_ad_id?: unknown;
  meta_lead_id?: unknown;
  fbclid?: unknown;
  fbc?: unknown;
  fbp?: unknown;
  landing_url?: unknown;
  formulario_version?: unknown;
  consentimiento_marketing?: unknown;
  honeypot?: unknown;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getAllowedOrigin() {
  return process.env.MARKETING_SITE_URL?.trim() || DEFAULT_MARKETING_SITE_URL;
}

function buildCorsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

function rejectCors() {
  return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
}

function getCorsHeadersOrResponse(request: NextRequest) {
  const allowedOrigin = getAllowedOrigin();
  const origin = request.headers.get("origin");

  if (origin !== allowedOrigin) {
    return { errorResponse: rejectCors(), headers: null };
  }

  return { errorResponse: null, headers: buildCorsHeaders(allowedOrigin) };
}

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return firstForwardedIp || request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  rateLimitStore.set(ip, current);
  return { allowed: true };
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1000) : "";
}

function mapUtmSourceToCanalOrigen(utmSource: string): CanalOrigenLead {
  if (!utmSource) {
    return "organico";
  }

  const source = utmSource.toLowerCase();

  if (source.includes("meta") || source.includes("facebook") || source.includes("instagram")) {
    return "meta_ads";
  }

  if (source.includes("google")) {
    return "google_ads";
  }

  return "otro";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildNotas(email: string, mensajeInicial: string) {
  return [`Email: ${email}`, mensajeInicial ? `Mensaje inicial: ${mensajeInicial}` : null]
    .filter(Boolean)
    .join("\n");
}

export async function OPTIONS(request: NextRequest) {
  const { errorResponse, headers } = getCorsHeadersOrResponse(request);

  if (errorResponse) {
    return errorResponse;
  }

  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: NextRequest) {
  const { errorResponse, headers } = getCorsHeadersOrResponse(request);

  if (errorResponse) {
    return errorResponse;
  }

  const rateLimit = checkRateLimit(getRequestIp(request));

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en un minuto." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(rateLimit.retryAfterSeconds ?? 60)
        }
      }
    );
  }

  let body: PublicLeadBody;

  try {
    body = (await request.json()) as PublicLeadBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400, headers });
  }

  const honeypot = asTrimmedString(body.honeypot);

  if (honeypot) {
    return NextResponse.json(
      { message: "Gracias. Recibimos tu consulta y te vamos a contactar pronto." },
      { status: 200, headers }
    );
  }

  const nombre = asTrimmedString(body.nombre);
  const email = asTrimmedString(body.email).toLowerCase();
  const empresa = asTrimmedString(body.empresa);
  const telefono = asTrimmedString(body.telefono);
  const mensajeInicial = asTrimmedString(body.mensaje_inicial);
  const utmSource = asTrimmedString(body.utm_source);
  const utmCampaign = asTrimmedString(body.utm_campaign);
  const utmMedium = asTrimmedString(body.utm_medium);
  const utmContent = asTrimmedString(body.utm_content);
  const utmTerm = asTrimmedString(body.utm_term);
  const metaCampaignId = asTrimmedString(body.meta_campaign_id);
  const metaAdsetId = asTrimmedString(body.meta_adset_id);
  const metaAdId = asTrimmedString(body.meta_ad_id);
  const metaLeadId = asTrimmedString(body.meta_lead_id);
  const fbclid = asTrimmedString(body.fbclid);
  const fbc = asTrimmedString(body.fbc);
  const fbp = asTrimmedString(body.fbp);
  const landingUrl = asTrimmedString(body.landing_url);
  const formularioVersion = asTrimmedString(body.formulario_version);

  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400, headers });
  }

  if (!email) {
    return NextResponse.json({ error: "El email es obligatorio." }, { status: 400, headers });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "El email no tiene un formato válido." }, { status: 400, headers });
  }

  const supabase = createUntypedAdminClient();
  const payload = {
    canal: "inbound",
    canal_origen: mapUtmSourceToCanalOrigen(utmSource),
    campana_origen: utmCampaign || null,
    empresa: empresa || nombre,
    contacto_1_nombre: nombre,
    contacto_1_tel: telefono || null,
    contacto_email: email,
    etapa: "por_contactar",
    vendedor_id: null,
    responsable_id: null,
    contexto: mensajeInicial || null,
    mensaje_inicial: mensajeInicial || null,
    notas: buildNotas(email, mensajeInicial),
    utm_source: utmSource || null,
    utm_medium: utmMedium || null,
    utm_content: utmContent || null,
    utm_term: utmTerm || null,
    meta_campaign_id: metaCampaignId || null,
    meta_adset_id: metaAdsetId || null,
    meta_ad_id: metaAdId || null,
    meta_lead_id: metaLeadId || null,
    fbclid: fbclid || null,
    fbc: fbc || null,
    fbp: fbp || null,
    landing_url: landingUrl || null,
    formulario_version: formularioVersion || null,
    consentimiento_marketing: body.consentimiento_marketing === true,
    attribution_captured_at: new Date().toISOString()
  };

  const { error } = await supabase.from("leads").insert(payload).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers });
  }

  return NextResponse.json(
    { message: "Gracias. Recibimos tu consulta y te vamos a contactar pronto." },
    { status: 200, headers }
  );
}
