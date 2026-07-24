import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import {
  fetchDiagnosticoInforme,
  formatInformeCurrency,
  sanitizePdfFilename
} from "@/lib/diagnostico/informe";
import type { ModuloInforme } from "@/lib/diagnostico/informe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    token: string;
  };
};

const PAGE_MARGIN = 54;
const FONT_REGULAR_PATH = path.join(process.cwd(), "public/fonts/DMSans-Regular.ttf");
const FONT_BOLD_PATH = path.join(process.cwd(), "public/fonts/DMSans-Bold.ttf");

function registerFonts(doc: PDFKit.PDFDocument) {
  if (!fs.existsSync(FONT_REGULAR_PATH) || !fs.existsSync(FONT_BOLD_PATH)) {
    throw new Error("No se encontraron las fuentes DM Sans necesarias para generar el PDF.");
  }

  doc.registerFont("DMSans", FONT_REGULAR_PATH);
  doc.registerFont("DMSansBold", FONT_BOLD_PATH);
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight = 120) {
  const bottom = doc.page.height - doc.page.margins.bottom;

  if (doc.y + neededHeight > bottom) {
    doc.addPage();
  }
}

function writeSectionTitle(doc: PDFKit.PDFDocument, eyebrow: string, title: string) {
  ensureSpace(doc, 120);
  doc.moveDown(1.1);
  doc.font("DMSansBold").fontSize(9).fillColor("#5A6373").text(eyebrow);
  doc.moveDown(0.25);
  doc.font("DMSansBold").fontSize(18).fillColor("#0B0E14").text(title, { lineGap: 2 });
  doc.moveDown(0.55);
  doc.strokeColor("#EAECF0").lineWidth(1).moveTo(PAGE_MARGIN, doc.y).lineTo(541, doc.y).stroke();
  doc.moveDown(0.75);
}

function writeParagraph(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  doc.font("DMSans").fontSize(10.2).fillColor("#5A6373").text(text, {
    lineGap: 4,
    ...options
  });
}

function writeBulletList(doc: PDFKit.PDFDocument, items: string[]) {
  items.filter(Boolean).forEach((item) => {
    ensureSpace(doc, 46);
    const startY = doc.y + 4;
    doc.circle(PAGE_MARGIN + 4, startY, 2).fill("#2563EB");
    doc.x = PAGE_MARGIN + 16;
    doc.y = doc.y;
    writeParagraph(doc, item, { width: 466 });
    doc.x = PAGE_MARGIN;
    doc.moveDown(0.25);
  });
}

function writeKeyValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.font("DMSans").fontSize(8.8).fillColor("#5A6373").text(label, x, y, { width });
  doc.font("DMSansBold").fontSize(17).fillColor("#0B0E14").text(value, x, y + 18, { width });
}

function writeCallout(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 110);
  const y = doc.y;
  doc.roundedRect(PAGE_MARGIN, y, 487, 78, 8).fillAndStroke("#F5F6FA", "#EAECF0");
  doc.y = y + 18;
  doc.x = PAGE_MARGIN + 18;
  doc.font("DMSansBold").fontSize(11).fillColor("#0B0E14").text(text, {
    width: 451,
    lineGap: 4
  });
  doc.x = PAGE_MARGIN;
  doc.y = y + 96;
}

