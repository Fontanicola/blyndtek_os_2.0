import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";
import type { HealthCheckEstado, SistemaGestionado, SistemaGestionadoPublico, SistemaHealthCheck } from "@/types/sistemas";

export type SistemasClient = SupabaseClient<Database>;

export function maskManagementToken(token: string | null | undefined) {
  if (!token) return null;
  return token.length <= 4 ? `••••${token}` : `••••••••${token.slice(-4)}`;
}

export function toPublicSistema(sistema: SistemaGestionado): SistemaGestionadoPublico {
  const { management_token, ...safeSistema } = sistema;
  return { ...safeSistema, management_token_masked: maskManagementToken(management_token) };
}

export function generateManagementToken() {
  return `bly_${crypto.randomBytes(32).toString("hex")}`;
}

export function normalizeBaseUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isServiceRoleRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.CRON_SECRET;
  return Boolean(token && expected && token === expected);
}

export function getSistemaClient() {
  return createAdminClient() as SistemasClient;
}

export async function getSistemaForServer(supabase: SistemasClient, id: string) {
  const result = await supabase.from("sistemas_gestionados").select("*").eq("id", id).maybeSingle();
  return result;
}

export type HealthCheckResult = {
  check: Omit<SistemaHealthCheck, "id" | "sistema_id" | "checked_at">;
  causa: string | null;
};

export async function requestSistemaStatus(sistema: SistemaGestionado): Promise<HealthCheckResult> {
  const baseUrl = normalizeBaseUrl(sistema.url_produccion);
  if (!baseUrl || !sistema.management_token) {
    return {
      check: { estado: "caido", latencia_ms: null, db_ok: false, detalle: "Sistema sin URL de producción o token de management configurado." },
      causa: "configuracion_incompleta"
    };
  }

  const configuredEndpoint = sistema.management_endpoint?.trim() || "/api/blyndtek/status";
  const endpoint = configuredEndpoint.startsWith("http")
    ? normalizeBaseUrl(configuredEndpoint)
    : `${baseUrl}${configuredEndpoint.startsWith("/") ? configuredEndpoint : `/${configuredEndpoint}`}`;
  if (!endpoint) {
    return {
      check: { estado: "caido", latencia_ms: null, db_ok: false, detalle: "Endpoint de management inválido." },
      causa: "configuracion_incompleta"
    };
  }
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${sistema.management_token}`, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store"
    });
    const latency = Date.now() - startedAt;
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    const clientState = typeof payload?.estado === "string" ? payload.estado : null;
    const dbOk = typeof payload?.db_ok === "boolean" ? payload.db_ok : response.ok;
    const ok = response.ok && (clientState === null || clientState === "ok" || clientState === "operativo") && dbOk;
    const estado: HealthCheckEstado = ok ? "ok" : response.status >= 500 ? "caido" : "degradado";
    const detalle = ok ? null : `Respuesta ${response.status}${clientState ? ` (${clientState})` : ""}.`;
    return { check: { estado, latencia_ms: latency, db_ok: dbOk, detalle }, causa: ok ? null : `${estado}:${response.status}:${clientState ?? "sin_estado"}` };
  } catch (error) {
    const latency = Date.now() - startedAt;
    const detail = error instanceof Error && error.name === "AbortError" ? "Timeout al consultar el sistema." : error instanceof Error ? error.message : "No se pudo consultar el sistema.";
    return { check: { estado: "caido", latencia_ms: latency, db_ok: false, detalle: detail.slice(0, 500) }, causa: `caido:${detail.slice(0, 200)}` };
  } finally {
    clearTimeout(timeout);
  }
}

export async function persistHealthCheck(supabase: SistemasClient, sistema: SistemaGestionado, result: HealthCheckResult) {
  const inserted = await supabase.from("sistemas_health_checks").insert({ sistema_id: sistema.id, ...result.check }).select("*").single();
  if (inserted.error) return { inserted, incidentError: inserted.error };

  if (result.check.estado === "ok") {
    const resolved = await supabase.from("sistemas_incidentes").update({ resuelto: true, resuelto_at: new Date().toISOString() }).eq("sistema_id", sistema.id).eq("resuelto", false).neq("tipo", "error_reportado");
    return { inserted, incidentError: resolved.error };
  }

  const title = `Health check ${result.check.estado}: ${sistema.nombre}`;
  const existing = await supabase.from("sistemas_incidentes").select("id").eq("sistema_id", sistema.id).eq("resuelto", false).eq("tipo", result.causa ?? result.check.estado).limit(1).maybeSingle();
  if (existing.error) return { inserted, incidentError: existing.error };
  if (!existing.data) {
    const created = await supabase.from("sistemas_incidentes").insert({ sistema_id: sistema.id, tipo: result.causa ?? result.check.estado, severidad: result.check.estado === "caido" ? "alta" : "media", titulo: title, detalle: result.check.detalle });
    return { inserted, incidentError: created.error };
  }
  return { inserted, incidentError: null };
}
