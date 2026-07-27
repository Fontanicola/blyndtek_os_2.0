/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function quarterStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(Math.floor(now.getMonth() / 3) * 3 + 1).padStart(2, "0")}-01`;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const cronAuthorized = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && request.headers.get("authorization") === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  if (!cronAuthorized && (!user || !["admin", "miembro", "comercial"].includes(user.rol))) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const supabase = createAdminClient() as any;
  const { data: automation } = await supabase.from("automatizaciones").select("id, activa").eq("endpoint_trigger", "/api/soporte/revisiones/generar").maybeSingle();
  if (cronAuthorized && automation && !automation.activa) {
    await supabase.from("automatizaciones").update({ ultima_ejecucion: new Date().toISOString() }).eq("id", automation.id);
    return NextResponse.json({ data: { estado: "pausado", revisiones_preparadas: 0 } });
  }
  const periodo = quarterStart();
  const { data: clientes, error: clientesError } = await supabase.from("clientes").select("id").eq("estado", "activo");
  if (clientesError) return NextResponse.json({ error: clientesError.message }, { status: 500 });
  const rows = (clientes ?? []).map((cliente: { id: string }) => ({ cliente_id: cliente.id, periodo_inicio: periodo, estado: "pendiente", creado_por: user?.id ?? null }));
  if (rows.length) {
    const { error } = await supabase.from("revisiones_cuenta").upsert(rows, { onConflict: "cliente_id,periodo_inicio", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (automation) await supabase.from("automatizaciones").update({ ultima_ejecucion: new Date().toISOString() }).eq("id", automation.id);
  return NextResponse.json({ data: { periodo_inicio: periodo, revisiones_preparadas: rows.length } });
}
