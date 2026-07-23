import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import {
  fetchDiagnosticoInforme,
  formatInformeCurrency,
  sanitizePdfFilename
} from "@/lib/diagnostico/informe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    token: string;
  };
};

function writeSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#0B0E14").text(title);
  doc.moveDown(0.45);
  doc.strokeColor("#EAECF0").lineWidth(1).moveTo(56, doc.y).lineTo(540, doc.y).stroke();
  doc.moveDown(0.8);
}

function writeParagraph(doc: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) {
  doc.font("Helvetica").fontSize(10.5).fillColor("#5A6373").text(text, {
    lineGap: 4,
    ...options
  });
}

function writeKeyValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font("Helvetica").fontSize(9.5).fillColor("#5A6373").text(label);
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0B0E14").text(value);
}

async function renderPdf(token: string) {
  const informe = await fetchDiagnosticoInforme(token);

  if (!informe) {
    return null;
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 56,
    info: {
      Title: `Informe diagnóstico - ${informe.empresa}`,
      Author: "Blyndtek"
    }
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.rect(0, 0, doc.page.width, 92).fill("#F5F6FA");
  doc.fillColor("#0B0E14").font("Helvetica-Bold").fontSize(18).text("Blyndtek", 56, 34);
  doc.font("Helvetica").fontSize(10).fillColor("#5A6373").text("Informe de diagnóstico y propuesta", 56, 58);

  doc.y = 128;
  doc.font("Helvetica-Bold").fontSize(26).fillColor("#0B0E14").text(`Propuesta de sistema para ${informe.empresa}`, {
    lineGap: 5
  });
  doc.moveDown(0.75);
  writeParagraph(
    doc,
    "A partir de las respuestas del diagnóstico, identificamos los principales puntos de fricción operativa y armamos una propuesta de módulos para ordenar la gestión con un sistema a medida."
  );

  doc.moveDown(1.4);
  const summaryY = doc.y;
  doc.roundedRect(56, summaryY, 152, 82, 8).fillAndStroke("#E8EEFF", "#D8DBE3");
  doc.roundedRect(222, summaryY, 152, 82, 8).fillAndStroke("#FFFFFF", "#EAECF0");
  doc.roundedRect(388, summaryY, 152, 82, 8).fillAndStroke("#FFFFFF", "#EAECF0");
  doc.y = summaryY + 18;
  doc.x = 74;
  writeKeyValue(doc, "Inversión estimada", formatInformeCurrency(informe.precio_ideal_desarrollo));
  doc.y = summaryY + 18;
  doc.x = 240;
  writeKeyValue(doc, "Módulos", informe.modulos.length.toString());
  doc.y = summaryY + 18;
  doc.x = 406;
  writeKeyValue(doc, "Mensual", informe.precio_ideal_mensual > 0 ? formatInformeCurrency(informe.precio_ideal_mensual) : "No aplica");

  doc.x = 56;
  doc.y = summaryY + 108;
  writeSectionTitle(doc, "Lo que encontramos");

  informe.hallazgos.forEach((hallazgo, index) => {
    doc.font("Helvetica-Bold").fontSize(11.5).fillColor("#0B0E14").text(`${index + 1}. ${hallazgo.hallazgo}`, {
      lineGap: 3
    });
    doc.moveDown(0.25);
    writeParagraph(doc, `Impacto: ${hallazgo.impacto}`);
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0B0E14").text(`Qué resolvería: ${hallazgo.que_resolveria}`, {
      lineGap: 3
    });
    doc.moveDown(0.85);
  });

  writeSectionTitle(doc, "Nuestra propuesta");

  informe.modulos.forEach((modulo, index) => {
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0B0E14").text(`${index + 1}. ${modulo.nombre}`);
    if (modulo.categoria) {
      doc.font("Helvetica").fontSize(9.5).fillColor("#5A6373").text(modulo.categoria);
    }
    if (modulo.descripcion) {
      doc.moveDown(0.2);
      writeParagraph(doc, modulo.descripcion);
    }
    if (modulo.justificacion) {
      doc.moveDown(0.2);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#0B0E14").text(modulo.justificacion, { lineGap: 3 });
    }
    doc.moveDown(0.8);
  });

  writeSectionTitle(doc, "Próximo paso");
  writeParagraph(
    doc,
    "Si la dirección de la propuesta hace sentido, el siguiente paso es una llamada corta para ajustar alcance, prioridades, tiempos y forma de pago antes de cerrar el contrato final."
  );

  doc.moveDown(1.6);
  doc.font("Helvetica").fontSize(9).fillColor("#5A6373").text(
    "Documento generado por Blyndtek OS. Los precios mínimos internos no se exponen en esta propuesta pública.",
    { align: "center" }
  );

  doc.end();

  return {
    buffer: await done,
    filename: `informe-diagnostico-${sanitizePdfFilename(informe.empresa)}.pdf`
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
