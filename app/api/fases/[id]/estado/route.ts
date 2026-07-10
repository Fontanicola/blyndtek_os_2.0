import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoFaseProyecto, FaseProyecto } from "@/types/fases-proyecto";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as { estado?: EstadoFaseProyecto };

    if (!body.estado) {
      return NextResponse.json({ error: "estado is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fases_proyecto")
      .update({ estado: body.estado })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error || !data) {
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error?.message ?? "No se pudo actualizar el estado." }, { status });
    }

    return NextResponse.json({ data: data as FaseProyecto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
