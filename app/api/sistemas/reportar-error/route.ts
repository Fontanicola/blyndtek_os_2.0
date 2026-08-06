import { NextResponse } from "next/server";
import { getSistemaClient } from "@/lib/sistemas";
import type { SistemaErrorInput, SistemaGestionado } from "@/types/sistemas";

const allowedFields = new Set(["mensaje", "stack", "ruta", "timestamp"]);
const maxLengths: Record<keyof SistemaErrorInput, number> = { mensaje: 1000, stack: 10000, ruta: 500, timestamp: 80 };

function parsePayload(value: unknown): SistemaErrorInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).some((key) => !allowedFields.has(key)) || typeof payload.mensaje !== "string") return null;
  const result: SistemaErrorInput = { mensaje: payload.mensaje.trim() };
  if (!result.mensaje || result.mensaje.length > maxLengths.mensaje) return null;
  for (const key of ["stack", "ruta", "timestamp"] as const) {
    if (!(key in payload)) continue;
    if (payload[key] !== null && typeof payload[key] !== "string") return null;
    const valueForField = payload[key] as string | null;
    if (valueForField && valueForField.length > maxLengths[key]) return null;
    result[key] = valueForField;
  }
  if (result.timestamp && Number.isNaN(Date.parse(result.timestamp))) return null;
  return result;
}

export async function POST(request: Request) {
  const authorizationToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = authorizationToken ?? request.headers.get("x-blyndtek-management-token");
  if (!token || token.length < 16) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = parsePayload(await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Payload inválido. Sólo se aceptan mensaje, stack, ruta y timestamp." }, { status: 400 });

  const supabase = getSistemaClient();
  const { data: sistemas, error } = await supabase.from("sistemas_gestionados").select("*").eq("management_token", token).limit(2);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const sistema = (sistemas ?? [])[0] as SistemaGestionado | undefined;
  if (!sistema || (sistemas ?? []).length !== 1) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const detalle = JSON.stringify({ mensaje: payload.mensaje, stack: payload.stack ?? null, ruta: payload.ruta ?? null, timestamp: payload.timestamp ?? new Date().toISOString() });
  const { data, error: insertError } = await supabase.from("sistemas_incidentes").insert({ sistema_id: sistema.id, tipo: "error_reportado", severidad: "media", titulo: `Error reportado: ${payload.mensaje.slice(0, 120)}`, detalle, resuelto: false }).select("id, sistema_id, tipo, severidad, titulo, resuelto, created_at").single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ data: { id: data.id, recibido: true } }, { status: 201 });
}
