import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchEventoInvitadosDetalle, usuarioPuedeVerEvento } from "@/lib/eventos/invitaciones";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: {
    id: string;
  };
};

type EventoInvitadosResponse = {
  data: Awaited<ReturnType<typeof fetchEventoInvitadosDetalle>>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: evento, error } = await supabase.from("eventos").select("id, usuario_id").eq("id", params.id).maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!evento) {
      return NextResponse.json({ error: "Evento no encontrado." }, { status: 404 });
    }

    const canAccess = await usuarioPuedeVerEvento(supabase, evento, currentUser);

    if (!canAccess) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const data = await fetchEventoInvitadosDetalle(supabase, params.id);

    return NextResponse.json({ data } satisfies EventoInvitadosResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

