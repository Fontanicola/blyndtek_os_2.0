import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getTechOpsClient, ingestTechEvent } from "@/lib/observability/tech-ops";
import type { TechEventInput, TechEventLevel } from "@/types/techOps";

export const runtime = "nodejs";

function verifySignature(body: string, signature: string | null) {
  const secret = process.env.VERCEL_DRAIN_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha1", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toIso(value: unknown) {
  if (typeof value === "number") return new Date(value < 10_000_000_000 ? value * 1000 : value).toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  return new Date().toISOString();
}

function mapEvent(value: unknown): TechEventInput | null {
  const event = asRecord(value);
  const status = number(event.responseStatusCode) ?? number(event.statusCode) ?? number(event.status);
  const rawLevel = text(event.level)?.toLowerCase();
  const level: TechEventLevel = rawLevel === "fatal" ? "fatal" : rawLevel === "error" ? "error" : rawLevel === "warning" || rawLevel === "warn" ? "warning" : "info";
  if (level !== "error" && level !== "fatal" && (status ?? 0) < 500) return null;
  const message = text(event.message) ?? text(event.text) ?? `Respuesta ${status ?? "sin estado"}`;
  return {
    fuente: "vercel",
    tipo: status && status >= 500 ? `http_${status}` : "runtime_error",
    nivel: status && status >= 500 && level === "info" ? "error" : level,
    mensaje: message,
    ruta: text(event.requestPath) ?? text(event.path) ?? text(event.route),
    status_code: status,
    duracion_ms: number(event.durationMs) ?? number(event.duration),
    deployment_id: text(event.deploymentId),
    commit_sha: text(event.commitSha) ?? text(event.gitCommitSha),
    proyecto_externo_id: text(event.projectId),
    ocurrido_at: toIso(event.timestamp),
    metadata: {
      environment: text(event.environment),
      source: text(event.source),
      requestMethod: text(event.requestMethod),
      branch: text(event.branch),
      traceId: text(event.traceId)
    }
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifySignature(body, request.headers.get("x-vercel-signature"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    return NextResponse.json({ error: "Payload JSON inválido." }, { status: 400 });
  }
  const source = Array.isArray(parsed) ? parsed : [parsed];
  const events = source.slice(0, 100).map(mapEvent).filter((item): item is TechEventInput => item !== null);
  const client = getTechOpsClient();
  for (const event of events) await ingestTechEvent(client, event);
  return NextResponse.json({ data: { recibidos: source.length, almacenados: events.length } });
}
