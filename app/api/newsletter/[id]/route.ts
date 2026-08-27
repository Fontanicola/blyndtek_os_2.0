import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { EstadoNewsletterSuscriptor } from "@/types/newsletter";

const ESTADOS = new Set<EstadoNewsletterSuscriptor>(["activo", "desuscripto", "rebotado"]);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.rol !== "admin" && user.rol !== "marketing") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json() as { estado?: EstadoNewsletterSuscriptor };
  if (!body.estado || !ESTADOS.has(body.estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const { id } = await context.params;
  const now = new Date().toISOString();
  const db = createUntypedAdminClient();
  const { data, error } = await db
    .from("newsletter_suscriptores")
    .update({
      estado: body.estado,
      desuscripto_at: body.estado === "desuscripto" ? now : null,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
