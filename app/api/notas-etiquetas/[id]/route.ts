import { NextRequest, NextResponse } from "next/server";
import { normalizeNotaEtiquetaColor } from "@/lib/notas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotaEtiqueta } from "@/types/notasEtiquetas";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const body = (await request.json()) as { color?: unknown };
    const color = normalizeNotaEtiquetaColor(body.color);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("notas_etiquetas")
      .update({ color })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as NotaEtiqueta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