function writeModule(doc: PDFKit.PDFDocument, modulo: ModuloInforme, index: number) {
  ensureSpace(doc, 190);
  const y = doc.y;
  doc.roundedRect(PAGE_MARGIN, y, 487, 34, 8).fill("#F5F6FA");
  doc.font("DMSansBold").fontSize(12.5).fillColor("#0B0E14").text(`${index + 1}. ${modulo.nombre}`, PAGE_MARGIN + 14, y + 10, {
    width: 335
  });
  if (modulo.prioridad || modulo.tiempo_estimado_semanas) {
    const meta = [
      modulo.prioridad ? `Prioridad ${modulo.prioridad}` : null,
      modulo.tiempo_estimado_semanas ? `${modulo.tiempo_estimado_semanas} sem.` : null
    ]
      .filter(Boolean)
      .join(" · ");
    doc.font("DMSans").fontSize(8.5).fillColor("#5A6373").text(meta, 405, y + 11, { width: 120, align: "right" });
  }

  doc.x = PAGE_MARGIN;
  doc.y = y + 48;
  if (modulo.descripcion) {
    writeParagraph(doc, modulo.descripcion);
    doc.moveDown(0.35);
  }
  if (modulo.problema_resuelve) {
    doc.font("DMSansBold").fontSize(10).fillColor("#0B0E14").text("Problema que resuelve");
    writeParagraph(doc, modulo.problema_resuelve);
    doc.moveDown(0.25);
  }
  if (modulo.impacto_esperado) {
    doc.font("DMSansBold").fontSize(10).fillColor("#0B0E14").text("Impacto esperado");
    writeParagraph(doc, modulo.impacto_esperado);
    doc.moveDown(0.25);
  }
  if (modulo.funcionalidades && modulo.funcionalidades.length > 0) {
    doc.font("DMSansBold").fontSize(10).fillColor("#0B0E14").text("Funcionalidades incluidas");
    doc.moveDown(0.15);
    writeBulletList(doc, modulo.funcionalidades.slice(0, 6));
  }
  if (modulo.justificacion) {
    doc.font("DMSansBold").fontSize(9.5).fillColor("#0B0E14").text(`Por qué aplica: ${modulo.justificacion}`, {
      lineGap: 3
    });
  }
  doc.moveDown(0.8);
}

