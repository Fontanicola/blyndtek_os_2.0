import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadNegociacion } from "@/types/leads";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, vendedor_id")
      .eq("id", params.id)
      .maybeSingle();

    if (leadError) {
      const status = leadError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: leadError.message }, { status });
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead no encontrado." }, { status: 404 });
    }

    if (currentUser.rol === "comercial" && lead.vendedor_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("leads_negociaciones")
      .select("*, creado_por_usuario:usuarios(nombre)")
      .eq("lead_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as LeadNegociacion[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
