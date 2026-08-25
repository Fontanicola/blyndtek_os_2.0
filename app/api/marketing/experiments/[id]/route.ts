import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!['admin', 'marketing'].includes(user.rol)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const allowed = new Set(["draft", "planned", "running", "completed", "cancelled"]);
    const status = String(body.status || "");
    if (!allowed.has(status)) return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (body.verdict !== undefined) payload.verdict = body.verdict || null;
    if (body.learning !== undefined) payload.learning = String(body.learning || "").trim() || null;
    if (body.result !== undefined) payload.result = body.result || {};
    const db = createUntypedAdminClient();
    const { error } = await db.from("marketing_experiments").update(payload).eq("id", params.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: { id: params.id } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el experimento." }, { status: 500 });
  }
}
