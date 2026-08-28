import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { calculateMapaResult, isMapaAnswers, MAPA_CAMPAIGN_KEY, MAPA_LEAK_LABELS, type MapaLeakKey } from "@/lib/marketing/mapa-fugas";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: { token: string } };
const MARGIN = 52;
const WIDTH = 491;
const INK = "#0B1730";
const SIGNAL = "#314A86";
const MUTED = "#667085";
const LINE = "#E4E7EC";
const REGULAR_FONT = path.join(process.cwd(), "public/fonts/DMSans-Regular.ttf");
const BOLD_FONT = path.join(process.cwd(), "public/fonts/DMSans-Bold.ttf");

function registerFonts(doc: PDFKit.PDFDocument) {
  if (!fs.existsSync(REGULAR_FONT) || !fs.existsSync(BOLD_FONT)) throw new Error("No se encontraron las fuentes del PDF.");
  doc.registerFont("DMSans", REGULAR_FONT);
  doc.registerFont("DMSansBold", BOLD_FONT);
}

function sanitizeFilename(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resultado";
}

function metric(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, accent = false) {
  doc.roundedRect(x, y, 151, 76, 10).fillAndStroke(accent ? "#EAF0FF" : "#FFFFFF", accent ? "#C6D5FF" : LINE);
  doc.font("DMSans").fontSize(8.2).fillColor(MUTED).text(label, x + 14, y + 14, { width: 123 });
  doc.font("DMSansBold").fontSize(17).fillColor(INK).text(value, x + 14, y + 34, { width: 123 });
}

