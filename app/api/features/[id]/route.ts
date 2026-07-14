import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recalcularAvanceProyecto } from "@/lib/proyectos/recalcularAvance";
import { sincronizarDesdeFeature } from "@/lib/proyectos/sincronizarFeatureTarea";
import type { Feature, UpdateFeatureInput } from "@/types/features";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateFeatureInput;
    const supabase = createAdminClient();

    const { data: current, error: currentError } = await supabase
      .from("features")
      .select("proyecto_id")
      .eq("id", params.id)
      .single();

    if (currentError || !current) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "Not found" }, { status });
    }

    const payload: {
      nombre?: string;
      descripcion?: string;
      fase_id?: string;
      estado?: Feature["estado"];
      responsable_id?: string;
      orden?: number;
    } = {
      nombre: body.nombre?.trim() || body.nombre,
      descripcion: body.descripcion?.trim() || body.descripcion,
      fase_id: typeof body.fase_id === "string" ? body.fase_id.trim() : body.fase_id,
      ...(body.estado ? { estado: body.estado } : {}),
      ...(body.responsable_id ? { responsable_id: body.responsable_id } : {}),
      ...(typeof body.orden === "number" ? { orden: body.orden } : {})
    };

    const { data, error } = await supabase
      .from("features")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const project = await recalcularAvanceProyecto(supabase, current.proyecto_id as string);

    if (typeof body.estado !== "undefined") {
      await sincronizarDesdeFeature(params.id, body.estado);
    }

    const feature = data
      ? (() => {
          const next = { ...(data as Record<string, unknown>) };
          delete next.fase;
          return next as Feature;
        })()
      : null;
    return NextResponse.json({ data: feature as Feature, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data: current, error: currentError } = await supabase
      .from("features")
      .select("proyecto_id")
      .eq("id", params.id)
      .single();

    if (currentError || !current) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "Not found" }, { status });
    }

    const { error } = await supabase.from("features").delete().eq("id", params.id);

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const project = await recalcularAvanceProyecto(supabase, current.proyecto_id as string);
    return NextResponse.json({ success: true, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
