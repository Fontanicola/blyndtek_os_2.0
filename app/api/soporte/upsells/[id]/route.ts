/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user || !["admin", "miembro", "comercial"].includes(user.rol)) return NextResponse.json({ error: "No autorizado." }, { status: 401 }); const body = await request.json(); const { id } = await params; delete body.id; const { data, error } = await (createAdminClient() as any).from("oportunidades_upsell").update({ ...body, updated_at: new Date().toISOString() }).eq("id", id).select("*").single(); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ data }); }
