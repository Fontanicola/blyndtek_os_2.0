import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAgenteConfig } from "@/lib/agentes/agentes";
import type { Agente, AgenteConfigRow, AgentesDatabase } from "@/types/agentes";

type RouteContext = {
  params: {
    slug: string;
  };
};

async function loadAgente(supabase: SupabaseClient<AgentesDatabase>, slug: string) {
  const { data: agente, error: agenteError } = await supabase.from("agentes").select("*").eq("slug", slug).single();

  if (agenteError || !agente) {
    return { agente: null as Agente | null, configRows: [] as AgenteConfigRow[], error: agenteError };
  }

  const { data: configRows, error: configError } = await supabase.from("agente_config").select("*").eq("agente_id", agente.id);

  if (configError) {
    return { agente: null as Agente | null, configRows: [] as AgenteConfigRow[], error: configError };
  }

  return { agente: agente as Agente, configRows: (configRows ?? []) as AgenteConfigRow[], error: null };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const { agente, configRows, error } = await loadAgente(supabase, params.slug);

    if (error || !agente) {
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error?.message ?? "No se encontró el agente." }, { status });
    }

    return NextResponse.json({
      data: {
        agente,
        config: normalizeAgenteConfig(configRows)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { activo?: boolean } | null;
    if (typeof body?.activo !== "boolean") {
      return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
    }

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const { agente, error } = await loadAgente(supabase, params.slug);

    if (error || !agente) {
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error?.message ?? "No se encontró el agente." }, { status });
    }

    const { error: updateError } = await supabase.from("agentes").update({ activo: body.activo }).eq("id", agente.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: updatedAgente, error: refreshError } = await supabase.from("agentes").select("*").eq("id", agente.id).single();
    if (refreshError || !updatedAgente) {
      return NextResponse.json({ error: refreshError?.message ?? "No se pudo actualizar el agente." }, { status: 500 });
    }

    return NextResponse.json({ data: { agente: updatedAgente as Agente } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
