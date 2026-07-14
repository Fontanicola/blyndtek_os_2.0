import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchEventoConInvitados } from "@/lib/eventos/invitaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventoConInvitados } from "@/types/eventos";

type RouteContext = {
  params: {
    id: string;
    invitadoId: string;
  };
};

type ResolverPayload = {
  accion?: "aceptar_nuevo_horario" | "mantener_original";
};

function addDuration(startISO: string, endISO: string, proposedDate: string, proposedTime: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const durationMs = end.getTime() - start.getTime();
  const proposedStart = new Date(`${proposedDate}T${proposedTime}`);
  const proposedEnd = new Date(proposedStart.getTime() + durationMs);
  return {
    fecha_inicio: proposedStart.toISOString(),
    fecha_fin: proposedEnd.toISOString()
  };
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as ResolverPayload;
    const supabase = createAdminClient();
    const evento = await fetchEventoConInvitados(supabase, params.id);

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
    }

    if (currentUser.rol !== "admin" && evento.usuario_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const invitacion = evento.invitaciones.find((item) => item.id === params.invitadoId);

    if (!invitacion) {
      return NextResponse.json({ error: "Invitación no encontrada." }, { status: 404 });
    }

    if (body.accion === "aceptar_nuevo_horario") {
      if (invitacion.estado !== "propuesta_alternativa") {
        return NextResponse.json({ error: "La invitación no tiene una propuesta alternativa." }, { status: 400 });
      }

      if (!invitacion.fecha_propuesta_alt || !invitacion.hora_propuesta_alt) {
        return NextResponse.json({ error: "La propuesta alternativa está incompleta." }, { status: 400 });
      }

      const nextDates = addDuration(
        evento.fecha_inicio,
        evento.fecha_fin,
        invitacion.fecha_propuesta_alt,
        invitacion.hora_propuesta_alt
      );

      const { error: eventError } = await supabase
        .from("eventos")
        .update({
          fecha_inicio: nextDates.fecha_inicio,
          fecha_fin: nextDates.fecha_fin
        })
        .eq("id", params.id);

      if (eventError) {
        return NextResponse.json({ error: eventError.message }, { status: 500 });
      }

      const { error: acceptError } = await supabase
        .from("eventos_invitados")
        .update({
          estado: "aceptado",
          respondido_at: new Date().toISOString(),
          fecha_propuesta_alt: null,
          hora_propuesta_alt: null,
          comentario: invitacion.comentario
        })
        .eq("id", params.invitadoId);

      if (acceptError) {
        return NextResponse.json({ error: acceptError.message }, { status: 500 });
      }

      const { error: resetError } = await supabase
        .from("eventos_invitados")
        .update({
          estado: "pendiente",
          respondido_at: null,
          fecha_propuesta_alt: null,
          hora_propuesta_alt: null,
          comentario: null
        })
        .eq("evento_id", params.id)
        .neq("id", params.invitadoId)
        .eq("estado", "aceptado");

      if (resetError) {
        return NextResponse.json({ error: resetError.message }, { status: 500 });
      }

      const nextEvento = await fetchEventoConInvitados(supabase, params.id);
      return NextResponse.json({ data: nextEvento ?? (evento as EventoConInvitados) });
    }

    if (body.accion === "mantener_original") {
      const { error } = await supabase
        .from("eventos_invitados")
        .update({
          estado: "pendiente",
          respondido_at: null,
          fecha_propuesta_alt: null,
          hora_propuesta_alt: null,
          comentario: null
        })
        .eq("id", params.invitadoId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const nextEvento = await fetchEventoConInvitados(supabase, params.id);
      return NextResponse.json({ data: nextEvento ?? (evento as EventoConInvitados) });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
