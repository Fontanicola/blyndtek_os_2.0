import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncMetaAds } from "@/lib/meta/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin") return NextResponse.json({ error: "Solo un administrador puede sincronizar Meta." }, { status: 403 });

    const result = await syncMetaAds(user.id, "manual");
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar Meta.";
    const status = message.startsWith("Configuración incompleta") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
