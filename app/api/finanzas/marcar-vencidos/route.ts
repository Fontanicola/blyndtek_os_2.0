import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const hoy = todayISO();

    const { data, error } = await supabase
      .from("cobros")
      .update({ estado: "vencido" })
      .eq("estado", "pendiente")
      .lt("fecha_vencimiento", hoy)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { vencidos: data?.length ?? 0 } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
