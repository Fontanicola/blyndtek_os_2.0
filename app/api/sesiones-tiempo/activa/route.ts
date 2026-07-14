import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SesionTiempo } from "@/types/sesionesTiempo";

type ActiveSessionRow = SesionTiempo & {
  usuarios?: { nombre: string | null } | null;
  fases_proyecto?: {
    nombre: string;
    proyecto_id: string;
    proyectos?: {
      nombre: string;
    } | null;
  } | null;
};

function getSeconds(session: Pick<SesionTiempo, "inicio">) {
  const start = new Date(session.inicio).getTime();

  if (Number.isNaN(start)) {
    return 0;
  }

  return Math.max(0, Math.round((Date.now() - start) / 1000));
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("sesiones_tiempo")
      .select(
        `
          id,
          fase_id,
          usuario_id,
          inicio,
          fin,
          duracion_segundos,
          nota,
          created_at,
          usuarios ( nombre ),
          fases_proyecto (
            id,
            nombre,
            proyecto_id,
            proyectos (
              id,
              nombre
            )
          )
        `
      )
      .eq("usuario_id", currentUser.id)
      .is("fin", null)
      .order("inicio", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ data: null });
    }

    const session = data as ActiveSessionRow;

    return NextResponse.json({
      data: {
        id: session.id,
        fase_id: session.fase_id,
        usuario_id: session.usuario_id,
        inicio: session.inicio,
        fin: session.fin,
        duracion_segundos: session.duracion_segundos,
        nota: session.nota,
        created_at: session.created_at,
        usuario_nombre: session.usuarios?.nombre ?? currentUser.nombre,
        fase_nombre: session.fases_proyecto?.nombre ?? "Sin nombre",
        proyecto_id: session.fases_proyecto?.proyecto_id ?? null,
        proyecto_nombre: session.fases_proyecto?.proyectos?.nombre ?? "Sin nombre",
        segundos: getSeconds(session)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
