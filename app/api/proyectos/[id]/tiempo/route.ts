import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProyectoTiempoResponse, SesionTiempo, SesionTiempoUsuarioResumen } from "@/types/sesionesTiempo";

type RouteContext = {
  params: {
    id: string;
  };
};

type PhaseRow = {
  id: string;
  nombre: string;
  orden: number;
};

type SessionRow = SesionTiempo & {
  usuarios?: { nombre: string | null } | null;
};

function getStoredSeconds(session: Pick<SesionTiempo, "duracion_segundos">) {
  return Math.max(0, Math.round(session.duracion_segundos ?? 0));
}

function sortBySecondsDesc(first: { nombre: string; segundos: number }, second: { nombre: string; segundos: number }) {
  return second.segundos - first.segundos || first.nombre.localeCompare(second.nombre);
}

function getUsuarioKey(usuarioId: string | null) {
  return usuarioId ?? "__null__";
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const [{ data: project, error: projectError }, { data: phases, error: phasesError }] = await Promise.all([
      supabase.from("proyectos").select("id, nombre").eq("id", params.id).maybeSingle(),
      supabase.from("fases_proyecto").select("id, nombre, orden").eq("proyecto_id", params.id).order("orden", { ascending: true })
    ]);

    if (projectError || !project) {
      const status = projectError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: projectError?.message ?? "No se pudo encontrar el proyecto." }, { status });
    }

    if (phasesError) {
      return NextResponse.json({ error: phasesError.message }, { status: 500 });
    }

    const phaseRows = (phases ?? []) as PhaseRow[];
    const phaseIds = phaseRows.map((phase) => phase.id);

    const { data: sessionsRows, error: sessionsError } = phaseIds.length
      ? await supabase
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
          .in("fase_id", phaseIds)
          .order("inicio", { ascending: false })
      : { data: [], error: null as null };

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    const sessions = (sessionsRows ?? []) as SessionRow[];
    const totalSegundos = sessions.reduce((sum, session) => sum + getStoredSeconds(session), 0);

    const userMap = new Map<string, SesionTiempoUsuarioResumen>();
    const phaseMap = new Map<
      string,
      {
        fase_id: string;
        nombre: string;
        segundos: number;
        por_usuario: Map<string, SesionTiempoUsuarioResumen>;
      }
    >();

    for (const phase of phaseRows) {
      phaseMap.set(phase.id, {
        fase_id: phase.id,
        nombre: phase.nombre,
        segundos: 0,
        por_usuario: new Map<string, SesionTiempoUsuarioResumen>()
      });
    }

    for (const session of sessions) {
      const seconds = getStoredSeconds(session);
      const userName = session.usuarios?.nombre ?? "Sin nombre";
      const userKey = getUsuarioKey(session.usuario_id);
      const currentUserTotal = userMap.get(userKey) ?? {
        usuario_id: session.usuario_id,
        nombre: userName,
        segundos: 0
      };
      currentUserTotal.nombre = userName;
      currentUserTotal.segundos += seconds;
      userMap.set(userKey, currentUserTotal);

      const phaseEntry = phaseMap.get(session.fase_id);
      if (!phaseEntry) {
        continue;
      }

      phaseEntry.segundos += seconds;
      const phaseUserKey = getUsuarioKey(session.usuario_id);
      const phaseUserTotal = phaseEntry.por_usuario.get(phaseUserKey) ?? {
        usuario_id: session.usuario_id,
        nombre: userName,
        segundos: 0
      };
      phaseUserTotal.nombre = userName;
      phaseUserTotal.segundos += seconds;
      phaseEntry.por_usuario.set(phaseUserKey, phaseUserTotal);
    }

    const payload: ProyectoTiempoResponse = {
      total_segundos: totalSegundos,
      por_fase: [...phaseMap.values()]
        .map((phase) => ({
          fase_id: phase.fase_id,
          nombre: phase.nombre,
          segundos: phase.segundos,
          por_usuario: [...phase.por_usuario.values()].sort(sortBySecondsDesc)
        }))
        .sort((first, second) => second.segundos - first.segundos || first.nombre.localeCompare(second.nombre)),
      por_usuario: [...userMap.values()].sort(sortBySecondsDesc)
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
