import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const payload: {
      nombre?: string;
      estado?: "pendiente" | "en_curso" | "lista";
      orden?: number;
      fecha_inicio_estimada?: string | null;
      fecha_fin_estimada?: string | null;
      descripcion?: string | null;
      entregables?: string | null;
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

    if (Object.prototype.hasOwnProperty.call(body, "fecha_inicio_estimada")) {
      payload.fecha_inicio_estimada = body.fecha_inicio_estimada ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "fecha_fin_estimada")) {
      payload.fecha_fin_estimada = body.fecha_fin_estimada ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "descripcion")) {
      payload.descripcion = body.descripcion ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "entregables")) {
      payload.entregables = body.entregables ?? null;
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

    return NextResponse.json({ data: data as FaseProyecto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("fases_proyecto").delete().eq("id", params.id);

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
