import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type {
  CronistaMetricasReporte,
  CronistaPeriodo,
  CronistaReporteContenido
} from "@/lib/agentes/cronista-reportes";
import type { CronistaReporteTipo } from "@/types/agentes";

const MARGIN = 52;
const WIDTH = 491;
const ACTION = "#263a6d";
const ACCENT = "#dfeeff";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#cbd5e1";
const REGULAR_FONT = path.join(process.cwd(), "public/fonts/DMSans-Regular.ttf");
const BOLD_FONT = path.join(process.cwd(), "public/fonts/DMSans-Bold.ttf");

function registerFonts(doc: PDFKit.PDFDocument) {
  if (!fs.existsSync(REGULAR_FONT) || !fs.existsSync(BOLD_FONT)) {
    throw new Error("No se encontraron las fuentes DM Sans para generar el reporte.");
  }
  doc.registerFont("DMSans", REGULAR_FONT);
  doc.registerFont("DMSansBold", BOLD_FONT);
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - 56) {
    doc.addPage();
  }
}

function paragraph(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  doc.font("DMSans").fontSize(9.6).fillColor(MUTED).text(text, { lineGap: 3.5, ...options });
}

function section(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 80);
  doc.moveDown(1.1);
  doc.font("DMSansBold").fontSize(13).fillColor(INK).text(title);
  doc.moveDown(0.35);
  doc.strokeColor(BORDER).lineWidth(0.7).moveTo(MARGIN, doc.y).lineTo(MARGIN + WIDTH, doc.y).stroke();
  doc.moveDown(0.6);
}

function bulletList(doc: PDFKit.PDFDocument, values: string[], empty: string) {
  const items = values.length > 0 ? values : [empty];
  for (const item of items) {
    ensureSpace(doc, 42);
    const y = doc.y + 4;
    doc.circle(MARGIN + 3, y, 1.8).fill(ACTION);
    doc.x = MARGIN + 14;
    paragraph(doc, item, { width: WIDTH - 14 });
    doc.x = MARGIN;
    doc.moveDown(0.2);
  }
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function metric(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, width = 145) {
  doc.font("DMSans").fontSize(8).fillColor(MUTED).text(label, x, y, { width });
  doc.font("DMSansBold").fontSize(15).fillColor(INK).text(value, x, y + 15, { width });
}

export async function generarCronistaReportePdf(params: {
  tipo: CronistaReporteTipo;
  periodo: CronistaPeriodo;
  metricas: CronistaMetricasReporte;
  contenido: CronistaReporteContenido;
}) {
  const { tipo, periodo, metricas, contenido } = params;
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    autoFirstPage: false,
    font: null as unknown as string,
    bufferPages: true,
    info: {
      Title: `Reporte ${tipo} de socios — ${periodo.etiqueta}`,
      Author: "Blyndtek",
      Subject: "Memoria organizacional confidencial"
    }
  });
  registerFonts(doc);
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.addPage();
  doc.rect(0, 0, doc.page.width, 112).fill(ACTION);
  doc.font("DMSansBold").fontSize(19).fillColor("#ffffff").text("blyndtek", MARGIN, 31);
  doc.font("DMSans").fontSize(9).fillColor("#ffffff").text("memoria organizacional · documento de socios", MARGIN, 58);
  doc.font("DMSansBold").fontSize(9).fillColor("#ffffff").text("confidencial", 430, 39, { width: 112, align: "right" });

  doc.x = MARGIN;
  doc.y = 142;
  doc.font("DMSansBold").fontSize(23).fillColor(INK).text(`reporte ${tipo}`);
  doc.moveDown(0.25);
  doc.font("DMSans").fontSize(10).fillColor(MUTED).text(`${periodo.inicio} — ${periodo.fin} · ${periodo.etiqueta}`);

  doc.moveDown(1.2);
  const metricsY = doc.y;
  doc.roundedRect(MARGIN, metricsY, WIDTH, 78, 6).fillAndStroke(ACCENT, BORDER);
  metric(doc, MARGIN + 16, metricsY + 15, "leads nuevos", String(metricas.comercial.leads_nuevos));
  metric(doc, MARGIN + 174, metricsY + 15, "resultado del período", money(metricas.financiero.resultado_caja_periodo_usd));
  metric(doc, MARGIN + 333, metricsY + 15, "features completas", String(metricas.delivery.features_completadas));
  doc.x = MARGIN;
  doc.y = metricsY + 98;

  section(doc, "qué pasó");
  bulletList(doc, contenido.que_paso, "No hubo hechos con contexto suficiente para consolidar.");
  section(doc, "qué se decidió");
  bulletList(doc, contenido.decisiones, "No hay decisiones documentadas en las fuentes del período.");
  section(doc, "qué se aprendió");
  bulletList(doc, contenido.aprendizajes, "No hay aprendizajes documentados en las fuentes del período.");
  section(doc, "qué quedó pendiente");
  bulletList(doc, contenido.pendientes, "No hay pendientes documentados en las fuentes del período.");
  section(doc, "lectura interpretativa");
  paragraph(doc, contenido.lectura_interpretativa);
  ensureSpace(doc, 160);
  section(doc, "evolución por área");
  bulletList(doc, [
    `Comercial: ${contenido.evolucion_por_area.comercial}`,
    `Finanzas: ${contenido.evolucion_por_area.finanzas}`,
    `Delivery: ${contenido.evolucion_por_area.delivery}`
  ], "Sin contexto suficiente.");

  ensureSpace(doc, 170);
  section(doc, "métricas duras");
  bulletList(doc, [
    `Comercial: ${metricas.comercial.leads_nuevos} leads nuevos, ${metricas.comercial.diagnosticos_ejecutados} diagnósticos, ${metricas.comercial.cierres} cierres y pipeline actual de ${money(metricas.comercial.pipeline_actual_usd)}.`,
    `Finanzas: ${money(metricas.financiero.ingresos_cobrados_usd)} cobrados, ${money(metricas.financiero.egresos_pagados_usd)} pagados, caja actual de ${money(metricas.financiero.caja_actual_usd)} y runway ${metricas.financiero.runway_estado === "estable" ? "estable" : `${metricas.financiero.runway_actual_meses ?? "sin dato"} meses`}.`,
    `Delivery: ${metricas.delivery.features_completadas} features completas, ${metricas.delivery.fases_entregadas} fases entregadas y ${metricas.delivery.incidentes_sistemas} incidentes.`
  ], "Sin métricas disponibles.");

  const pages = doc.bufferedPageRange();
  for (let page = 0; page < pages.count; page += 1) {
    doc.switchToPage(page);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const footerY = doc.page.height - 34;
    doc.strokeColor(BORDER).lineWidth(0.6).moveTo(MARGIN, footerY - 8).lineTo(MARGIN + WIDTH, footerY - 8).stroke();
    doc.font("DMSans").fontSize(7.5).fillColor(MUTED).text("blyndtek · sólo socios · confidencial", MARGIN, footerY, {
      width: 300,
      lineBreak: false
    });
    doc.text(`${page + 1} / ${pages.count}`, MARGIN + 390, footerY, {
      width: 100,
      align: "right",
      lineBreak: false
    });
    doc.page.margins.bottom = originalBottomMargin;
  }

  doc.end();
  return completed;
}
