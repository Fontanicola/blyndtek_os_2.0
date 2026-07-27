/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function auth() { const user = await getCurrentUser(); return user && ["admin", "miembro", "comercial"].includes(user.rol) ? user : null; }
function quarterStart(value?: string) { const date = value ? new Date(`${value}T12:00:00`) : new Date(); const month = Math.floor(date.getMonth() / 3) * 3; return `${date.getFullYear()}-${String(month + 1).padStart(2, "0")}-01`; }

export async function GET(request: NextRequest) {
  const user = await auth(); if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const supabase = createAdminClient() as any; let query = supabase.from("revisiones_cuenta").select("*, clientes(empresa), proyectos(nombre)").order("periodo_inicio", { ascending: false });
  const clienteId = request.nextUrl.searchParams.get("cliente_id"); const estado = request.nextUrl.searchParams.get("estado");
  if (clienteId) query = query.eq("cliente_id", clienteId); if (estado) query = query.eq("estado", estado);
  const { data, error } = await query; if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data ?? []).map((row: any) => ({ ...row, cliente_nombre: row.clientes?.empresa ?? "", proyecto_nombre: row.proyectos?.nombre ?? null })) });
}

export async function POST(request: NextRequest) {
  const user = await auth(); if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json(); if (!body.cliente_id) return NextResponse.json({ error: "cliente_id es obligatorio." }, { status: 400 });
  const supabase = createAdminClient() as any; const periodo = body.periodo_inicio || quarterStart();
  const { data, error } = await supabase.from("revisiones_cuenta").upsert({ cliente_id: body.cliente_id, proyecto_id: body.proyecto_id || null, periodo_inicio: periodo, estado: body.estado || "pendiente", fecha_programada: body.fecha_programada || null, creado_por: user.id }, { onConflict: "cliente_id,periodo_inicio" }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ data }, { status: 201 });
}
