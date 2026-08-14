import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase } from "@/types/agentes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
  const { data, error } = await supabase
    .from("reportes_cronista")
    .select("tipo,periodo_inicio,reporte_markdown")
    .eq("id", context.params.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.reporte_markdown) {
    return NextResponse.json({ error: "El reporte no existe o todavía no tiene Markdown." }, { status: 404 });
  }
  const filename = `log-${data.tipo}-${data.periodo_inicio}.md`;
  return new NextResponse(data.reporte_markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store"
    }
  });
}
