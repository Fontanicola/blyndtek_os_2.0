import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";
import type { IncidentSeverity, TechEventInput, TechOpsDatabase } from "@/types/techOps";

export type TechOpsClient = SupabaseClient<TechOpsDatabase>;

const SECRET_KEY = /(authorization|cookie|password|secret|token|api[_-]?key|dsn)/i;
const SECRET_VALUE = /((?:authorization|password|secret|token|api[_-]?key|cookie)\s*[=:]\s*)[^\s,;]+/gi;

export function getTechOpsClient() {
  return createAdminClient() as unknown as TechOpsClient;
}

function normalizeMessage(message: string) {
  return message
    .replace(SECRET_VALUE, "$1[REDACTED]")
    .replace(/[0-9a-f]{24,}/gi, "[ID]")
    .replace(/\b\d{4,}\b/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
}

function sanitizeMetadata(value: Record<string, unknown> | null | undefined): Json {
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value ?? {})) {
    if (SECRET_KEY.test(key)) continue;
    if (item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      result[key] = typeof item === "string" ? normalizeMessage(item).slice(0, 300) : item;
    }
  }
  return result;
}

export function eventFingerprint(input: TechEventInput) {
  const basis = [input.fuente, input.tipo, input.ruta ?? "", input.status_code ?? "", normalizeMessage(input.mensaje).slice(0, 300)].join("|");
  return crypto.createHash("sha256").update(basis).digest("hex");
}

function severityFor(input: TechEventInput): IncidentSeverity {
  if (input.nivel === "fatal") return "critica";
  if ((input.status_code ?? 0) >= 500 || input.nivel === "error") return "alta";
  if (input.nivel === "warning") return "media";
  return "baja";
}

async function resolveSystemId(client: TechOpsClient, input: TechEventInput) {
  if (input.sistema_id) return input.sistema_id;
  if (!input.proyecto_externo_id) return null;
  const { data } = await client
    .from("sistemas_gestionados")
    .select("id")
    .or(`vercel_project_id.eq.${input.proyecto_externo_id},supabase_project_ref.eq.${input.proyecto_externo_id}`)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function ingestTechEvent(client: TechOpsClient, rawInput: TechEventInput) {
  const sistemaId = await resolveSystemId(client, rawInput);
  const mensaje = normalizeMessage(rawInput.mensaje || "Evento sin mensaje");
  const fingerprint = rawInput.fingerprint?.slice(0, 128) || eventFingerprint({ ...rawInput, mensaje });
  const ocurridoAt = rawInput.ocurrido_at && !Number.isNaN(Date.parse(rawInput.ocurrido_at)) ? rawInput.ocurrido_at : new Date().toISOString();
  const nivel = rawInput.nivel ?? "info";
  const eventRow = {
    sistema_id: sistemaId,
    fuente: rawInput.fuente.slice(0, 80),
    tipo: rawInput.tipo.slice(0, 120),
    nivel,
    fingerprint,
    mensaje,
    ruta: rawInput.ruta?.slice(0, 500) ?? null,
    status_code: rawInput.status_code ?? null,
    duracion_ms: rawInput.duracion_ms ?? null,
    deployment_id: rawInput.deployment_id?.slice(0, 200) ?? null,
    commit_sha: rawInput.commit_sha?.slice(0, 100) ?? null,
    proyecto_externo_id: rawInput.proyecto_externo_id?.slice(0, 200) ?? null,
    metadata: sanitizeMetadata(rawInput.metadata),
    ocurrido_at: ocurridoAt
  };

  const inserted = await client.from("sistemas_eventos_tecnicos").insert(eventRow).select("*").single();
  if (inserted.error) throw inserted.error;

  const shouldOpenIncident = nivel === "error" || nivel === "fatal" || (rawInput.status_code ?? 0) >= 500;
  if (!shouldOpenIncident || !sistemaId) return { event: inserted.data, incident: null };

  const existing = await client
    .from("sistemas_incidentes")
    .select("*")
    .eq("sistema_id", sistemaId)
    .eq("fuente", rawInput.fuente)
    .eq("fingerprint", fingerprint)
    .eq("resuelto", false)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const updated = await client
      .from("sistemas_incidentes")
      .update({
        ocurrencias: Math.max(1, existing.data.ocurrencias ?? 1) + 1,
        ultima_ocurrencia_at: ocurridoAt,
        detalle: mensaje,
        deployment_id: eventRow.deployment_id,
        commit_sha: eventRow.commit_sha,
        metadata: eventRow.metadata
      })
      .eq("id", existing.data.id)
      .select("*")
      .single();
    if (updated.error) throw updated.error;
    return { event: inserted.data, incident: updated.data };
  }

  const created = await client
    .from("sistemas_incidentes")
    .insert({
      sistema_id: sistemaId,
      tipo: rawInput.tipo.slice(0, 120),
      severidad: severityFor(rawInput),
      titulo: `${rawInput.fuente}: ${mensaje.slice(0, 140)}`,
      detalle: mensaje,
      fuente: rawInput.fuente.slice(0, 80),
      fingerprint,
      ocurrencias: 1,
      primera_ocurrencia_at: ocurridoAt,
      ultima_ocurrencia_at: ocurridoAt,
      ruta: eventRow.ruta,
      deployment_id: eventRow.deployment_id,
      commit_sha: eventRow.commit_sha,
      metadata: eventRow.metadata,
      estado: "abierto",
      resuelto: false
    })
    .select("*")
    .single();
  if (created.error) throw created.error;
  return { event: inserted.data, incident: created.data };
}

export function isTechOpsRequestAuthorized(request: Request) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = process.env.TECH_OPS_INGEST_SECRET ?? process.env.CRON_SECRET ?? "";
  if (!supplied || !expected || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
