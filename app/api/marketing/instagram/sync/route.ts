import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncInstagram } from "@/lib/meta/instagram";
import { logServerError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.rol !== "admin") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  try { return NextResponse.json({ data: await syncInstagram() }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar Instagram.";
    logServerError("instagram.sync", error);
    const isConfiguration = message.startsWith("Falta ") || message.startsWith("Meta no está") || message.startsWith("Faltan permisos");
    return NextResponse.json({ error: message, code: isConfiguration ? "integration_configuration" : "instagram_sync_failed" }, { status: isConfiguration ? 409 : 502 });
  }
}
