import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { NewsletterSuscriptor } from "@/types/newsletter";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.rol !== "admin" && user.rol !== "marketing") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get("estado")?.trim() || "todos";
  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const db = createUntypedAdminClient();
  let query = db.from("newsletter_suscriptores").select("*").order("created_at", { ascending: false });
  if (status !== "todos") query = query.eq("estado", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (data ?? []) as NewsletterSuscriptor[];
  const filtered = search
    ? all.filter((item) => [item.email, item.nombre, item.empresa, item.fuente].some((field) => field?.toLowerCase().includes(search)))
    : all;

  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const sources = all.reduce<Record<string, number>>((acc, item) => {
    const key = item.fuente || "Sin identificar";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    data: filtered,
    metrics: {
      total: all.length,
      activos: all.filter((item) => item.estado === "activo").length,
      ultimos30Dias: all.filter((item) => new Date(item.created_at).getTime() >= since).length,
      fuentePrincipal: Object.entries(sources).sort((a, b) => b[1] - a[1])[0]?.[0] || "—",
    },
  });
}
