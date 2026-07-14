import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sincronizarDesdeTarea } from "@/lib/proyectos/sincronizarFeatureTarea";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tarea, UpdateTareaInput } from "@/types/tareas";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("tareas").select("*").eq("id", params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const tarea = data as Tarea;

    if (currentUser.rol !== "admin" && tarea.responsable_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    return NextResponse.json({ data: tarea });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as UpdateTareaInput;
    const supabase = createAdminClient();
    const { data: existingTask, error: fetchError } = await supabase
      .from("tareas")
      .select("id, responsable_id")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    if (!existingTask) {
      return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
    }

    if (currentUser.rol !== "admin" && existingTask.responsable_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const payload = {
      titulo: body.titulo?.trim() || body.titulo,
      proyecto_id: body.proyecto_id === "" ? null : body.proyecto_id,
      lead_id: body.lead_id === "" ? null : body.lead_id,
      feature_id: body.feature_id === "" ? null : body.feature_id,
      responsable_id: currentUser.rol === "admin" ? body.responsable_id?.trim() || body.responsable_id : currentUser.id,
      prioridad: body.prioridad,
      fecha_limite: body.fecha_limite === "" ? null : body.fecha_limite,
      estado: body.estado,
      notas: body.notas
    };

    const { data, error } = await supabase
      .from("tareas")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    if (typeof body.estado !== "undefined") {
      await sincronizarDesdeTarea(params.id, body.estado);
    }

    return NextResponse.json({ data: data as Tarea });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: existingTask, error: fetchError } = await supabase
      .from("tareas")
      .select("id, responsable_id")
      .eq("id", params.id)
      .single();

    if (fetchError) {
      const status = fetchError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    if (!existingTask) {
      return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
    }

    if (currentUser.rol !== "admin" && existingTask.responsable_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { error } = await supabase.from("tareas").delete().eq("id", params.id);

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
