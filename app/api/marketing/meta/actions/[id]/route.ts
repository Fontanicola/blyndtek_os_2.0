import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin") return NextResponse.json({ error: "Solo un administrador puede aprobar o rechazar acciones." }, { status: 403 });
    const body = await request.json() as { status?: unknown; notes?: unknown };
    if (body.status !== "approved" && body.status !== "rejected" && body.status !== "cancelled") return NextResponse.json({ error: "Estado inválido." }, { status: 400 });

    const now = new Date().toISOString();
    const { data, error } = await createUntypedAdminClient().from("meta_action_queue").update({
      status: body.status,
      reviewed_by: user.id,
      reviewed_at: now,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
      updated_at: now
    }).eq("id", params.id).in("status", ["draft", "pending_approval", "approved"]).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "La acción no existe o ya no admite revisión." }, { status: 409 });
    return NextResponse.json({ data, execution: { attempted: false, blocked: true, reason: "Meta continúa en modo de solo lectura." } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo revisar la acción." }, { status: 500 });
  }
}
