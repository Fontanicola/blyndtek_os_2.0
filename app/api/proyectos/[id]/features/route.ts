import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEATURE_A_TAREA } from "@/lib/proyectos/sincronizarFeatureTarea";
import { recalcularAvanceProyecto } from "@/lib/proyectos/recalcularAvance";
import type { CreateFeatureInput, Feature } from "@/types/features";
import type { Tarea } from "@/types/tareas";

type RouteContext = {
  params: {
    id: string;
  };
};

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

    const supabase = createAdminClient();
    const { data: projectData, error: projectError } = await supabase
      .from("proyectos")
      .select("responsable_id")
      .eq("id", params.id)
      .single();

    if (projectError || !projectData) {
      const status = projectError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: projectError?.message ?? "Not found" }, { status });
    }

    const { data: created, error } = await supabase
      .from("features")
      .insert({
        proyecto_id: params.id,
        nombre: body.nombre.trim(),
        descripcion: body.descripcion.trim(),
        fase: body.fase?.trim() ?? "",
        estado: body.estado ?? "pendiente",
        responsable_id: body.responsable_id ?? currentUser.id,
        orden: body.orden ?? 0
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let tarea: Tarea | null = null;
    const feature = created as Feature;

    try {
      const { data: createdTask, error: taskError } = await supabase
        .from("tareas")
        .insert({
          titulo: feature.nombre,
          proyecto_id: params.id,
          feature_id: feature.id,
          responsable_id: feature.responsable_id ?? (projectData.responsable_id ?? currentUser.id),
          prioridad: "media",
          fecha_limite: null,
          estado: FEATURE_A_TAREA[feature.estado],
          notas: null
        })
        .select("*")
        .single();

      if (taskError) {
        console.error("No se pudo crear la tarea vinculada a la feature:", taskError.message);
      } else if (createdTask) {
        tarea = createdTask as Tarea;
      }
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : "Unexpected task error";
      console.error("No se pudo crear la tarea vinculada a la feature:", message);
    }

    const project = await recalcularAvanceProyecto(supabase, params.id);
    return NextResponse.json({ data: { feature, tarea }, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
