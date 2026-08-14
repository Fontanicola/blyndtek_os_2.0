import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isCronistaDate } from "@/lib/agentes/cronista";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase } from "@/types/agentes";

type RouteContext = {
  params: {
    fecha: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (!isCronistaDate(params.fecha)) {
    return NextResponse.json({ error: "La fecha debe usar el formato YYYY-MM-DD." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
    const { data, error } = await supabase
      .from("logs_diarios")
      .select("log_estructurado")
      .eq("fecha", params.fecha)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.log_estructurado) {
      return NextResponse.json({ error: "No existe un log estructurado para esa fecha." }, { status: 404 });
    }

    return new NextResponse(data.log_estructurado, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `inline; filename="${params.fecha}.md"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
