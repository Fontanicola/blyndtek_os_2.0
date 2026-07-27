/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorize() {
  const user = await getCurrentUser();
  return user && ["admin", "miembro", "comercial"].includes(user.rol) ? user : null;
}

export async function GET(request: NextRequest) {
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const supabase = createAdminClient() as any;
  let query = supabase.from("soporte_tickets").select("*, clientes(empresa), proyectos(nombre)").order("created_at", { ascending: false });
  const estado = request.nextUrl.searchParams.get("estado");
  const clienteId = request.nextUrl.searchParams.get("cliente_id");
  if (estado) query = query.eq("estado", estado);
  if (clienteId) query = query.eq("cliente_id", clienteId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []).map((row: any) => ({ ...row, cliente_nombre: row.clientes?.empresa ?? "", proyecto_nombre: row.proyectos?.nombre ?? null })) });
}

export async function POST(request: NextRequest) {
  const user = await authorize();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json();
  if (!body.cliente_id || !body.titulo?.trim() || !body.descripcion?.trim()) {
    return NextResponse.json({ error: "Cliente, título y descripción son obligatorios." }, { status: 400 });
  }
  const supabase = createAdminClient() as any;
  const { data, error } = await supabase.from("soporte_tickets").insert({
    cliente_id: body.cliente_id, proyecto_id: body.proyecto_id || null, titulo: body.titulo.trim(),
    descripcion: body.descripcion.trim(), prioridad: body.prioridad || "media", responsable_id: body.responsable_id || user.id,
    fecha_limite: body.fecha_limite || null
  }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
