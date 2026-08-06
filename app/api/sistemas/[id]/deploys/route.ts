import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { getSistemaClient, getSistemaForServer } from "@/lib/sistemas";
import type { SistemaGestionado } from "@/types/sistemas";

function dateFromMilliseconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return NextResponse.json({ error: "VERCEL_API_TOKEN no está configurado en el servidor." }, { status: 503 });

  const supabase = getSistemaClient();
  const { data: sistema, error } = await getSistemaForServer(supabase, context.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!sistema) return NextResponse.json({ error: "Sistema no encontrado." }, { status: 404 });
  const sistemaRow = sistema as SistemaGestionado;
  if (!sistemaRow.vercel_project_id) return NextResponse.json({ error: "Este sistema no tiene un proyecto de Vercel configurado." }, { status: 400 });

  const query = new URLSearchParams({ projectId: sistemaRow.vercel_project_id, limit: "10" });
  const teamId = sistemaRow.vercel_team_id ?? process.env.VERCEL_TEAM_ID;
  if (teamId) query.set("teamId", teamId);
  const response = await fetch(`https://api.vercel.com/v6/deployments?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store"
  });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) return NextResponse.json({ error: typeof body?.error === "string" ? body.error : "Vercel rechazó la consulta." }, { status: 502 });

  const deployments = Array.isArray(body?.deployments) ? body.deployments : [];
  const persisted: string[] = [];
  for (const rawDeployment of deployments) {
    const deployment = asRecord(rawDeployment);
    if (!deployment) continue;
    const id = typeof deployment?.uid === "string" ? deployment.uid : null;
    if (!id) continue;
    const commit = asRecord(deployment.meta);
    const existing = await supabase.from("sistemas_deploys").select("id").eq("sistema_id", sistemaRow.id).eq("vercel_deployment_id", id).maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
    const values = {
      sistema_id: sistemaRow.id,
      vercel_deployment_id: id,
      estado: typeof deployment.state === "string" ? deployment.state : typeof deployment.readyState === "string" ? deployment.readyState : null,
      commit_sha: typeof commit?.githubCommitSha === "string" ? commit.githubCommitSha : null,
      commit_mensaje: typeof commit?.githubCommitMessage === "string" ? commit.githubCommitMessage : null,
      desplegado_at: dateFromMilliseconds(deployment.ready)
    };
    if (existing.data) {
      const updated = await supabase.from("sistemas_deploys").update(values).eq("id", existing.data.id);
      if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
    } else {
      const inserted = await supabase.from("sistemas_deploys").insert(values);
      if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });
    }
    persisted.push(id);
  }
  const { data: latest, error: latestError } = await supabase.from("sistemas_deploys").select("*").eq("sistema_id", sistemaRow.id).order("desplegado_at", { ascending: false, nullsFirst: false }).limit(10);
  if (latestError) return NextResponse.json({ error: latestError.message }, { status: 500 });
  return NextResponse.json({ data: latest ?? [], sincronizados: persisted.length });
}
