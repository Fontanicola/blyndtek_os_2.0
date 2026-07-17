import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchEventoIdsAceptadosUsuario, syncEventoInvitados } from "@/lib/eventos/invitaciones";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const supabase = createAdminClient();
    const payload = {
      titulo: body.titulo.trim(),
      fecha_inicio: body.fecha_inicio,
      fecha_fin: body.fecha_fin,
      tipo: body.tipo,
      usuario_id: usuarioId,
      referencia_tipo: body.referencia_tipo ?? "lead",
      referencia_id: body.referencia_id ?? usuarioId,
      google_event_id: body.google_event_id ?? null
    };

    const { data, error } = await supabase.from("eventos").insert(payload).select("*").single();

    if (error) {
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
