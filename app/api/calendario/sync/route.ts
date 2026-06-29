import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addDays, endOfDay, startOfDay } from "@/lib/calendario";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptGoogleToken,
  encryptGoogleToken,
  getValidGoogleToken,
  googleApiRequest
} from "@/lib/google-calendar";
import type { Evento } from "@/types/eventos";

export const maxDuration = 30;

type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

function toIsoFromGoogleDate(value: string | undefined, end = false) {
  if (!value) {
    return null;
  }

  if (value.includes("T")) {
    return new Date(value).toISOString();
  }

  const date = new Date(`${value}T00:00:00`);
  if (end) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString();
}

async function upsertGoogleEvent(
  supabase: ReturnType<typeof createAdminClient>,
  usuarioId: string,
  googleEvent: GoogleCalendarEvent
) {
  if (!googleEvent.id || !googleEvent.start || !googleEvent.end) {
    return false;
  }

  const start = toIsoFromGoogleDate(googleEvent.start.dateTime ?? googleEvent.start.date);
  const end = toIsoFromGoogleDate(googleEvent.end.dateTime ?? googleEvent.end.date, Boolean(googleEvent.end.date));

  if (!start || !end) {
    return false;
  }

  const { data: existing } = await supabase
    .from("eventos")
    .select("*")
    .eq("google_event_id", googleEvent.id)
    .maybeSingle();

  const payload = {
    titulo: googleEvent.summary?.trim() || "Evento sincronizado",
    fecha_inicio: start,
    fecha_fin: end,
    tipo: "reunion" as const,
    usuario_id: usuarioId,
    referencia_tipo: "lead" as const,
    referencia_id: usuarioId,
    google_event_id: googleEvent.id
  };

  if (existing) {
    await supabase.from("eventos").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("eventos").insert(payload);
  }

  return true;
}

export async function POST() {
  try {
    const usuario = await getCurrentUser();

    if (!usuario?.google_calendar_token) {
      return NextResponse.json({ error: "Google Calendar no está conectado." }, { status: 400 });
    }

    const token = decryptGoogleToken(usuario.google_calendar_token);

    if (!token) {
      return NextResponse.json({ error: "No se pudo leer el token de Google Calendar." }, { status: 400 });
    }

    const validToken = await getValidGoogleToken(token);
    const supabase = createAdminClient();

    if (validToken.access_token !== token.access_token || validToken.expiry_date !== token.expiry_date) {
      const encryptedToken = encryptGoogleToken(validToken);
      await supabase.from("usuarios").update({ google_calendar_token: encryptedToken }).eq("id", usuario.id);
    }

    const { data: localEventos, error: localError } = await supabase
      .from("eventos")
      .select("*")
      .eq("usuario_id", usuario.id)
      .is("google_event_id", null);

    if (localError) {
      return NextResponse.json({ error: localError.message }, { status: 500 });
    }

    const syncWindowStart = startOfDay(addDays(new Date(), -30));
    const syncWindowEnd = endOfDay(addDays(new Date(), 90));
    const localWithoutGoogle = (localEventos ?? []).filter((evento) => !evento.google_event_id) as Evento[];
    let pushed = 0;

    for (const evento of localWithoutGoogle) {
      const createResponse = await googleApiRequest(
        validToken,
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            summary: evento.titulo,
            start: { dateTime: evento.fecha_inicio },
            end: { dateTime: evento.fecha_fin }
          })
        }
      );

      const created = (await createResponse.json()) as { id?: string };
      if (!created.id) {
        continue;
      }

      await supabase.from("eventos").update({ google_event_id: created.id }).eq("id", evento.id);
      pushed += 1;
    }

    const pullUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    pullUrl.searchParams.set("timeMin", syncWindowStart.toISOString());
    pullUrl.searchParams.set("timeMax", syncWindowEnd.toISOString());
    pullUrl.searchParams.set("singleEvents", "true");
    pullUrl.searchParams.set("orderBy", "startTime");

    const response = await googleApiRequest(validToken, pullUrl);
    const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
    let pulled = 0;

    for (const googleEvent of payload.items ?? []) {
      if (googleEvent.status === "cancelled") {
        continue;
      }

      const synced = await upsertGoogleEvent(supabase, usuario.id, googleEvent);
      if (synced) {
        pulled += 1;
      }
    }

    return NextResponse.json({
      data: {
        pushed,
        pulled
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
