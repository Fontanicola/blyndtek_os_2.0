import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { getSistemaClient, getSistemaForServer, persistHealthCheck, requestSistemaStatus } from "@/lib/sistemas";
import type { SistemaGestionado } from "@/types/sistemas";

export async function GET(request: Request, context: { params: { id: string } }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = getSistemaClient();
  if (new URL(request.url).searchParams.get("solo_historial") === "1") {
    const { data, error } = await supabase.from("sistemas_health_checks").select("*").eq("sistema_id", context.params.id).gte("checked_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("checked_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  }
  const { data: sistema, error } = await getSistemaForServer(supabase, context.params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!sistema) return NextResponse.json({ error: "Sistema no encontrado." }, { status: 404 });

  const result = await requestSistemaStatus(sistema as SistemaGestionado);
  const persisted = await persistHealthCheck(supabase, sistema as SistemaGestionado, result);
  if (persisted.incidentError) return NextResponse.json({ error: persisted.incidentError.message }, { status: 500 });
  await supabase.from("sistemas_gestionados").update({ estado: result.check.estado === "ok" ? "activo" : "degradado", updated_at: new Date().toISOString() }).eq("id", context.params.id);
  return NextResponse.json({ data: persisted.inserted.data, causa: result.causa });
}
