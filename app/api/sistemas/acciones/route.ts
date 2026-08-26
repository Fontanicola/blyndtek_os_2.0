import { NextResponse } from "next/server";
import { getTechOpsClient, isTechOpsRequestAuthorized } from "@/lib/observability/tech-ops";
import { getAdminUser } from "@/lib/require-admin";
import type { Json } from "@/types/supabase";
import type { TechActionStatus } from "@/types/techOps";

const statuses = new Set<TechActionStatus>(["detectada", "diagnosticando", "preparada", "verificada", "desplegada", "fallida", "bloqueada", "revertida"]);
const actors = new Set(["codex", "automatizacion", "humano", "sistema"]);

async function authorized(request: Request) {
  return isTechOpsRequestAuthorized(request) || Boolean(await getAdminUser());
}

function optionalText(value: unknown, max = 500) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function parsePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.tipo !== "string" || !body.tipo.trim() || typeof body.titulo !== "string" || !body.titulo.trim()) return null;
  const estado = typeof body.estado === "string" ? body.estado as TechActionStatus : "detectada";
  const actor = typeof body.actor === "string" ? body.actor : "codex";
  if (!statuses.has(estado) || !actors.has(actor)) return null;
  return {
    guardia_id: optionalText(body.guardia_id, 100), sistema_id: optionalText(body.sistema_id, 100), incidente_id: optionalText(body.incidente_id, 100),
    actor: actor as "codex" | "automatizacion" | "humano" | "sistema", tipo: body.tipo.trim().slice(0, 120), estado,
    titulo: body.titulo.trim().slice(0, 300), detalle: optionalText(body.detalle, 4000),
    evidencia: body.evidencia && typeof body.evidencia === "object" && !Array.isArray(body.evidencia) ? body.evidencia as Json : {} as Json,
    branch: optionalText(body.branch), commit_sha: optionalText(body.commit_sha, 100), deployment_id: optionalText(body.deployment_id, 200), external_url: optionalText(body.external_url, 1000),
    iniciada_at: typeof body.iniciada_at === "string" && !Number.isNaN(Date.parse(body.iniciada_at)) ? body.iniciada_at : new Date().toISOString(),
    finalizada_at: typeof body.finalizada_at === "string" && !Number.isNaN(Date.parse(body.finalizada_at)) ? body.finalizada_at : null
  };
}

export async function GET(request: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sistemaId = new URL(request.url).searchParams.get("sistema_id");
  let query = getTechOpsClient().from("sistemas_acciones_tecnicas").select("*").order("created_at", { ascending: false }).limit(100);
  if (sistemaId) query = query.eq("sistema_id", sistemaId);
  const { data, error } = await query;
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = parsePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Payload de acción inválido." }, { status: 400 });
  const { data, error } = await getTechOpsClient().from("sistemas_acciones_tecnicas").insert(payload).select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Falta el id de acción." }, { status: 400 });
  const current = await getTechOpsClient().from("sistemas_acciones_tecnicas").select("*").eq("id", body.id).maybeSingle();
  if (current.error || !current.data) return NextResponse.json({ error: current.error?.message ?? "Acción no encontrada." }, { status: 404 });
  const payload = parsePayload({ ...current.data, ...body });
  if (!payload) return NextResponse.json({ error: "Payload de acción inválido." }, { status: 400 });
  const { data, error } = await getTechOpsClient().from("sistemas_acciones_tecnicas").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", body.id).select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}
