import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { getSistemaClient } from "@/lib/sistemas";

export async function GET(_request: Request, context: { params: { id: string } }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await getSistemaClient().from("sistemas_incidentes").select("*").eq("sistema_id", context.params.id).order("resuelto", { ascending: true }).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: unknown; resuelto?: unknown } | null;
  if (!body || typeof body.id !== "string" || typeof body.resuelto !== "boolean") return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const { data, error } = await getSistemaClient().from("sistemas_incidentes").update({ resuelto: body.resuelto, resuelto_at: body.resuelto ? new Date().toISOString() : null, resuelto_por: body.resuelto ? admin.id : null }).eq("id", body.id).eq("sistema_id", context.params.id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Incidente no encontrado." }, { status: 404 });
  return NextResponse.json({ data });
}
