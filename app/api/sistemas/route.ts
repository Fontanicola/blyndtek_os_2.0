import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { generateManagementToken, getSistemaClient, normalizeBaseUrl, toPublicSistema } from "@/lib/sistemas";
import type { Json } from "@/types/supabase";
import type { SistemaCreateInput, SistemaGestionado, SistemaHealthCheck } from "@/types/sistemas";

const writableFields = new Set([
  "nombre", "url_produccion", "url_staging", "management_endpoint", "management_token", "proyecto_id", "cliente_id",
  "vercel_project_id", "vercel_team_id", "supabase_project_ref", "stack", "version_patrones", "estado", "monitoreo_activo"
]);

function parseBody(value: unknown, allowToken: boolean): SistemaCreateInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).some((key) => !writableFields.has(key) || (!allowToken && key === "management_token"))) return null;
  if (typeof payload.nombre !== "string" || payload.nombre.trim().length < 2 || payload.nombre.trim().length > 120) return null;

  const result: SistemaCreateInput = { nombre: payload.nombre.trim() };
  for (const key of ["url_produccion", "url_staging"] as const) {
    if (key in payload) {
      if (payload[key] !== null && typeof payload[key] !== "string") return null;
      const rawUrl = payload[key] as string | null;
      const url = rawUrl === null ? null : normalizeBaseUrl(rawUrl);
      if (payload[key] !== null && !url) return null;
      result[key] = url;
    }
  }
  for (const key of ["management_endpoint", "proyecto_id", "cliente_id", "vercel_project_id", "vercel_team_id", "supabase_project_ref", "version_patrones"] as const) {
    if (key in payload) {
      if (payload[key] !== null && typeof payload[key] !== "string") return null;
      result[key] = payload[key] as string | null;
    }
  }
  if ("management_token" in payload) {
    if (typeof payload.management_token !== "string" || payload.management_token.length < 16 || payload.management_token.length > 500) return null;
    result.management_token = payload.management_token;
  }
  if ("stack" in payload) {
    if (payload.stack !== null && (typeof payload.stack !== "object" || Array.isArray(payload.stack))) return null;
    result.stack = payload.stack as Json | null;
  }
  if ("estado" in payload) {
    if (typeof payload.estado !== "string" || !["activo", "pausado", "retirado"].includes(payload.estado)) return null;
    result.estado = payload.estado;
  }
  if ("monitoreo_activo" in payload) {
    if (typeof payload.monitoreo_activo !== "boolean") return null;
    result.monitoreo_activo = payload.monitoreo_activo;
  }
  return result;
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = getSistemaClient();
  const [{ data, error }, { data: checks, error: checksError }, { count: openIncidents, error: incidentsError }, { count: recentDeploys, error: deploysError }] = await Promise.all([
    supabase.from("sistemas_gestionados").select("*").order("nombre", { ascending: true }),
    supabase.from("sistemas_health_checks").select("*"),
    supabase.from("sistemas_incidentes").select("id", { count: "exact", head: true }).eq("resuelto", false),
    supabase.from("sistemas_deploys").select("id", { count: "exact", head: true }).gte("desplegado_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (checksError || incidentsError || deploysError) return NextResponse.json({ error: (checksError ?? incidentsError ?? deploysError)?.message }, { status: 500 });
  const ultimoChecks = new Map<string, SistemaHealthCheck>();
  for (const check of checks ?? []) {
    const current = ultimoChecks.get(check.sistema_id);
    if (!current || check.checked_at > current.checked_at) ultimoChecks.set(check.sistema_id, check);
  }
  return NextResponse.json({
    data: (data ?? []).map((row) => ({ ...toPublicSistema(row as SistemaGestionado), ultimo_check: ultimoChecks.get(row.id) ?? null })),
    kpis: { sistemas_activos: (data ?? []).filter((row) => row.estado === "activo").length, incidentes_abiertos: openIncidents ?? 0, deploys_24h: recentDeploys ?? 0 }
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const input = parseBody(await request.json().catch(() => null), true);
  if (!input) return NextResponse.json({ error: "Payload inválido. Revisá nombre, URLs y campos permitidos." }, { status: 400 });

  const supabase = getSistemaClient();
  const { data, error } = await supabase.from("sistemas_gestionados").insert({ ...input, management_token: input.management_token ?? generateManagementToken() }).select("*").single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo crear el sistema." }, { status: 500 });
  return NextResponse.json({ data: toPublicSistema(data as SistemaGestionado) }, { status: 201 });
}