async function renderPdf(request: NextRequest, token: string) {
  const db = createUntypedAdminClient();
  const { data: event, error } = await db.from("marketing_touchpoints")
    .select("lead_id,occurred_at,metadata")
    .eq("source_key", `instagram:mapa-result:${token}`).maybeSingle();
  if (error || !event) return null;

  const metadata = event.metadata as Record<string, unknown>;
  if (!isMapaAnswers(metadata.answers)) return null;
  const result = calculateMapaResult(metadata.answers);
  const { data: lead } = await db.from("leads").select("empresa,contacto_1_nombre").eq("id", event.lead_id).maybeSingle();
  const name = lead?.contacto_1_nombre || "Tu equipo";
  const company = lead?.empresa || name;
  const ctaUrl = `${new URL(request.url).origin}/api/public/mapa-fugas/${token}/cta`;

  const doc = new PDFDocument({ size: "A4", margin: MARGIN, autoFirstPage: false, font: null as unknown as string, info: { Title: `Diagnóstico MAPA - ${company}`, Author: "Blyndtek", Subject: "Mapa de fugas operativas" } });
  registerFonts(doc);
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.addPage();
  doc.rect(0, 0, doc.page.width, 128).fill(INK);
  doc.font("DMSansBold").fontSize(20).fillColor("#FFFFFF").text("Blyndtek", MARGIN, 34);
  doc.font("DMSans").fontSize(9).fillColor("#B9C7E5").text("DIAGNÓSTICO MAPA · FUGAS OPERATIVAS", MARGIN, 66);
  doc.font("DMSans").fontSize(8.5).fillColor("#B9C7E5").text(new Date(event.occurred_at).toLocaleDateString("es-AR"), 420, 42, { width: 123, align: "right" });

  doc.font("DMSansBold").fontSize(23).fillColor(INK).text(`Resultado para ${company}`, MARGIN, 158, { width: WIDTH });
  doc.font("DMSans").fontSize(10).fillColor(MUTED).text(`${name} · Proceso analizado: ${result.proceso}`, MARGIN, 193, { width: WIDTH });
  metric(doc, MARGIN, 225, "TIEMPO PERDIDO", `${result.horas_mensuales} h/mes`, true);
  metric(doc, MARGIN + 170, 225, "CRITICIDAD", result.severidad.toUpperCase());
  metric(doc, MARGIN + 340, 225, "COSTO ESTIMADO", result.costo_mensual === null ? "No informado" : new Intl.NumberFormat("es-AR", { style: "currency", currency: result.moneda, maximumFractionDigits: 0 }).format(result.costo_mensual));

  doc.font("DMSansBold").fontSize(14).fillColor(INK).text("Cómo se distribuye la fuga", MARGIN, 334);
  let y = 369;
  const maxHours = Math.max(...Object.values(result.horas_por_fuga), 1);
  (Object.entries(result.horas_por_fuga) as Array<[MapaLeakKey, number]>).forEach(([key, hours]) => {
    doc.font("DMSans").fontSize(9.2).fillColor(INK).text(MAPA_LEAK_LABELS[key], MARGIN, y, { width: 250 });
    doc.font("DMSansBold").fontSize(9.2).fillColor(INK).text(`${hours} h/mes`, 430, y, { width: 112, align: "right" });
    doc.roundedRect(MARGIN, y + 17, WIDTH, 7, 3.5).fill("#EEF1F6");
    doc.roundedRect(MARGIN, y + 17, Math.max(18, WIDTH * (hours / maxHours)), 7, 3.5).fill(SIGNAL);
    y += 49;
  });

  doc.roundedRect(MARGIN, 521, WIDTH, 112, 12).fillAndStroke("#F5F7FB", LINE);
  doc.font("DMSans").fontSize(8.2).fillColor(SIGNAL).text("DÓNDE MIRAR PRIMERO", MARGIN + 18, 541);
  doc.font("DMSansBold").fontSize(14).fillColor(INK).text(MAPA_LEAK_LABELS[result.fuga_principal], MARGIN + 18, 562);
  doc.font("DMSans").fontSize(9.4).fillColor(MUTED).text(result.recomendacion, MARGIN + 18, 587, { width: WIDTH - 36, lineGap: 3 });

  doc.roundedRect(MARGIN, 658, WIDTH, 112, 12).fill(INK);
  doc.font("DMSansBold").fontSize(14).fillColor("#FFFFFF").text(result.cta_titulo, MARGIN + 18, 678, { width: WIDTH - 36 });
  doc.font("DMSans").fontSize(9.2).fillColor("#C7D2E8").text(result.cta_texto, MARGIN + 18, 704, { width: WIDTH - 36, lineGap: 2 });
  doc.roundedRect(MARGIN + 18, 738, 224, 22, 7).fill("#FFFFFF");
  doc.font("DMSansBold").fontSize(8.5).fillColor(INK).text(result.cta_etiqueta, MARGIN + 27, 745, { width: 206, align: "center", link: ctaUrl, underline: false });
  doc.link(MARGIN + 18, 738, 224, 22, ctaUrl);

  doc.font("DMSans").fontSize(7.5).fillColor(MUTED).text("Estimación orientativa basada en los datos ingresados. Blyndtek · sistema.blyndtek.com", MARGIN, 802, { width: WIDTH, align: "center" });
  doc.end();

  await db.from("marketing_touchpoints").upsert({
    source_key: `instagram:mapa-pdf:${token}`,
    lead_id: event.lead_id,
    channel: "instagram",
    event_name: "diagnostic_pdf_downloaded",
    campaign_id: MAPA_CAMPAIGN_KEY,
    session_id: token,
    occurred_at: new Date().toISOString(),
    metadata: { resource: "mapa_fugas_interactivo", severity: result.severidad }
  }, { onConflict: "source_key" });

  return { buffer: await completed, filename: `diagnostico-mapa-${sanitizeFilename(company)}.pdf` };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const pdf = await renderPdf(request, params.token.trim());
    if (!pdf) return NextResponse.json({ error: "Resultado no disponible." }, { status: 404 });
    return new NextResponse(pdf.buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${pdf.filename}"`, "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("No se pudo generar el PDF del MAPA:", cause);
    return NextResponse.json({ error: "No pudimos generar el PDF." }, { status: 500 });
  }
}
