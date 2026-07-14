import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearTareaConAdminClient } from "@/lib/tareas/crearTarea";
import type { EstadoTarea, PrioridadTarea, Tarea } from "@/types/tareas";

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

    let query = supabase
      .from("tareas")
      .select(
        `
          id,
          titulo,
          proyecto_id,
          feature_id,
          responsable_id,
          prioridad,
          fecha_limite,
          estado,
          notas,
          es_ia,
          created_at,
          features (
            fase_id,
            fases_proyecto (
              nombre
            )
          )
        `
      )
      .order("fecha_limite", { ascending: true, nullsFirst: false });

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

    const tareas = (data ?? []).map((row) => {
      const featureRelation = (row as {
        features?: {
          fase_id?: string | null;
          fases_proyecto?: { nombre?: string | null } | null;
        } | null;
      }).features;

      const next = { ...(row as Record<string, unknown>) };
      delete next.features;

      return {
        ...(next as Tarea),
        fase_nombre: featureRelation?.fases_proyecto?.nombre ?? null
      };
    });

    return NextResponse.json({ data: tareas } satisfies TareasResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    const supabase = createAdminClient();
    const body = (await request.json()) as Parameters<typeof crearTareaConAdminClient>[1];
    const tarea = await crearTareaConAdminClient(supabase, body, { defaultResponsableId: currentUser?.id });

    return NextResponse.json({ data: tarea }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.endsWith("is required")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
