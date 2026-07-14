import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recalcularAvanceProyecto } from "@/lib/proyectos/recalcularAvance";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const supabase = createAdminClient();
    const project = await recalcularAvanceProyecto(supabase, params.id);

    if (!project) {
      return NextResponse.json({ error: "No se pudo recalcular el avance del proyecto." }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
