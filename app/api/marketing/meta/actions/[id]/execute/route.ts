import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { executeControlledMetaAction } from "@/lib/meta/execution";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin") return NextResponse.json({ error: "Solo un administrador puede simular o ejecutar acciones." }, { status: 403 });
    const body = await request.json() as { mode?: unknown; confirmation?: unknown };
    if (body.mode !== "simulate" && body.mode !== "live") return NextResponse.json({ error: "Modo inválido." }, { status: 400 });
    const data = await executeControlledMetaAction(params.id, body.mode, user.id, typeof body.confirmation === "string" ? body.confirmation : undefined);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo procesar la acción." }, { status: 409 });
  }
}
