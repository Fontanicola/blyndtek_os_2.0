import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fechaInputAString } from "@/lib/utils/fechas";
import type { EventoInvitado } from "@/types/eventos";

type RouteContext = {
  params: {
    id: string;
  };
};

type ResponsePayload = {
  estado?: "aceptado" | "rechazado" | "propuesta_alternativa";
  fecha_propuesta_alt?: string | null;
  hora_propuesta_alt?: string | null;
  comentario?: string | null;
};

function toDateOnly(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return fechaInputAString(value);
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as ResponsePayload;
    const supabase = createAdminClient();
    const { data: invitacion, error: invitacionError } = await supabase
      .from("eventos_invitados")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();

    if (invitacionError) {
      return NextResponse.json({ error: invitacionError.message }, { status: 500 });
    }

    if (!invitacion) {
      return NextResponse.json({ error: "Invitación no encontrada." }, { status: 404 });
    }

    if (currentUser.rol !== "admin" && invitacion.usuario_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (body.estado === "propuesta_alternativa") {
      if (!body.fecha_propuesta_alt || !body.hora_propuesta_alt) {
        return NextResponse.json({ error: "fecha_propuesta_alt y hora_propuesta_alt son requeridos." }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("eventos_invitados")
        .update({
          estado: body.estado,
          fecha_propuesta_alt: toDateOnly(body.fecha_propuesta_alt),
          hora_propuesta_alt: body.hora_propuesta_alt,
          comentario: body.comentario ?? null,
          respondido_at: new Date().toISOString()
        })
        .eq("id", params.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data: data as EventoInvitado });
    }

    const { data, error } = await supabase
      .from("eventos_invitados")
      .update({
        estado: body.estado ?? "aceptado",
        fecha_propuesta_alt: null,
        hora_propuesta_alt: null,
        comentario: body.comentario ?? null,
        respondido_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as EventoInvitado });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
