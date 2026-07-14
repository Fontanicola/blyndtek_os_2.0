import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SesionTiempo,
  SesionTiempoFaseDetalle,
  SesionTiempoFaseResponse,
  SesionTiempoUsuarioResumen
} from "@/types/sesionesTiempo";

type RouteContext = {
  params: {
    id: string;
  };
};

type SessionWithRelations = SesionTiempo & {
  usuarios?: { nombre: string | null } | null;
  fases_proyecto?: {
    nombre: string;
    proyecto_id: string;
    proyectos?: {
      nombre: string;
    } | null;
  } | null;
};

type ActiveSessionWithRelations = {
  id: string;
  fase_id: string;
  usuario_id: string;
  inicio: string;
  fin: string | null;
  created_at: string;
  fases_proyecto?: {
    nombre: string;
    proyecto_id: string;
    proyectos?: {
      nombre: string;
    } | null;
  } | null;
};

function nowIso() {
  return new Date().toISOString();
}

function getSeconds(session: Pick<SesionTiempo, "inicio" | "fin" | "duracion_segundos">, now = Date.now()) {
  if (typeof session.duracion_segundos === "number") {
    return Math.max(0, Math.round(session.duracion_segundos));
  }

  const startMs = new Date(session.inicio).getTime();

  if (Number.isNaN(startMs)) {
    return 0;
  }

  const endMs = session.fin ? new Date(session.fin).getTime() : now;
  if (Number.isNaN(endMs)) {
    return 0;
  }

  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

function getStoredSeconds(session: Pick<SesionTiempo, "duracion_segundos">) {
  return Math.max(0, Math.round(session.duracion_segundos ?? 0));
}

function summarizeByUser(sessions: SessionWithRelations[]) {
  const byUser = new Map<string, SesionTiempoUsuarioResumen>();

  for (const session of sessions) {
    const nombre = session.usuarios?.nombre ?? "Sin nombre";
    const usuarioKey = session.usuario_id ?? "__null__";
    const current = byUser.get(usuarioKey) ?? {
      usuario_id: session.usuario_id,
      nombre,
      segundos: 0
    };

    current.nombre = nombre;
    current.segundos += getStoredSeconds(session);
    byUser.set(usuarioKey, current);
  }

  return [...byUser.values()].sort((first, second) => second.segundos - first.segundos || first.nombre.localeCompare(second.nombre));
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: fase, error: faseError } = await supabase
      .from("fases_proyecto")
      .select(
        `
          id,
          nombre,
          proyecto_id,
          proyectos (
            nombre
          )
        `
      )
      .eq("id", params.id)
      .maybeSingle();

    if (faseError || !fase) {
      const status = faseError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: faseError?.message ?? "No se pudo encontrar la fase." }, { status });
    }

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
          usuarios ( nombre )
        `
      )
      .eq("fase_id", params.id)
      .order("inicio", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessions = (data ?? []) as SessionWithRelations[];
    const totalSegundos = sessions.reduce((sum, session) => sum + getStoredSeconds(session), 0);
    const porUsuario = summarizeByUser(sessions);
    const faseNombre = fase.nombre;
    const proyectoNombre = fase.proyectos?.nombre ?? "Sin nombre";

    const sesionPayload: SesionTiempoFaseDetalle[] = sessions.map((session) => ({
      id: session.id,
      fase_id: session.fase_id,
      usuario_id: session.usuario_id,
      inicio: session.inicio,
      fin: session.fin,
      duracion_segundos: session.duracion_segundos,
      nota: session.nota,
      created_at: session.created_at,
      usuario_nombre: session.usuarios?.nombre ?? "Sin nombre",
      fase_nombre: faseNombre,
      proyecto_nombre: proyectoNombre,
      segundos: getSeconds(session)
    }));

    const payload: SesionTiempoFaseResponse = {
      sesiones: sesionPayload,
      resumen: {
        total_segundos: totalSegundos,
        por_usuario: porUsuario
      }
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: activeSession, error: activeError } = await supabase
      .from("sesiones_tiempo")
      .select(
        `
          id,
          fase_id,
          usuario_id,
          inicio,
          fin,
          created_at,
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
      .maybeSingle();

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    if (activeSession) {
      const current = activeSession as ActiveSessionWithRelations;
      return NextResponse.json(
        {
          error: "Ya tenés un cronómetro corriendo.",
          data: {
            sesion_id: current.id,
            fase_id: current.fase_id,
            fase_nombre: current.fases_proyecto?.nombre ?? "Sin nombre",
            proyecto_id: current.fases_proyecto?.proyecto_id ?? null,
            proyecto_nombre: current.fases_proyecto?.proyectos?.nombre ?? "Sin nombre"
          }
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("sesiones_tiempo")
      .insert({
        fase_id: params.id,
        usuario_id: currentUser.id,
        inicio: nowIso(),
        fin: null,
        duracion_segundos: null,
        nota: null
      })
      .select("id, fase_id, usuario_id, inicio, fin, duracion_segundos, nota, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo iniciar el cronómetro." }, { status: 500 });
    }

    return NextResponse.json({ data: data as SesionTiempo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
