import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { refreshMarketingIntelligence } from "@/lib/marketing/intelligence";
import { calculateMapaResult, isMapaAnswers, MAPA_CAMPAIGN_KEY, type MapaAnswers } from "@/lib/marketing/mapa-fugas";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
type StartBody = { action?: unknown; nombre?: unknown; email?: unknown; empresa?: unknown; consentimiento?: unknown; honeypot?: unknown; landing_url?: unknown };
type CompleteBody = { action?: unknown; token?: unknown; respuestas?: unknown };
type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

function asText(value: unknown, maxLength = 300) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getRequestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
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
  return true;
}

async function startDiagnostic(body: StartBody) {
  if (asText(body.honeypot)) return NextResponse.json({ ok: true });
  const nombre = asText(body.nombre, 120);
  const email = asText(body.email, 180).toLowerCase();
  const empresa = asText(body.empresa, 160);
  const landingUrl = asText(body.landing_url, 500);

  if (!nombre || !email) return NextResponse.json({ error: "Completá nombre y email." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  if (body.consentimiento !== true) {
    return NextResponse.json({ error: "Necesitamos tu autorización para generar y enviarte el diagnóstico." }, { status: 400 });
  }

  const db = createUntypedAdminClient();
  const occurredAt = new Date().toISOString();
  const token = randomUUID();
  const { data: existingLead, error: existingError } = await db.from("leads")
    .select("id,empresa,contacto_1_nombre,notas,contexto")
    .eq("contacto_email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (existingError) {
    console.error("No se pudo buscar el lead del MAPA:", existingError.message);
    return NextResponse.json({ error: "No pudimos iniciar el diagnóstico. Probá nuevamente." }, { status: 500 });
  }

  let leadId: string;
  let created = false;
  const note = `Lead magnet: Diagnóstico MAPA interactivo\nEmail: ${email}\nIniciado: ${occurredAt}`;

  if (existingLead) {
    leadId = existingLead.id;
    const notes = existingLead.notas?.includes("Lead magnet: Diagnóstico MAPA interactivo")
      ? existingLead.notas
      : [existingLead.notas, note].filter(Boolean).join("\n\n").slice(-8000);
    const { error } = await db.from("leads").update({
      empresa: existingLead.empresa || empresa || nombre,
      contacto_1_nombre: existingLead.contacto_1_nombre || nombre,
      contexto: existingLead.contexto || "Inició el diagnóstico MAPA desde Instagram.",
      notas: notes,
      updated_at: occurredAt
    }).eq("id", leadId);
    if (error) return NextResponse.json({ error: "No pudimos iniciar el diagnóstico. Probá nuevamente." }, { status: 500 });
  } else {
    const { data: lead, error } = await db.from("leads").insert({
      canal: "inbound",
      canal_origen: "organico",
      campana_origen: MAPA_CAMPAIGN_KEY,
      empresa: empresa || nombre,
      contacto_1_nombre: nombre,
      contacto_email: email,
      etapa: "por_contactar",
      contexto: "Inició el diagnóstico MAPA desde Instagram.",
      mensaje_inicial: "Solicitó el diagnóstico MAPA interactivo.",
      notas: note,
      utm_source: "instagram",
      utm_medium: "organic_social",
      utm_content: "reel_mapa",
      landing_url: landingUrl || null,
      formulario_version: "mapa-fugas-v2",
      consentimiento_marketing: true,
      attribution_captured_at: occurredAt
    }).select("id").single();
    if (error || !lead) {
      console.error("No se pudo crear el lead del MAPA:", error?.message || "Sin fila creada");
      return NextResponse.json({ error: "No pudimos iniciar el diagnóstico. Probá nuevamente." }, { status: 500 });
    }
    leadId = lead.id;
    created = true;
  }

  const { error: touchpointError } = await db.from("marketing_touchpoints").insert({
    source_key: `instagram:mapa-start:${token}`,
    lead_id: leadId,
    channel: "instagram",
    event_name: "diagnostic_started",
    campaign_id: MAPA_CAMPAIGN_KEY,
    session_id: token,
    occurred_at: occurredAt,
    metadata: { resource: "mapa_fugas_interactivo", landing_url: landingUrl || null, lead_created: created }
  });
  if (touchpointError) {
    console.error("No se pudo registrar el inicio del MAPA:", touchpointError.message);
    return NextResponse.json({ error: "No pudimos iniciar el diagnóstico. Probá nuevamente." }, { status: 500 });
  }

  await refreshMarketingIntelligence(null, created ? "lead_created" : "manual", [leadId]).catch(console.error);
  return NextResponse.json({ ok: true, token });
}

async function completeDiagnostic(body: CompleteBody, origin: string) {
  const token = asText(body.token, 80);
  if (!token || !isMapaAnswers(body.respuestas)) {
    return NextResponse.json({ error: "Revisá los datos del diagnóstico." }, { status: 400 });
  }

  const answers = body.respuestas as MapaAnswers;
  const db = createUntypedAdminClient();
  const { data: start, error: startError } = await db.from("marketing_touchpoints")
    .select("lead_id").eq("source_key", `instagram:mapa-start:${token}`).maybeSingle();
  if (startError || !start) {
    return NextResponse.json({ error: "La sesión venció. Volvé a iniciar el diagnóstico." }, { status: 404 });
  }

  const result = calculateMapaResult(answers);
  const occurredAt = new Date().toISOString();
  const { error: resultError } = await db.from("marketing_touchpoints").upsert({
    source_key: `instagram:mapa-result:${token}`,
    lead_id: start.lead_id,
    channel: "instagram",
    event_name: "diagnostic_completed",
    campaign_id: MAPA_CAMPAIGN_KEY,
    session_id: token,
    occurred_at: occurredAt,
    metadata: { resource: "mapa_fugas_interactivo", answers, result }
  }, { onConflict: "source_key" });
  if (resultError) {
    console.error("No se pudo guardar el resultado del MAPA:", resultError.message);
    return NextResponse.json({ error: "No pudimos calcular tu resultado. Probá nuevamente." }, { status: 500 });
  }

  await db.from("leads").update({
    contexto: `Completó el MAPA sobre ${answers.proceso}: ${result.horas_mensuales} h/mes, criticidad ${result.severidad}.`,
    mensaje_inicial: `Resultado MAPA: fuga principal ${result.fuga_principal}, ${result.horas_mensuales} h/mes.`,
    updated_at: occurredAt
  }).eq("id", start.lead_id);
  await refreshMarketingIntelligence(null, "manual", [start.lead_id]).catch(console.error);

  return NextResponse.json({
    ok: true,
    result,
    pdf_url: `${origin}/api/public/mapa-fugas/${token}/pdf`,
    cta_url: `${origin}/api/public/mapa-fugas/${token}/cta`
  });
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit(getRequestIp(request))) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un minuto y volvé a probar." }, { status: 429 });
  }
  let body: StartBody | CompleteBody;
  try {
    body = await request.json() as StartBody | CompleteBody;
  } catch {
    return NextResponse.json({ error: "No pudimos leer los datos enviados." }, { status: 400 });
  }
  const origin = new URL(request.url).origin;
  return body.action === "complete" ? completeDiagnostic(body as CompleteBody, origin) : startDiagnostic(body as StartBody);
}
