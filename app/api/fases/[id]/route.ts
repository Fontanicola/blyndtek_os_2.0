import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recalcularAvanceProyecto } from "@/lib/proyectos/recalcularAvance";
import type { FaseProyecto, UpdateFaseProyectoInput } from "@/types/fases-proyecto";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateFaseProyectoInput;
    const supabase = createAdminClient();

    const { data: currentFase, error: currentError } = await supabase
      .from("fases_proyecto")
      .select("proyecto_id")
      .eq("id", params.id)
      .maybeSingle();

    if (currentError || !currentFase) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "No se pudo encontrar la fase." }, { status });
    }

    const payload: {
      nombre?: string;
      estado?: "pendiente" | "en_curso" | "lista";
      prioridad?: "alta" | "media" | "baja";
      orden?: number;
      fecha_estimada_inicio?: string | null;
      fecha_estimada_fin?: string | null;
      descripcion?: string | null;
    } = {};

    if (typeof body.nombre === "string") {
      payload.nombre = body.nombre.trim();
    }

    if (typeof body.orden === "number") {
      payload.orden = body.orden;
    }

    if (typeof body.estado === "string") {
      payload.estado = body.estado;
    }

    if (typeof body.prioridad === "string") {
      payload.prioridad = body.prioridad;
    }

    if (Object.prototype.hasOwnProperty.call(body, "fecha_estimada_inicio")) {
      payload.fecha_estimada_inicio = body.fecha_estimada_inicio ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "fecha_estimada_fin")) {
      payload.fecha_estimada_fin = body.fecha_estimada_fin ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "descripcion")) {
      payload.descripcion = body.descripcion ?? null;
    }

    const { data, error } = await supabase
      .from("fases_proyecto")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error || !data) {
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error?.message ?? "No se pudo actualizar la fase." }, { status });
    }

    const project = await recalcularAvanceProyecto(supabase, currentFase.proyecto_id);

    return NextResponse.json({ data: data as FaseProyecto, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();

    const { data: currentFase, error: currentError } = await supabase
      .from("fases_proyecto")
      .select("proyecto_id")
      .eq("id", params.id)
      .maybeSingle();

    if (currentError || !currentFase) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "No se pudo encontrar la fase." }, { status });
    }

    const { error } = await supabase.from("fases_proyecto").delete().eq("id", params.id);

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const project = await recalcularAvanceProyecto(supabase, currentFase.proyecto_id);

    return NextResponse.json({ success: true, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
