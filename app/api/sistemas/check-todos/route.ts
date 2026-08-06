import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { getSistemaClient, isServiceRoleRequest, persistHealthCheck, requestSistemaStatus } from "@/lib/sistemas";
import type { AgentesDatabase } from "@/types/agentes";
import type { SistemaGestionado } from "@/types/sistemas";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin && !isServiceRoleRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSistemaClient();
  const { data: sistemas, error } = await supabase.from("sistemas_gestionados").select("*").eq("monitoreo_activo", true).neq("estado", "retirado");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const resultados: Array<{ sistema_id: string; estado: string; error: string | null }> = [];
  for (const row of (sistemas ?? []) as SistemaGestionado[]) {
    const result = await requestSistemaStatus(row);
    const persisted = await persistHealthCheck(supabase, row, result);
    await supabase.from("sistemas_gestionados").update({ estado: result.check.estado === "ok" ? "activo" : "degradado", updated_at: new Date().toISOString() }).eq("id", row.id);
    resultados.push({ sistema_id: row.id, estado: result.check.estado, error: persisted.incidentError?.message ?? null });
  }
  await (supabase as unknown as SupabaseClient<AgentesDatabase>).from("automatizaciones").update({ ultima_ejecucion: new Date().toISOString() }).eq("endpoint_trigger", "/api/sistemas/check-todos");
  return NextResponse.json({ data: { revisados: resultados.length, resultados } });
}
