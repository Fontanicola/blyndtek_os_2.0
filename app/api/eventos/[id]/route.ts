import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchEventoConInvitados,
  syncEventoInvitados,
  usuarioPuedeVerEvento
} from "@/lib/eventos/invitaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptGoogleToken,
  deleteGoogleCalendarEvent,
  encryptGoogleToken,
  getValidGoogleToken,
  updateGoogleCalendarEvent
} from "@/lib/google-calendar";
import type { EventoConInvitados, UpdateEventoInput } from "@/types/eventos";

type EventoResponse = {
  data: EventoConInvitados;
};

type RouteContext = {
  params: {
    id: string;
  };
};

function sanitizeInvitedUserIds(input: string[] | undefined, organizerId: string) {
  return [...new Set((input ?? []).filter((value) => typeof value === "string" && value.trim().length > 0))]
    .map((value) => value.trim())
    .filter((value) => value !== organizerId);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const evento = await fetchEventoConInvitados(supabase, params.id);

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const canAccess = await usuarioPuedeVerEvento(supabase, evento, currentUser);

    if (!canAccess) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    return NextResponse.json({ data: evento } satisfies EventoResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as UpdateEventoInput;
    const supabase = createAdminClient();
    const evento = await fetchEventoConInvitados(supabase, params.id);

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    if (currentUser.rol !== "admin" && evento.usuario_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { invited_user_ids: nextInvitedUserIds, recurrencia: _recurrencia, ...rest } = body;
    const updatePayload = Object.fromEntries(
      Object.entries(rest).filter(([key]) => key !== "crear_meet")
    ) as Omit<UpdateEventoInput, "crear_meet" | "invited_user_ids" | "recurrencia">;

    if (typeof body.relacion_tipo !== "undefined" && body.relacion_tipo !== null && body.relacion_tipo !== "lead" && body.relacion_tipo !== "cliente") {
      return NextResponse.json({ error: "La relación seleccionada no es válida." }, { status: 400 });
    }

    if (body.relacion_tipo && !body.relacion_id) {
      return NextResponse.json({ error: "Seleccioná el registro relacionado." }, { status: 400 });
    }

    if (body.relacion_tipo && body.relacion_id) {
      const table = body.relacion_tipo === "lead" ? "leads" : "clientes";
      const { data: relation, error: relationError } = await supabase.from(table).select("id").eq("id", body.relacion_id).maybeSingle();
      if (relationError) return NextResponse.json({ error: relationError.message }, { status: 500 });
      if (!relation) return NextResponse.json({ error: "El registro relacionado no existe." }, { status: 400 });
    }

    if (evento.google_event_id && !evento.calendly_invitee_uri && (body.titulo || body.fecha_inicio || body.fecha_fin)) {
      if (!currentUser.google_calendar_token) {
        return NextResponse.json({ error: "Conectá Google Calendar para actualizar esta reunión." }, { status: 400 });
      }
      const token = decryptGoogleToken(currentUser.google_calendar_token);
      if (!token) return NextResponse.json({ error: "No se pudo leer la conexión con Google Calendar." }, { status: 400 });
      const validToken = await getValidGoogleToken(token);
      if (validToken.access_token !== token.access_token || validToken.expiry_date !== token.expiry_date) {
        await supabase.from("usuarios").update({ google_calendar_token: encryptGoogleToken(validToken) }).eq("id", currentUser.id);
      }
      await updateGoogleCalendarEvent(validToken, evento.google_event_id, {
        summary: body.titulo?.trim() ?? evento.titulo,
        start: { dateTime: body.fecha_inicio ?? evento.fecha_inicio },
        end: { dateTime: body.fecha_fin ?? evento.fecha_fin }
      });
    }

    const payload = {
      ...updatePayload,
      ...(typeof body.usuario_id !== "undefined" && currentUser.rol !== "admin" ? { usuario_id: currentUser.id } : {})
    };

    const { data, error } = await supabase.from("eventos").update(payload).eq("id", params.id).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (typeof nextInvitedUserIds !== "undefined") {
      const organizerId = currentUser.rol === "admin" ? payload.usuario_id ?? data.usuario_id : currentUser.id;
      const invitedUserIds = sanitizeInvitedUserIds(nextInvitedUserIds, organizerId);
      await syncEventoInvitados(supabase, params.id, invitedUserIds, organizerId);
    }

    const nextEvento = await fetchEventoConInvitados(supabase, params.id);

    return NextResponse.json({ data: nextEvento ?? (data as EventoConInvitados) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const evento = await fetchEventoConInvitados(supabase, params.id);

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    if (currentUser.rol !== "admin" && evento.usuario_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (evento.google_event_id && !evento.calendly_invitee_uri) {
      if (!currentUser.google_calendar_token) {
        return NextResponse.json({ error: "Conectá Google Calendar para eliminar esta reunión." }, { status: 400 });
      }
      const token = decryptGoogleToken(currentUser.google_calendar_token);
      if (!token) return NextResponse.json({ error: "No se pudo leer la conexión con Google Calendar." }, { status: 400 });
      const validToken = await getValidGoogleToken(token);
      if (validToken.access_token !== token.access_token || validToken.expiry_date !== token.expiry_date) {
        await supabase.from("usuarios").update({ google_calendar_token: encryptGoogleToken(validToken) }).eq("id", currentUser.id);
      }
      await deleteGoogleCalendarEvent(validToken, evento.google_event_id);
    }

    const { error } = await supabase.from("eventos").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
