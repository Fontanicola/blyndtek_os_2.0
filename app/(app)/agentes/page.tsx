import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AgentesClient, type AgenteConDetalle } from "@/components/agentes/AgentesClient";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAgenteConfig } from "@/lib/agentes/agentes";
import type { Agente, AgenteAnalisis, AgenteConfigRow, AgentesDatabase } from "@/types/agentes";

export const dynamic = "force-dynamic";

export default async function AgentesPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
  const [
    { data: agentesData, error: agentesError },
    { data: configData, error: configError },
    { data: analisisData, error: analisisError }
  ] = await Promise.all([
    supabase.from("agentes").select("*").eq("activo", true).order("created_at", { ascending: true }),
    supabase.from("agente_config").select("*"),
    supabase.from("agente_analisis").select("*").order("created_at", { ascending: false }).limit(20)
  ]);

  const errors = [agentesError, configError, analisisError].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message ?? "No se pudieron cargar los agentes.");
  }

  const agentes = (agentesData ?? []) as Agente[];
  const configs = (configData ?? []) as AgenteConfigRow[];
  const analisis = (analisisData ?? []) as AgenteAnalisis[];

  const configsByAgentId = new Map<string, AgenteConfigRow[]>();
  for (const row of configs) {
    const current = configsByAgentId.get(row.agente_id) ?? [];
    current.push(row);
    configsByAgentId.set(row.agente_id, current);
  }

  const analysesByAgentId = new Map<string, AgenteAnalisis[]>();
  for (const row of analisis) {
    const current = analysesByAgentId.get(row.agente_id) ?? [];
    current.push(row);
    analysesByAgentId.set(row.agente_id, current);
  }

  const agentesConDetalle: AgenteConDetalle[] = agentes.map((agente) => ({
    ...agente,
    config: normalizeAgenteConfig(configsByAgentId.get(agente.id) ?? []),
    analyses: analysesByAgentId.get(agente.id) ?? []
  }));

  return <AgentesClient agentes={agentesConDetalle} />;
}
