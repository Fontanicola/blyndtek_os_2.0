import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAvancePct } from "@/lib/proyectos";
import type { CreateFeatureInput, Feature } from "@/types/features";
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

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("features")
      .select("*")
      .eq("proyecto_id", params.id)
      .order("fase", { ascending: true })
      .order("orden", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Feature[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const body = (await request.json()) as Omit<CreateFeatureInput, "proyecto_id">;

    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    if (!body.descripcion?.trim()) {
      return NextResponse.json({ error: "descripcion is required" }, { status: 400 });
    }

    if (!body.fase?.trim()) {
      return NextResponse.json({ error: "fase is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: created, error } = await supabase
      .from("features")
      .insert({
        proyecto_id: params.id,
        nombre: body.nombre.trim(),
        descripcion: body.descripcion.trim(),
        fase: body.fase.trim(),
        estado: body.estado ?? "pendiente",
        responsable_id: body.responsable_id ?? currentUser.id,
        orden: body.orden ?? 0
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const project = await recalculateProject(supabase, params.id);
    return NextResponse.json({ data: created as Feature, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
