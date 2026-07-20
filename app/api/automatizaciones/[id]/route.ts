import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAutomatizacionFrecuencia, normalizeAutomationTime } from "@/lib/agentes/automatizaciones";
import type { AgentesDatabase, Automatizacion } from "@/types/agentes";

type RouteContext = {
  params: {
    id: string;
  };
};

function parsePatchBody(body: unknown): Partial<Automatizacion> {
  if (!body || typeof body !== "object") {
    return {};
  }

  const payload = body as Record<string, unknown>;
  const update: Partial<Automatizacion> = {};

  if (typeof payload.activa === "boolean") {
    update.activa = payload.activa;
  }

  if (isAutomatizacionFrecuencia(payload.frecuencia)) {
    update.frecuencia = payload.frecuencia;
  }

  if (typeof payload.dia_semana === "number") {
    update.dia_semana = Math.max(0, Math.min(6, Math.trunc(payload.dia_semana)));
  } else if (payload.dia_semana === null) {
    update.dia_semana = null;
  }

  if (typeof payload.dia_mes === "number") {
    update.dia_mes = Math.max(1, Math.min(28, Math.trunc(payload.dia_mes)));
  } else if (payload.dia_mes === null) {
    update.dia_mes = null;
  }

  if (typeof payload.hora === "string") {
    update.hora = normalizeAutomationTime(payload.hora);
  }

  return update;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const update = parsePatchBody(await request.json().catch(() => null));
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
    }

    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const { data, error } = await supabase
      .from("automatizaciones")
      .update(update)
      .eq("id", params.id)
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
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error?.message ?? "No se encontró la automatización." }, { status });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

