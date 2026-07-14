import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recalcularAvanceProyecto } from "@/lib/proyectos/recalcularAvance";
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
    const { data: currentFase, error: currentError } = await supabase
      .from("fases_proyecto")
      .select("proyecto_id")
      .eq("id", params.id)
      .maybeSingle();

    if (currentError || !currentFase) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "No se pudo encontrar la fase." }, { status });
    }

    if (body.estado === "lista") {
      const { data: checklistItems, error: checklistError } = await supabase
        .from("checklist_qa")
        .select("id, completado")
        .eq("fase_id", params.id);

      if (checklistError) {
        return NextResponse.json({ error: checklistError.message }, { status: 500 });
      }

      const items = checklistItems ?? [];

      if (items.length > 0) {
        const remaining = items.filter((item) => !item.completado).length;

        if (remaining > 0) {
          return NextResponse.json(
            { error: `Quedan ${remaining} ítems de la checklist de QA sin completar.` },
            { status: 409 }
          );
        }
      }
    }

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

    const project = await recalcularAvanceProyecto(supabase, currentFase.proyecto_id);

    return NextResponse.json({ data: data as FaseProyecto, project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
