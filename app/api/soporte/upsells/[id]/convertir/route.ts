/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !["admin", "comercial"].includes(user.rol)) return NextResponse.json({ error: "Solo administración o comercial puede convertir una oportunidad." }, { status: 403 });
  const body = await request.json(); const destino = body.destino ?? "propuesta"; const { id } = await params; const supabase = createAdminClient() as any;
  const { data: opportunity, error: opportunityError } = await supabase.from("oportunidades_upsell").select("*").eq("id", id).single();
  if (opportunityError || !opportunity) return NextResponse.json({ error: "Oportunidad no encontrada." }, { status: 404 });
  const { data: client, error: clientError } = await supabase.from("clientes").select("id, empresa").eq("id", opportunity.cliente_id).single();
  if (clientError || !client) return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });

  if (destino === "propuesta") {
    const { data: proposal, error } = await supabase.from("cotizaciones").insert({ cliente_id: client.id, empresa: client.empresa, precio_total: opportunity.monto_estimado_usd ?? 0, mantenimiento_mensual: opportunity.tipo === "mantenimiento" ? opportunity.monto_estimado_usd ?? null : null, entendimiento: opportunity.descripcion ?? opportunity.titulo, resumen_ejecutivo: opportunity.titulo, modulos: [{ nombre: opportunity.titulo, descripcion: opportunity.descripcion }], beneficios: [], hitos: [], supuestos: [], condiciones_comerciales: {}, datos_propuesta: { origen: "upsell", oportunidad_id: opportunity.id }, estado: "borrador" }).select("id").single();
    if (error || !proposal) return NextResponse.json({ error: error?.message ?? "No se pudo crear la propuesta." }, { status: 500 });
    await supabase.from("oportunidades_upsell").update({ estado: "propuesta", updated_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ data: { destino, cotizacion_id: proposal.id } }, { status: 201 });
  }

  if (destino === "contrato") {
    return NextResponse.json({ error: "Abrí el contrato del cliente para definir adelanto, cuotas y mantenimiento antes de generarlo." }, { status: 400 });
  }

  return NextResponse.json({ error: "Destino no soportado." }, { status: 400 });
}
