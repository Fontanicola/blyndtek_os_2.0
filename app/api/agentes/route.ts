import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAgenteConfig } from "@/lib/agentes/agentes";
import type { Agente, AgenteConfigRow, AgentesDatabase } from "@/types/agentes";

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;

    const [{ data: agentesData, error: agentesError }, { data: configData, error: configError }] = await Promise.all([
      supabase.from("agentes").select("*").eq("activo", true).order("created_at", { ascending: true }),
      supabase.from("agente_config").select("*")
    ]);

    const errors = [agentesError, configError].filter(Boolean);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0]?.message ?? "No se pudieron cargar los agentes." }, { status: 500 });
    }

    const agentes = (agentesData ?? []) as Agente[];
    const configs = (configData ?? []) as AgenteConfigRow[];
    const configsByAgentId = new Map<string, AgenteConfigRow[]>();

    for (const row of configs) {
      const current = configsByAgentId.get(row.agente_id) ?? [];
      current.push(row);
      configsByAgentId.set(row.agente_id, current);
    }

    const data = agentes.map((agente) => ({
      ...agente,
      config: normalizeAgenteConfig(configsByAgentId.get(agente.id) ?? [])
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
