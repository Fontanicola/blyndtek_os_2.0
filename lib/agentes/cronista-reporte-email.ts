import type { CronistaPeriodo, CronistaReporteContenido } from "@/lib/agentes/cronista-reportes";
import type { CronistaReporteTipo } from "@/types/agentes";

function requiredServerEnv(name: "RESEND_API_KEY" | "RESEND_FROM_EMAIL" | "CRONISTA_SOCIOS_EMAILS") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable server-side ${name}.`);
  }
  return value;
}

function sociosRecipients() {
  const recipients = Array.from(new Set(
    requiredServerEnv("CRONISTA_SOCIOS_EMAILS")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  ));
  if (recipients.length === 0 || recipients.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new Error("CRONISTA_SOCIOS_EMAILS contiene destinatarios inválidos.");
  }
  return recipients;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character] ?? character);
}

function list(items: string[], empty: string) {
  const values = items.length > 0 ? items : [empty];
  return `<ul>${values.map((item) => `<li style="margin:0 0 8px">${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function htmlReport(tipo: CronistaReporteTipo, periodo: CronistaPeriodo, contenido: CronistaReporteContenido) {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif"><div style="max-width:680px;margin:0 auto;padding:32px 20px"><div style="background:#263a6d;color:#fff;padding:24px;border-radius:6px 6px 0 0"><div style="font-size:20px;font-weight:700">blyndtek</div><div style="font-size:12px;margin-top:5px">memoria organizacional · sólo socios · confidencial</div></div><div style="background:#fff;border:1px solid #cbd5e1;border-top:0;padding:28px"><h1 style="font-size:24px;margin:0 0 4px">reporte ${tipo}</h1><p style="color:#64748b;margin:0 0 28px">${periodo.inicio} — ${periodo.fin} · ${periodo.etiqueta}</p><h2 style="font-size:16px">qué pasó</h2>${list(contenido.que_paso, "No hubo hechos con contexto suficiente para consolidar.")}<h2 style="font-size:16px">qué se decidió</h2>${list(contenido.decisiones, "No hay decisiones documentadas.")}<h2 style="font-size:16px">qué se aprendió</h2>${list(contenido.aprendizajes, "No hay aprendizajes documentados.")}<h2 style="font-size:16px">qué quedó pendiente</h2>${list(contenido.pendientes, "No hay pendientes documentados.")}<h2 style="font-size:16px">lectura interpretativa</h2><p style="line-height:1.55">${escapeHtml(contenido.lectura_interpretativa)}</p><p style="color:#64748b;font-size:12px;margin-top:28px">El PDF adjunto contiene el reporte completo y sus métricas duras.</p></div></div></body></html>`;
}

export async function enviarReporteSocios(params: {
  reporteId: string;
  tipo: CronistaReporteTipo;
  periodo: CronistaPeriodo;
  contenido: CronistaReporteContenido;
  pdf: Buffer;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredServerEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `cronista-${params.tipo}-${params.reporteId}`
    },
    body: JSON.stringify({
      from: requiredServerEnv("RESEND_FROM_EMAIL"),
      to: sociosRecipients(),
      subject: `Blyndtek · reporte ${params.tipo} · ${params.periodo.etiqueta}`,
      html: htmlReport(params.tipo, params.periodo, params.contenido),
      attachments: [{
        filename: `blyndtek-reporte-${params.tipo}-${params.periodo.etiqueta}.pdf`,
        content: params.pdf.toString("base64")
      }],
      tags: [
        { name: "agente", value: "cronista" },
        { name: "tipo", value: params.tipo }
      ]
    })
  });
  const payload = await response.json().catch(() => null) as { id?: string; message?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.message ?? payload?.error?.message ?? `Resend respondió HTTP ${response.status}.`);
  }
  return payload.id;
}
