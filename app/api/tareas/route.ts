import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateTareaInput, EstadoTarea, PrioridadTarea, Tarea } from "@/types/tareas";

type TareasResponse = {
  data: Tarea[];
};

function parseEstado(value: string | null): EstadoTarea | null {
  if (value === "nueva" || value === "en_proceso" || value === "terminada") {
    return value;
  }

  return null;
}

function parsePrioridad(value: string | null): PrioridadTarea | null {
  if (value === "alta" || value === "media" || value === "baja") {
    return value;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get("proyecto_id")?.trim() || null;
    const responsableId = searchParams.get("responsable_id")?.trim() || null;
    const prioridad = parsePrioridad(searchParams.get("prioridad"));
    const estado = parseEstado(searchParams.get("estado"));

    let query = supabase.from("tareas").select("*").order("fecha_limite", { ascending: true, nullsFirst: false });

    if (proyectoId) {
      query = query.eq("proyecto_id", proyectoId);
    }

    if (responsableId) {
      query = query.eq("responsable_id", responsableId);
    }

    if (prioridad) {
      query = query.eq("prioridad", prioridad);
    }

    if (estado) {
      query = query.eq("estado", estado);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Tarea[] } satisfies TareasResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CreateTareaInput;

    if (!body.titulo?.trim()) {
      return NextResponse.json({ error: "titulo is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const responsableId = body.responsable_id?.trim() || currentUser?.id;

    if (!responsableId) {
      return NextResponse.json({ error: "responsable_id is required" }, { status: 400 });
    }

    const payload = {
      titulo: body.titulo.trim(),
      proyecto_id: body.proyecto_id?.trim() || null,
      responsable_id: responsableId,
      prioridad: body.prioridad ?? "media",
      fecha_limite: body.fecha_limite ?? null,
      estado: body.estado ?? "nueva",
      notas: body.notas ?? null
    };

    const { data, error } = await supabase.from("tareas").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Tarea }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
