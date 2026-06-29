import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Proyecto, UpdateProyectoInput } from "@/types/proyectos";

type RouteContext = {
  params: {
    id: string;
  };
};

async function deleteRelatedRows(supabase: ReturnType<typeof createAdminClient>, proyectoId: string) {
  await supabase.from("features").delete().eq("proyecto_id", proyectoId);
  await supabase.from("cuentas_servicios").delete().eq("proyecto_id", proyectoId);
  await supabase.from("cobros").delete().eq("proyecto_id", proyectoId);
  await supabase.from("suscripciones").delete().eq("proyecto_id", proyectoId);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("proyectos").select("*").eq("id", params.id).single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Proyecto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateProyectoInput;
    const supabase = createAdminClient();
    const payload = {
      ...body,
      nombre: body.nombre?.trim() || body.nombre
    };

    const { data, error } = await supabase
      .from("proyectos")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Proyecto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    await deleteRelatedRows(supabase, params.id);

    const { error } = await supabase.from("proyectos").delete().eq("id", params.id);

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
