import { NextResponse } from "next/server";
import { getTechOpsClient, isTechOpsRequestAuthorized } from "@/lib/observability/tech-ops";
import { getAdminUser } from "@/lib/require-admin";
import type { Json } from "@/types/supabase";
import type { TechGuardStatus } from "@/types/techOps";

const statuses = new Set<TechGuardStatus>(["ejecutando", "saludable", "hallazgos", "fallida", "bloqueada"]);

async function authorized(request: Request) {
  return isTechOpsRequestAuthorized(request) || Boolean(await getAdminUser());
}

function parsePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.automation_id !== "string" || body.automation_id.trim().length < 2) return null;
  if (typeof body.ventana_desde !== "string" || Number.isNaN(Date.parse(body.ventana_desde))) return null;
  if (typeof body.ventana_hasta !== "string" || Number.isNaN(Date.parse(body.ventana_hasta))) return null;
  const estado = typeof body.estado === "string" ? body.estado as TechGuardStatus : "ejecutando";
  if (!statuses.has(estado)) return null;
  const numberValue = (key: string) => typeof body[key] === "number" && Number.isInteger(body[key]) && (body[key] as number) >= 0 ? body[key] as number : 0;
  return {
    automation_id: body.automation_id.trim().slice(0, 200),
    estado,
    ventana_desde: body.ventana_desde,
    ventana_hasta: body.ventana_hasta,
    iniciada_at: typeof body.iniciada_at === "string" && !Number.isNaN(Date.parse(body.iniciada_at)) ? body.iniciada_at : new Date().toISOString(),
    finalizada_at: typeof body.finalizada_at === "string" && !Number.isNaN(Date.parse(body.finalizada_at)) ? body.finalizada_at : null,
    resumen: typeof body.resumen === "string" ? body.resumen.trim().slice(0, 4000) : null,
    sistemas_revisados: numberValue("sistemas_revisados"),
    incidentes_detectados: numberValue("incidentes_detectados"),
    acciones_ejecutadas: numberValue("acciones_ejecutadas"),
    metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Json : {} as Json
  };
}

export async function GET(request: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sistemaId = new URL(request.url).searchParams.get("sistema_id");
  const client = getTechOpsClient();
  let query = client.from("sistemas_guardias").select("*").order("iniciada_at", { ascending: false }).limit(50);
  if (sistemaId) {
    const actions = await client.from("sistemas_acciones_tecnicas").select("guardia_id").eq("sistema_id", sistemaId).not("guardia_id", "is", null);
    if (actions.error) return NextResponse.json({ error: actions.error.message }, { status: 500 });
    const ids = Array.from(new Set((actions.data ?? []).map((row) => row.guardia_id).filter(Boolean))) as string[];
    if (ids.length === 0) return NextResponse.json({ data: [] });
    query = query.in("id", ids);
  }
  const { data, error } = await query;
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = parsePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Payload de guardia inválido." }, { status: 400 });
  const { data, error } = await getTechOpsClient().from("sistemas_guardias").insert(payload).select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Falta el id de guardia." }, { status: 400 });
  const current = await getTechOpsClient().from("sistemas_guardias").select("*").eq("id", body.id).maybeSingle();
  if (current.error || !current.data) return NextResponse.json({ error: current.error?.message ?? "Guardia no encontrada." }, { status: 404 });
  const payload = parsePayload({ ...current.data, ...body });
  if (!payload) return NextResponse.json({ error: "Payload de guardia inválido." }, { status: 400 });
  const { data, error } = await getTechOpsClient().from("sistemas_guardias").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", body.id).select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}
