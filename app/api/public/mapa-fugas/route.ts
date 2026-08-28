import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { refreshMarketingIntelligence } from "@/lib/marketing/intelligence";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAMPAIGN_KEY = "instagram_reel_mapa_2026_08";
const GOOGLE_SHEETS_URL =
  "https://docs.google.com/spreadsheets/d/1rhRGu529I0MivRCxBWJjwEzvEPJuUPj7FP4FeniOdI0/copy";
const EXCEL_DOWNLOAD_URL =
  "https://docs.google.com/spreadsheets/d/1rhRGu529I0MivRCxBWJjwEzvEPJuUPj7FP4FeniOdI0/export?format=xlsx";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 6;

type MapaFugasBody = {
  nombre?: unknown;
  email?: unknown;
  empresa?: unknown;
  instagram_usuario?: unknown;
  proceso?: unknown;
  consentimiento?: unknown;
  honeypot?: unknown;
  landing_url?: unknown;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function asText(value: unknown, maxLength = 300) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;

  current.count += 1;
  rateLimitStore.set(ip, current);
  return true;
}

function normalizeInstagramUsername(value: string) {
  const cleaned = value.replace(/^@+/, "").replace(/\s+/g, "").slice(0, 60);
  return cleaned ? `@${cleaned}` : "";
}

function buildLeadNote(input: {
  email: string;
  instagramUsername: string;
  process: string;
  timestamp: string;
}) {
  return [
    "Lead magnet: Mapa de fugas operativas",
    `Email: ${input.email}`,
    `Instagram: ${input.instagramUsername}`,
    `Proceso elegido: ${input.process}`,
    `Solicitado: ${input.timestamp}`
  ].join("\n");
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit(getRequestIp(request))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un minuto y volvé a probar." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  let body: MapaFugasBody;

  try {
    body = (await request.json()) as MapaFugasBody;
  } catch {
    return NextResponse.json({ error: "No pudimos leer los datos enviados." }, { status: 400 });
  }

  if (asText(body.honeypot)) {
    return NextResponse.json({ ok: true, google_sheets_url: GOOGLE_SHEETS_URL });
  }

  const nombre = asText(body.nombre, 120);
  const email = asText(body.email, 180).toLowerCase();
  const empresa = asText(body.empresa, 160);
  const instagramUsername = normalizeInstagramUsername(asText(body.instagram_usuario, 80));
  const proceso = asText(body.proceso, 120);
  const landingUrl = asText(body.landing_url, 500);

  if (!nombre || !email || !instagramUsername || !proceso) {
    return NextResponse.json(
      { error: "Completá nombre, email, usuario de Instagram y proceso." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }

  if (body.consentimiento !== true) {
    return NextResponse.json(
      { error: "Necesitamos tu autorización para enviarte el recurso y responder sobre el resultado." },
      { status: 400 }
    );
  }

  const supabase = createUntypedAdminClient();
  const occurredAt = new Date().toISOString();
  const eventId = randomUUID();
  const note = buildLeadNote({ email, instagramUsername, process: proceso, timestamp: occurredAt });

  const { data: existingLead, error: existingError } = await supabase
    .from("leads")
    .select("id,empresa,contacto_1_nombre,notas,contexto")
    .eq("contacto_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("No se pudo buscar el lead del MAPA:", existingError.message);
    return NextResponse.json({ error: "No pudimos preparar tu acceso. Probá nuevamente." }, { status: 500 });
  }

  let leadId: string;
  let created = false;

  if (existingLead) {
    leadId = existingLead.id;
    const notes = [existingLead.notas, note].filter(Boolean).join("\n\n").slice(-8000);
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        empresa: existingLead.empresa || empresa || nombre,
        contacto_1_nombre: existingLead.contacto_1_nombre || nombre,
        contexto: existingLead.contexto || "Solicitó el Mapa de fugas operativas desde Instagram.",
        notas: notes,
        updated_at: occurredAt
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("No se pudo actualizar el lead del MAPA:", updateError.message);
      return NextResponse.json({ error: "No pudimos preparar tu acceso. Probá nuevamente." }, { status: 500 });
    }
  } else {
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        canal: "inbound",
        canal_origen: "organico",
        campana_origen: CAMPAIGN_KEY,
        empresa: empresa || nombre,
        contacto_1_nombre: nombre,
        contacto_1_tel: null,
        contacto_email: email,
        etapa: "por_contactar",
        vendedor_id: null,
        responsable_id: null,
        contexto: "Solicitó el Mapa de fugas operativas desde Instagram.",
        mensaje_inicial: `Solicitó el MAPA para revisar el proceso: ${proceso}.`,
        notas: note,
        utm_source: "instagram",
        utm_medium: "organic_social",
        utm_content: "reel_mapa",
        landing_url: landingUrl || null,
        formulario_version: "mapa-fugas-v1",
        consentimiento_marketing: true,
        attribution_captured_at: occurredAt
      })
      .select("id")
      .single();

    if (insertError || !lead) {
      console.error("No se pudo crear el lead del MAPA:", insertError?.message || "Sin fila creada");
      return NextResponse.json({ error: "No pudimos preparar tu acceso. Probá nuevamente." }, { status: 500 });
    }

    leadId = lead.id;
    created = true;
  }

  const { error: touchpointError } = await supabase.from("marketing_touchpoints").insert({
    source_key: `instagram:mapa:${eventId}`,
    lead_id: leadId,
    channel: "instagram",
    event_name: "lead_magnet_requested",
    campaign_id: CAMPAIGN_KEY,
    occurred_at: occurredAt,
    metadata: {
      resource: "mapa_fugas_operativas",
      instagram_username: instagramUsername,
      process: proceso,
      landing_url: landingUrl || null,
      lead_created: created
    }
  });

  if (touchpointError) {
    console.error("No se pudo registrar el touchpoint del MAPA:", touchpointError.message);
  }

  await refreshMarketingIntelligence(null, created ? "lead_created" : "manual", [leadId]).catch((cause) => {
    console.error(
      "No se pudo actualizar la inteligencia del lead del MAPA:",
      cause instanceof Error ? cause.message : cause
    );
  });

  return NextResponse.json({
    ok: true,
    lead_id: leadId,
    created,
    google_sheets_url: GOOGLE_SHEETS_URL,
    excel_download_url: EXCEL_DOWNLOAD_URL
  });
}
