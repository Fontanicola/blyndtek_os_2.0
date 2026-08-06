import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { getSistemaClient, normalizeBaseUrl, toPublicSistema } from "@/lib/sistemas";
import type { SistemaGestionado } from "@/types/sistemas";

const fields = new Set(["nombre", "url_produccion", "url_staging", "management_endpoint", "proyecto_id", "cliente_id", "vercel_project_id", "vercel_team_id", "supabase_project_ref", "stack", "version_patrones", "estado", "monitoreo_activo"]);

async function getAdmin() {
  const user = await getAdminUser();
  return user ? null : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function parsePatch(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (!Object.keys(payload).length || Object.keys(payload).some((key) => !fields.has(key))) return null;
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(payload)) {
    if (["nombre", "management_endpoint", "proyecto_id", "cliente_id", "vercel_project_id", "vercel_team_id", "supabase_project_ref", "version_patrones"].includes(key)) {
      if (raw !== null && typeof raw !== "string") return null;
      if (key === "nombre" && (typeof raw !== "string" || raw.trim().length < 2)) return null;
      result[key] = typeof raw === "string" ? raw.trim() : raw;
    } else if (key === "url_produccion" || key === "url_staging") {
      if (raw !== null && typeof raw !== "string") return null;
      const url = raw === null ? null : normalizeBaseUrl(raw);
      if (raw !== null && !url) return null;
      result[key] = url;
    } else if (key === "monitoreo_activo") {
      if (typeof raw !== "boolean") return null;
      result[key] = raw;
    } else if (key === "estado") {
      if (typeof raw !== "string" || !["activo", "pausado", "retirado"].includes(raw)) return null;
      result[key] = raw;
    } else if (key === "stack") {
      if (raw !== null && (typeof raw !== "object" || Array.isArray(raw))) return null;
      result[key] = raw;
    }
  }
  return result;
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  const forbidden = await getAdmin();
  if (forbidden) return forbidden;
  const { data, error } = await getSistemaClient().from("sistemas_gestionados").select("*").eq("id", context.params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sistema no encontrado." }, { status: 404 });
  return NextResponse.json({ data: toPublicSistema(data as SistemaGestionado) });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const forbidden = await getAdmin();
  if (forbidden) return forbidden;
  const patch = parsePatch(await request.json().catch(() => null));
  if (!patch) return NextResponse.json({ error: "Payload inválido o campo no editable. Usá el endpoint de rotación para el token." }, { status: 400 });
  const { data, error } = await getSistemaClient().from("sistemas_gestionados").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", context.params.id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sistema no encontrado." }, { status: 404 });
  return NextResponse.json({ data: toPublicSistema(data as SistemaGestionado) });
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const forbidden = await getAdmin();
  if (forbidden) return forbidden;
  const { error } = await getSistemaClient().from("sistemas_gestionados").delete().eq("id", context.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
