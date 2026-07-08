import { NextResponse } from "next/server";
import { isCobroVencido } from "@/lib/finanzas";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: cobrosPendientes, error: cobrosError } = await supabase
      .from("cobros")
      .select("id, estado, fecha_vencimiento, tolerancia_dias")
      .eq("estado", "pendiente");

    if (cobrosError) {
      return NextResponse.json({ error: cobrosError.message }, { status: 500 });
    }

    const vencidos = (cobrosPendientes ?? []).filter((cobro) => isCobroVencido(cobro));

    if (vencidos.length > 0) {
      const { error: updateError } = await supabase
        .from("cobros")
        .update({ estado: "vencido" })
        .in(
          "id",
          vencidos.map((cobro) => cobro.id)
        );

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ data: { vencidos: vencidos.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
