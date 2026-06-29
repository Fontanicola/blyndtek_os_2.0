import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cotizacion, EstadoCotizacion } from "@/types/cotizaciones";

type RouteContext = {
  params: {
    id: string;
  };
};

type UpdateEstadoBody = {
  estado?: EstadoCotizacion;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as UpdateEstadoBody;

    if (
      body.estado !== "borrador" &&
      body.estado !== "enviada" &&
      body.estado !== "aceptada" &&
      body.estado !== "rechazada"
    ) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cotizaciones")
      .update({ estado: body.estado })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Cotizacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
