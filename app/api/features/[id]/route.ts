import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAvancePct } from "@/lib/proyectos";
import type { Feature, UpdateFeatureInput } from "@/types/features";
import type { Proyecto } from "@/types/proyectos";

type RouteContext = {
  params: {
    id: string;
  };
};

async function recalculateProject(
  supabase: ReturnType<typeof createAdminClient>,
  proyectoId: string
): Promise<Proyecto | null> {
  const { data: features } = await supabase
    .from("features")
    .select("estado")
    .eq("proyecto_id", proyectoId);

  const avance_pct = calculateAvancePct((features ?? []) as Array<Pick<Feature, "estado">>);

  const { data: updatedProject } = await supabase
    .from("proyectos")
    .update({ avance_pct })
    .eq("id", proyectoId)
    .select("*")
    .single();

  return (updatedProject as Proyecto) ?? null;
}

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
      fase?: string;
      estado?: Feature["estado"];
      responsable_id?: string;
      orden?: number;
    } = {
      nombre: body.nombre?.trim() || body.nombre,
      descripcion: body.descripcion?.trim() || body.descripcion,
      fase: body.fase?.trim() || body.fase,
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

    const project = await recalculateProject(supabase, current.proyecto_id as string);
    return NextResponse.json({ data: data as Feature, project });
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

    const project = await recalculateProject(supabase, current.proyecto_id as string);
    return NextResponse.json({ success: true, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
