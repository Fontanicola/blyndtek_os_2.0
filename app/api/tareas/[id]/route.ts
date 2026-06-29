import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tarea, UpdateTareaInput } from "@/types/tareas";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("tareas").select("*").eq("id", params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Tarea });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateTareaInput;
    const supabase = createAdminClient();

    const payload = {
      titulo: body.titulo?.trim() || body.titulo,
      proyecto_id: body.proyecto_id === "" ? null : body.proyecto_id,
      responsable_id: body.responsable_id?.trim() || body.responsable_id,
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

    return NextResponse.json({ data: data as Tarea });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
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
