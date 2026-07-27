/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !["admin", "miembro"].includes(user.rol)) return NextResponse.json({ error: "Solo delivery o administración puede transferir un proyecto." }, { status: 403 });
  const { id } = await params; const supabase = createAdminClient() as any;
  const { data: proyecto, error: proyectoError } = await supabase.from("proyectos").select("id, cliente_id, estado").eq("id", id).single();
  if (proyectoError || !proyecto) return NextResponse.json({ error: "Proyecto no encontrado." }, { status: 404 });
  const { error: updateError } = await supabase.from("proyectos").update({ estado: "soporte" }).eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  const { data: handoff, error: handoffError } = await supabase.from("soporte_handoffs").upsert({ proyecto_id: id, cliente_id: proyecto.cliente_id, estado: "pendiente", fecha_transferencia: new Date().toISOString().slice(0, 10), recibido_por: user.id }, { onConflict: "proyecto_id" }).select("*").single();
  if (handoffError) return NextResponse.json({ error: handoffError.message }, { status: 500 });
  return NextResponse.json({ data: { proyecto_id: id, handoff } });
}
