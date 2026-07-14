import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SesionTiempo } from "@/types/sesionesTiempo";

type RouteContext = {
  params: {
    id: string;
  };
};

type SessionRow = SesionTiempo & {
  usuario_id: string;
};

function nowIso() {
  return new Date().toISOString();
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { nota?: string };
    const supabase = createAdminClient();

    const { data: currentSession, error: currentError } = await supabase
      .from("sesiones_tiempo")
      .select("id, fase_id, usuario_id, inicio, fin, duracion_segundos, nota, created_at")
      .eq("id", params.id)
      .maybeSingle();

    if (currentError || !currentSession) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "No se pudo encontrar la sesión." }, { status });
    }

    const session = currentSession as SessionRow;

    if (currentUser.rol !== "admin" && session.usuario_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (session.fin) {
      return NextResponse.json({ data: session });
    }

    const fin = nowIso();
    const duracionSegundos = Math.max(0, Math.round((new Date(fin).getTime() - new Date(session.inicio).getTime()) / 1000));
    const nota = typeof body.nota === "string" && body.nota.trim() ? body.nota.trim() : session.nota;

    const { data, error } = await supabase
      .from("sesiones_tiempo")
      .update({
        fin,
        duracion_segundos: duracionSegundos,
        ...(typeof nota === "string" ? { nota } : {})
      })
      .eq("id", params.id)
      .select("id, fase_id, usuario_id, inicio, fin, duracion_segundos, nota, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo pausar la sesión." }, { status: 500 });
    }

    return NextResponse.json({ data: data as SesionTiempo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
