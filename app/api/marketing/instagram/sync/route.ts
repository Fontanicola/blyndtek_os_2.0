import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncInstagram } from "@/lib/meta/instagram";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.rol !== "admin") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  try { return NextResponse.json({ data: await syncInstagram() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo sincronizar Instagram." }, { status: 500 }); }
}
