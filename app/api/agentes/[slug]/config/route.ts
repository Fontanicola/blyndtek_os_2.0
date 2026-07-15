import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAgenteConfigEntries, normalizeAgenteConfig } from "@/lib/agentes/agentes";
import type { Agente, AgenteConfig, AgenteConfigRow, AgentesDatabase } from "@/types/agentes";

type RouteContext = {
  params: {
    slug: string;
  };
};

function parseConfigBody(body: unknown): Partial<AgenteConfig> {
  if (!body || typeof body !== "object") {
    return {};
  }

  const payload = body as Record<string, unknown>;
  const config: Partial<AgenteConfig> = {};

  if (typeof payload.runway_objetivo_meses === "number" && !Number.isNaN(payload.runway_objetivo_meses)) {
    config.runway_objetivo_meses = payload.runway_objetivo_meses;
  }

  if (typeof payload.resumen_automatico_activo === "boolean") {
    config.resumen_automatico_activo = payload.resumen_automatico_activo;
  }

  if (typeof payload.frecuencia_resumen === "string") {
    config.frecuencia_resumen = payload.frecuencia_resumen;
  }

  return config;
}

async function loadAgenteAndConfig(supabase: SupabaseClient<AgentesDatabase>, slug: string) {
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
    const { agente, configRows, error } = await loadAgenteAndConfig(supabase, params.slug);

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

    const body = parseConfigBody(await request.json().catch(() => null));
    const entries = buildAgenteConfigEntries(body);

    if (entries.length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
    }

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const { agente, configRows, error } = await loadAgenteAndConfig(supabase, params.slug);

    if (error || !agente) {
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error?.message ?? "No se encontró el agente." }, { status });
    }

    const rowsByKey = new Map((configRows ?? []).map((row) => [row.clave, row]));

    for (const entry of entries) {
      const existing = rowsByKey.get(entry.clave);

      if (existing) {
        const { error: updateError } = await supabase.from("agente_config").update({ valor: entry.valor }).eq("id", existing.id);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        continue;
      }

      const { error: insertError } = await supabase
        .from("agente_config")
        .insert({
          agente_id: agente.id,
          clave: entry.clave,
          valor: entry.valor
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const { data: updatedRows, error: refreshError } = await supabase
      .from("agente_config")
      .select("*")
      .eq("agente_id", agente.id);

    if (refreshError) {
      return NextResponse.json({ error: refreshError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        agente,
        config: normalizeAgenteConfig((updatedRows ?? []) as AgenteConfigRow[])
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
