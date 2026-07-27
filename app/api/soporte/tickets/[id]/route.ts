/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function auth() { const user = await getCurrentUser(); return user && ["admin", "miembro", "comercial"].includes(user.rol) ? user : null; }

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(); if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json(); const { id } = await params; const supabase = createAdminClient() as any;
  const payload = { ...body, ...(body.estado === "resuelto" ? { resuelto_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() };
  delete payload.id; delete payload.created_at;
  const { data, error } = await supabase.from("soporte_tickets").update(payload).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await auth(); if (!user || user.rol !== "admin") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const { id } = await params; const { error } = await (createAdminClient() as any).from("soporte_tickets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ ok: true });
}
