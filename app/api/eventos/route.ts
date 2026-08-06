import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchEventoIdsAceptadosUsuario, syncEventoInvitados } from "@/lib/eventos/invitaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  decryptGoogleToken,
  encryptGoogleToken,
  getValidGoogleToken
} from "@/lib/google-calendar";
import { randomUUID } from "crypto";
import { fechaStringAFechaLocal } from "@/lib/utils/fechas";
import type { CreateEventoInput, Evento, EventoConInvitados, TipoEvento } from "@/types/eventos";

type EventosResponse = {
  data: (Evento | EventoConInvitados)[];
};

function parseTipo(value: string | null): TipoEvento | null {
  if (value === "tarea" || value === "seguimiento" || value === "vencimiento" || value === "reunion") {
    return value;
  }

  return null;
}

function parseDateParam(value: string | null) {
  if (!value) {
    return null;
  }

  const date = fechaStringAFechaLocal(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toIso(date: Date) {
  return date.toISOString();
}

function sanitizeInvitedUserIds(input: string[] | undefined, organizerId: string) {
  return [...new Set((input ?? []).filter((value) => typeof value === "string" && value.trim().length > 0))]
    .map((value) => value.trim())
    .filter((value) => value !== organizerId);
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const tipo = parseTipo(searchParams.get("tipo"));
    const desde = parseDateParam(searchParams.get("desde"));
    const hasta = parseDateParam(searchParams.get("hasta"));
    const usuarioId = searchParams.get("usuario_id")?.trim() || null;

    let query = supabase.from("eventos").select("*").order("fecha_inicio", { ascending: true });

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    if (desde) {
      query = query.gte("fecha_fin", toIso(desde));
    }

    if (hasta) {
      query = query.lte("fecha_inicio", toIso(hasta));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let eventos = (data ?? []) as Evento[];

    if (currentUser.rol !== "admin") {
      const acceptedIds = new Set(await fetchEventoIdsAceptadosUsuario(supabase, currentUser.id));
      eventos = eventos.filter((evento) => evento.usuario_id === currentUser.id || acceptedIds.has(evento.id));
    } else if (usuarioId) {
      eventos = eventos.filter((evento) => evento.usuario_id === usuarioId);
    }

    return NextResponse.json({ data: eventos } satisfies EventosResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CreateEventoInput>;

    if (!body.titulo?.trim()) {
      return NextResponse.json({ error: "titulo is required" }, { status: 400 });
    }

    if (!body.fecha_inicio || !body.fecha_fin) {
      return NextResponse.json({ error: "fecha_inicio and fecha_fin are required" }, { status: 400 });
    }

    if (!body.tipo) {
      return NextResponse.json({ error: "tipo is required" }, { status: 400 });
    }

    if (
      body.tipo !== "tarea" &&
      body.tipo !== "seguimiento" &&
      body.tipo !== "vencimiento" &&
      body.tipo !== "reunion"
    ) {
      return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
    }

    const usuarioId = currentUser.rol === "admin" ? body.usuario_id?.trim() || currentUser.id : currentUser.id;
    const relacionTipo = body.relacion_tipo ?? null;
    const relacionId = body.relacion_id?.trim() || null;

    if (relacionTipo && !relacionId) {
      return NextResponse.json({ error: "Seleccioná el registro relacionado." }, { status: 400 });
    }

    if (relacionTipo !== null && relacionTipo !== "lead" && relacionTipo !== "cliente") {
      return NextResponse.json({ error: "La relación seleccionada no es válida." }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (relacionId && relacionTipo) {
      const table = relacionTipo === "lead" ? "leads" : "clientes";
      const { data: relation, error: relationError } = await supabase.from(table).select("id").eq("id", relacionId).maybeSingle();
      if (relationError) return NextResponse.json({ error: relationError.message }, { status: 500 });
      if (!relation) return NextResponse.json({ error: "El registro relacionado no existe." }, { status: 400 });
    }

    let googleEventId: string | null = null;
    let generatedMeetingUrl: string | null = body.enlace_reunion ?? null;

    if (body.tipo === "reunion" && body.crear_meet === true) {
      if (!currentUser.google_calendar_token) {
        return NextResponse.json({ error: "Conectá Google Calendar para generar automáticamente el enlace de Meet." }, { status: 400 });
      }

      const token = decryptGoogleToken(currentUser.google_calendar_token);
      if (!token) return NextResponse.json({ error: "No se pudo leer la conexión con Google Calendar." }, { status: 400 });
      const validToken = await getValidGoogleToken(token);
      if (validToken.access_token !== token.access_token || validToken.expiry_date !== token.expiry_date) {
        await supabase.from("usuarios").update({ google_calendar_token: encryptGoogleToken(validToken) }).eq("id", currentUser.id);
      }

      const googleEvent = await createGoogleCalendarEvent(validToken, {
        summary: body.titulo.trim(),
        start: { dateTime: body.fecha_inicio },
        end: { dateTime: body.fecha_fin },
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        }
      });
      googleEventId = googleEvent.id ?? null;
      generatedMeetingUrl = googleEvent.hangoutLink
        ?? googleEvent.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri
        ?? generatedMeetingUrl;
    }

    const payload = {
      titulo: body.titulo.trim(),
      fecha_inicio: body.fecha_inicio,
      fecha_fin: body.fecha_fin,
      tipo: body.tipo,
      usuario_id: usuarioId,
      referencia_tipo: body.referencia_tipo ?? "lead",
      referencia_id: body.referencia_id ?? usuarioId,
      google_event_id: googleEventId ?? body.google_event_id ?? null,
      enlace_reunion: generatedMeetingUrl,
      relacion_tipo: relacionTipo,
      relacion_id: relacionId
    };

    const { data, error } = await supabase.from("eventos").insert(payload).select("*").single();

    if (error) {
      if (googleEventId && currentUser.google_calendar_token) {
        const token = decryptGoogleToken(currentUser.google_calendar_token);
        if (token) {
          await deleteGoogleCalendarEvent(token, googleEventId).catch(() => undefined);
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const invitedUserIds = sanitizeInvitedUserIds(body.invited_user_ids, usuarioId);

    if (invitedUserIds.length > 0) {
      try {
        await syncEventoInvitados(supabase, data.id, invitedUserIds, usuarioId);
      } catch (syncError) {
        await supabase.from("eventos").delete().eq("id", data.id);
        throw syncError;
      }
    }

    return NextResponse.json({ data: data as Evento }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
