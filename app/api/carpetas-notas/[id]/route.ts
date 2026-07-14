import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CarpetaNota, UpdateCarpetaNotaInput } from "@/types/notas";

type RouteContext = {
  params: {
    id: string;
  };
};

async function getCountNotasActivas(
  supabase: ReturnType<typeof createAdminClient>,
  carpetaId: string
) {
  const { count, error } = await supabase
    .from("notas")
    .select("id", { count: "exact", head: true })
    .eq("carpeta_id", carpetaId)
    .eq("en_papelera", false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("carpetas_notas")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const cantidadNotas = await getCountNotasActivas(supabase, params.id);

    return NextResponse.json({ data: { ...(data as CarpetaNota), cantidad_notas: cantidadNotas } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateCarpetaNotaInput;
    const supabase = createAdminClient();

    const payload: UpdateCarpetaNotaInput = {};

    if (typeof body.nombre === "string") {
      payload.nombre = body.nombre.trim();
    }

    if (typeof body.orden === "number") {
      payload.orden = body.orden;
    }

    const { data, error } = await supabase
      .from("carpetas_notas")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    const cantidadNotas = await getCountNotasActivas(supabase, params.id);

    return NextResponse.json({ data: { ...(data as CarpetaNota), cantidad_notas: cantidadNotas } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const cantidadNotas = await getCountNotasActivas(supabase, params.id);

    if (cantidadNotas > 0) {
      return NextResponse.json({ error: "La carpeta no está vacía." }, { status: 400 });
    }

    const { error } = await supabase.from("carpetas_notas").delete().eq("id", params.id);

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
