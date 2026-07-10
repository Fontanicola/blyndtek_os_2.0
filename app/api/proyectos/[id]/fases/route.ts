import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateFaseProyectoInput, FaseProyecto } from "@/types/fases-proyecto";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fases_proyecto")
      .select("*")
      .eq("proyecto_id", params.id)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as FaseProyecto[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as Partial<CreateFaseProyectoInput>;

    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: "nombre is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: currentFases, error: currentError } = await supabase
      .from("fases_proyecto")
      .select("orden")
      .eq("proyecto_id", params.id)
      .order("orden", { ascending: true });

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }

    const nextOrden =
      typeof body.orden === "number"
        ? body.orden
        : ((currentFases?.[currentFases.length - 1]?.orden ?? 0) + 1);

    const { data, error } = await supabase
      .from("fases_proyecto")
      .insert({
        proyecto_id: params.id,
        nombre: body.nombre.trim(),
        estado: body.estado ?? "pendiente",
        orden: nextOrden,
        fecha_inicio_estimada: body.fecha_inicio_estimada ?? null,
        fecha_fin_estimada: body.fecha_fin_estimada ?? null,
        descripcion: body.descripcion ?? null,
        entregables: body.entregables ?? null
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo crear la fase." }, { status: 500 });
    }

    return NextResponse.json({ data: data as FaseProyecto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
