import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { getSistemaClient, getSistemaForServer, normalizeBaseUrl } from "@/lib/sistemas";
import type { SistemaGestionado } from "@/types/sistemas";

export async function POST(request: Request, context: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { mensaje?: unknown } | null;
  if (!body || typeof body.mensaje !== "string" || body.mensaje.trim().length < 1 || body.mensaje.length > 2000) return NextResponse.json({ error: "Escribí un anuncio de hasta 2.000 caracteres." }, { status: 400 });
  const { data, error } = await getSistemaForServer(getSistemaClient(), context.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sistema no encontrado." }, { status: 404 });
  const sistema = data as SistemaGestionado;
  const baseUrl = normalizeBaseUrl(sistema.url_produccion);
  if (!baseUrl || !sistema.management_token) return NextResponse.json({ error: "El sistema no tiene endpoint o token configurado." }, { status: 400 });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/api/blyndtek/announce`, { method: "POST", headers: { Authorization: `Bearer ${sistema.management_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ mensaje: body.mensaje.trim() }), signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return NextResponse.json({ error: `El sistema rechazó el anuncio (${response.status}).` }, { status: 502 });
    return NextResponse.json({ data: { enviado: true } });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar al sistema." }, { status: 504 });
  }
}
