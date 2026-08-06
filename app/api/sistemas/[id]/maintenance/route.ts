import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { getSistemaClient, getSistemaForServer, normalizeBaseUrl } from "@/lib/sistemas";
import type { SistemaGestionado } from "@/types/sistemas";

export async function GET(_request: Request, context: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await getSistemaForServer(getSistemaClient(), context.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sistema no encontrado." }, { status: 404 });
  const sistema = data as SistemaGestionado;
  const baseUrl = normalizeBaseUrl(sistema.url_produccion);
  if (!baseUrl || !sistema.management_token) return NextResponse.json({ data: { activo: false, disponible: false } });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/api/blyndtek/maintenance`, { headers: { Authorization: `Bearer ${sistema.management_token}`, Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    if (!response.ok) return NextResponse.json({ data: { activo: false, disponible: false } });
    const payload = await response.json().catch(() => null) as { activo?: unknown } | null;
    return NextResponse.json({ data: { activo: payload?.activo === true, disponible: true } });
  } catch {
    return NextResponse.json({ data: { activo: false, disponible: false } });
  }
}

export async function POST(request: Request, context: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { activo?: unknown; mensaje?: unknown } | null;
  if (!body || typeof body.activo !== "boolean" || (body.mensaje !== undefined && body.mensaje !== null && (typeof body.mensaje !== "string" || body.mensaje.length > 500))) return NextResponse.json({ error: "Indicá un estado y un mensaje válido." }, { status: 400 });
  const supabase = getSistemaClient();
  const { data, error } = await getSistemaForServer(supabase, context.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sistema no encontrado." }, { status: 404 });
  const sistema = data as SistemaGestionado;
  const baseUrl = normalizeBaseUrl(sistema.url_produccion);
  if (!baseUrl || !sistema.management_token) return NextResponse.json({ error: "El sistema no tiene endpoint o token configurado." }, { status: 400 });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/api/blyndtek/maintenance`, { method: "POST", headers: { Authorization: `Bearer ${sistema.management_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ activo: body.activo, mensaje: body.mensaje ?? null }), signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return NextResponse.json({ error: `El sistema rechazó la solicitud (${response.status}).` }, { status: 502 });
    return NextResponse.json({ data: await response.json().catch(() => ({ activo: body.activo })) });
  } catch {
    return NextResponse.json({ error: "No se pudo contactar al sistema." }, { status: 504 });
  }
}
