import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CanalOrigenLead } from "@/types/leads";
import type { Database } from "@/types/supabase";

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
  honeypot?: unknown;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

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
  return typeof value === "string" ? value.trim() : "";
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

  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400, headers });
  }

  if (!email) {
    return NextResponse.json({ error: "El email es obligatorio." }, { status: 400, headers });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "El email no tiene un formato válido." }, { status: 400, headers });
  }

  const supabase = createAdminClient();
  const payload = {
    canal: "inbound",
    canal_origen: mapUtmSourceToCanalOrigen(utmSource),
    campana_origen: utmCampaign || null,
    empresa: empresa || nombre,
    contacto_1_nombre: nombre,
    contacto_1_tel: telefono || null,
    etapa: "por_contactar",
    vendedor_id: null,
    responsable_id: null,
    contexto: mensajeInicial || null,
    mensaje_inicial: mensajeInicial || null,
    notas: buildNotas(email, mensajeInicial)
  } satisfies LeadInsert;

  const { error } = await supabase.from("leads").insert(payload).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers });
  }

  return NextResponse.json(
    { message: "Gracias. Recibimos tu consulta y te vamos a contactar pronto." },
    { status: 200, headers }
  );
}