async function renderPdf(token: string) {
  const informe = await fetchDiagnosticoInforme(token);

  if (!informe) {
    return null;
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    autoFirstPage: false,
    font: null as unknown as string,
    info: {
      Title: `Diagnóstico y propuesta - ${informe.empresa}`,
      Author: "Blyndtek"
    }
  });
  registerFonts(doc);
  doc.addPage({ size: "A4", margin: PAGE_MARGIN });
  doc.font("DMSans");

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.rect(0, 0, doc.page.width, 112).fill("#F5F6FA");
  doc.font("DMSansBold").fontSize(20).fillColor("#0B0E14").text("Blyndtek", PAGE_MARGIN, 34);
  doc.font("DMSans").fontSize(10).fillColor("#5A6373").text("Diagnóstico de empresa y propuesta de software", PAGE_MARGIN, 61);

  doc.y = 146;
  doc.font("DMSansBold").fontSize(25).fillColor("#0B0E14").text(`Sistema a medida para ${informe.empresa}`, {
    lineGap: 4
  });
  doc.moveDown(0.8);
  writeParagraph(
    doc,
    "Este documento separa dos lecturas: primero, el diagnóstico operativo de la empresa; después, la propuesta de sistema pensada para resolver los problemas detectados y habilitar un salto digital concreto."
  );

  doc.moveDown(1.2);
  const summaryY = doc.y;
  doc.roundedRect(PAGE_MARGIN, summaryY, 152, 82, 8).fillAndStroke("#E8EEFF", "#D8DBE3");
  doc.roundedRect(222, summaryY, 152, 82, 8).fillAndStroke("#FFFFFF", "#EAECF0");
  doc.roundedRect(388, summaryY, 152, 82, 8).fillAndStroke("#FFFFFF", "#EAECF0");
  writeKeyValue(doc, "Inversión desarrollo", formatInformeCurrency(informe.precio_ideal_desarrollo), 72, summaryY + 16, 120);
  writeKeyValue(doc, "Módulos propuestos", informe.modulos.length.toString(), 238, summaryY + 16, 120);
  writeKeyValue(
    doc,
    "Mensual",
    informe.precio_ideal_mensual > 0 ? formatInformeCurrency(informe.precio_ideal_mensual) : "No aplica",
    404,
    summaryY + 16,
    120
  );

  doc.x = PAGE_MARGIN;
  doc.y = summaryY + 110;
  writeSectionTitle(doc, "Informe diagnóstico", "Lectura de la operación actual");
  writeCallout(doc, informe.diagnosticoEmpresa.resumen_ejecutivo);

  doc.font("DMSansBold").fontSize(11.5).fillColor("#0B0E14").text("Cómo opera hoy");
  doc.moveDown(0.25);
  writeParagraph(doc, informe.diagnosticoEmpresa.operativa_actual);

  writeSectionTitle(doc, "Problemas detectados", "Dónde aparece la fricción operativa");
  informe.hallazgos.forEach((hallazgo, index) => {
    ensureSpace(doc, 135);
    doc.font("DMSansBold").fontSize(11.5).fillColor("#0B0E14").text(`${index + 1}. ${hallazgo.hallazgo}`, {
      lineGap: 3
    });
    if (hallazgo.severidad) {
      doc.font("DMSans").fontSize(8.8).fillColor("#5A6373").text(`Severidad: ${hallazgo.severidad}`);
    }
    if (hallazgo.evidencia) {
      doc.moveDown(0.2);
      writeParagraph(doc, `Evidencia del diagnóstico: ${hallazgo.evidencia}`);
    }
    doc.moveDown(0.2);
    writeParagraph(doc, `Impacto: ${hallazgo.impacto}`);
    doc.moveDown(0.2);
    doc.font("DMSansBold").fontSize(10).fillColor("#0B0E14").text(`Qué resolvería: ${hallazgo.que_resolveria}`, {
      lineGap: 3
    });
    doc.moveDown(0.85);
  });

  writeSectionTitle(doc, "Costo de no cambiar", "Por qué conviene actuar ahora");
  writeParagraph(doc, informe.diagnosticoEmpresa.costo_de_no_cambiar);
  doc.moveDown(0.55);
  if (informe.diagnosticoEmpresa.oportunidades_mejora.length > 0) {
    doc.font("DMSansBold").fontSize(10.5).fillColor("#0B0E14").text("Oportunidades de mejora");
    doc.moveDown(0.25);
    writeBulletList(doc, informe.diagnosticoEmpresa.oportunidades_mejora);
  }

  writeSectionTitle(doc, "Propuesta de software", "Sistema recomendado");
  writeCallout(doc, informe.propuestaSoftware.vision_sistema);
  doc.font("DMSansBold").fontSize(11.5).fillColor("#0B0E14").text("Alcance general");
  doc.moveDown(0.25);
  writeParagraph(doc, informe.propuestaSoftware.alcance_general);

  writeSectionTitle(doc, "Módulos propuestos", "Qué tendría el sistema y qué impacto busca");
  informe.modulos.forEach((modulo, index) => writeModule(doc, modulo, index));

  writeSectionTitle(doc, "Beneficios esperados", "Qué debería mejorar al implementar");
  writeBulletList(doc, informe.propuestaSoftware.beneficios_esperados);

  writeSectionTitle(doc, "Roadmap de implementación", "Cómo avanzaríamos");
  informe.propuestaSoftware.roadmap_implementacion.forEach((etapa, index) => {
    ensureSpace(doc, 80);
    doc.font("DMSansBold").fontSize(11).fillColor("#0B0E14").text(`${index + 1}. ${etapa.etapa}`);
    doc.font("DMSans").fontSize(9).fillColor("#5A6373").text(etapa.duracion_estimada);
    doc.moveDown(0.2);
    writeParagraph(doc, etapa.descripcion);
    doc.moveDown(0.6);
  });

  if (informe.propuestaSoftware.supuestos.length > 0) {
    writeSectionTitle(doc, "Supuestos", "Condiciones consideradas para esta propuesta");
    writeBulletList(doc, informe.propuestaSoftware.supuestos);
  }

  writeSectionTitle(doc, "Próximos pasos", "Cierre comercial");
  writeBulletList(doc, informe.propuestaSoftware.proximos_pasos);

  doc.moveDown(1.4);
  doc.font("DMSans").fontSize(8.8).fillColor("#5A6373").text(
    "Documento generado por Blyndtek OS. Los precios mínimos internos no se exponen en esta propuesta pública.",
    { align: "center" }
  );

  doc.end();

  return {
    buffer: await done,
    filename: `diagnostico-propuesta-${sanitizePdfFilename(informe.empresa)}.pdf`
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const result = await renderPdf(params.token.trim());

    if (!result) {
      return NextResponse.json({ error: "Informe no disponible." }, { status: 404 });
    }

    return new NextResponse(result.buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
