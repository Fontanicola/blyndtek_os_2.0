import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

type CobroConClienteRow = {
  cliente_id: string | null;
  monto: number;
  estado: "pendiente" | "facturado" | "cobrado" | "vencido";
  tipo: "one_pay" | "hito" | "mantenimiento" | "brick";
  clientes?: {
    empresa: string | null;
  } | null;
};

type CarteraClienteItem = {
  cliente_id: string;
  empresa: string;
  total_contrato: number;
  total_cobrado: number;
  total_pendiente: number;
  pct_cobrado: number;
};

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data: cobros, error: cobrosError } = await supabase
      .from("cobros")
      .select("cliente_id, monto, estado, tipo, clientes(empresa)")
      .in("tipo", ["hito", "one_pay"])
      .not("cliente_id", "is", null)
      .returns<CobroConClienteRow[]>();

    if (cobrosError) {
      return NextResponse.json({ error: cobrosError.message }, { status: 500 });
    }

    const aggregated = new Map<string, CarteraClienteItem>();

    for (const cobro of cobros ?? []) {
      if (!cobro.cliente_id) {
        continue;
      }

      const empresa = cobro.clientes?.empresa?.trim() || cobro.cliente_id;
      const current = aggregated.get(cobro.cliente_id) ?? {
        cliente_id: cobro.cliente_id,
        empresa,
        total_contrato: 0,
        total_cobrado: 0,
        total_pendiente: 0,
        pct_cobrado: 0
      };

      current.total_contrato += cobro.monto ?? 0;
      if (cobro.estado === "cobrado") {
        current.total_cobrado += cobro.monto ?? 0;
      }

      current.total_pendiente = Math.max(current.total_contrato - current.total_cobrado, 0);
      current.pct_cobrado = current.total_contrato > 0 ? (current.total_cobrado / current.total_contrato) * 100 : 0;
      current.empresa = empresa;

      aggregated.set(cobro.cliente_id, current);
    }

    return NextResponse.json({
      data: [...aggregated.values()].sort((first, second) => second.total_contrato - first.total_contrato)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
