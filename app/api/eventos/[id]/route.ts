import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchEventoConInvitados,
  syncEventoInvitados,
  usuarioPuedeVerEvento
} from "@/lib/eventos/invitaciones";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const { invited_user_ids: nextInvitedUserIds, ...rest } = body;

    const payload = {
      ...rest,
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
