import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

type TesoreriaItem = {
  cuenta_medio: string;
  label: string;
  monto: number;
  cantidad: number;
};

function labelFromCuentaMedio(value: string | null) {
  if (!value) {
    return "Sin asignar";
  }

  if (value === "mercadopago") {
    return "Mercado Pago";
  }

  if (value === "transferencia") {
    return "Transferencia";
  }

  if (value === "efectivo") {
    return "Efectivo";
  }

  if (value === "stripe") {
    return "Stripe";
  }

  return "Otro";
}

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("cobros").select("monto, cuenta_medio, estado").eq("estado", "cobrado");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const breakdown = new Map<string, TesoreriaItem>();

    for (const cobro of data ?? []) {
      const cuentaMedio = cobro.cuenta_medio ?? "";
      const label = labelFromCuentaMedio(cobro.cuenta_medio ?? null);
      const current = breakdown.get(cuentaMedio) ?? {
        cuenta_medio: cuentaMedio,
        label,
        monto: 0,
        cantidad: 0
      };

      current.monto += cobro.monto ?? 0;
      current.cantidad += 1;
      breakdown.set(cuentaMedio, current);
    }

    return NextResponse.json({
      data: [...breakdown.values()].sort((first, second) => second.monto - first.monto)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
