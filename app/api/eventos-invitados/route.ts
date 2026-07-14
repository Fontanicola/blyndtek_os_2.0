import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchInvitacionesPendientesUsuario } from "@/lib/eventos/invitaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvitacionPendienteEvento } from "@/types/eventosInvitados";

type PendingInvitationsResponse = {
  data: InvitacionPendienteEvento[];
};

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const invitations = await fetchInvitacionesPendientesUsuario(supabase, currentUser.id);

    return NextResponse.json({ data: invitations } satisfies PendingInvitationsResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
