/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["admin", "miembro", "comercial"].includes(user.rol)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const supabase = createAdminClient() as any;
  const [{ count: abiertos }, { count: criticos }, { count: revisiones }, { data: upsells }] = await Promise.all([
    supabase.from("soporte_tickets").select("id", { count: "exact", head: true }).in("estado", ["abierto", "en_progreso", "esperando_cliente"]),
    supabase.from("soporte_tickets").select("id", { count: "exact", head: true }).in("prioridad", ["alta", "critica"]).in("estado", ["abierto", "en_progreso"]),
    supabase.from("revisiones_cuenta").select("id", { count: "exact", head: true }).in("estado", ["pendiente", "programada"]),
    supabase.from("oportunidades_upsell").select("monto_estimado_usd").in("estado", ["detectada", "contactada", "propuesta"])
  ]);
  return NextResponse.json({ data: { tickets_abiertos: abiertos ?? 0, tickets_prioritarios: criticos ?? 0, revisiones_pendientes: revisiones ?? 0, upsell_potencial_usd: (upsells ?? []).reduce((sum: number, row: any) => sum + Number(row.monto_estimado_usd ?? 0), 0) } });
}
