import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin" && user.rol !== "marketing") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const body = await request.json() as { status?: unknown; notes?: unknown };
    if (body.status !== "acknowledged" && body.status !== "dismissed" && body.status !== "resolved") return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    const now = new Date().toISOString();
    const update = body.status === "acknowledged"
      ? { status: body.status, acknowledged_at: now, acknowledged_by: user.id, notes: typeof body.notes === "string" ? body.notes.slice(0, 1000) : null, updated_at: now }
      : { status: body.status, resolved_at: now, resolved_by: user.id, notes: typeof body.notes === "string" ? body.notes.slice(0, 1000) : null, updated_at: now };
    const { data, error } = await createUntypedAdminClient().from("meta_recommendations").update(update).eq("id", params.id).select("id,status").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Recomendación inexistente." }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar la recomendación." }, { status: 500 });
  }
}
