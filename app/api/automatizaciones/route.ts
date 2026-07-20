import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAutomatizacionFrecuencia, normalizeAutomationTime } from "@/lib/agentes/automatizaciones";
import type { AgentesDatabase, AutomatizacionConAgente } from "@/types/agentes";

function parseCreateBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  if (
    typeof payload.agente_id !== "string" ||
    typeof payload.nombre !== "string" ||
    !isAutomatizacionFrecuencia(payload.frecuencia) ||
    typeof payload.endpoint_trigger !== "string"
  ) {
    return null;
  }

  return {
    agente_id: payload.agente_id,
    nombre: payload.nombre.trim(),
    descripcion: typeof payload.descripcion === "string" ? payload.descripcion.trim() : null,
    activa: typeof payload.activa === "boolean" ? payload.activa : true,
    frecuencia: payload.frecuencia,
    dia_semana: typeof payload.dia_semana === "number" ? payload.dia_semana : null,
    dia_mes: typeof payload.dia_mes === "number" ? payload.dia_mes : null,
    hora: normalizeAutomationTime(typeof payload.hora === "string" ? payload.hora : null),
    endpoint_trigger: payload.endpoint_trigger.trim(),
    ultima_ejecucion: null
  };
}

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const { data, error } = await supabase
      .from("automatizaciones")
      .select(
        `
          *,
          agentes (
            nombre,
            slug,
            tipo
          )
        `
      )
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as AutomatizacionConAgente[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = parseCreateBody(await request.json().catch(() => null));
    if (!body) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const { data, error } = await supabase
      .from("automatizaciones")
      .insert(body)
      .select(
        `
          *,
          agentes (
            nombre,
            slug,
            tipo
          )
        `
      )
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo crear la automatización." }, { status: 500 });
    }

    return NextResponse.json({ data: data as AutomatizacionConAgente }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

