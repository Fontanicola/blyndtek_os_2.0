import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearTareaVinculadaAFeature } from "@/lib/proyectos/featureTarea";
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
      .order("fase_id", { ascending: true })
      .order("orden", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const features = (data ?? []).map((feature) => {
      const next = { ...(feature as Record<string, unknown>) };
      delete next.fase;
      return next as Feature;
    });
    return NextResponse.json({ data: features });
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
        fase_id: body.fase_id?.trim() ?? "",
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
    const feature = (() => {
      const next = { ...(created as Record<string, unknown>) };
      delete next.fase;
      return next as Feature;
    })();

    try {
      const createdTask = await crearTareaVinculadaAFeature(supabase, {
        ...feature,
        proyectos: {
          responsable_id: projectData.responsable_id ?? currentUser.id
        }
      });

      if (createdTask) {
        tarea = createdTask;
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
