import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ComisionListado } from "@/types/comisiones";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const vendedorId = request.nextUrl.searchParams.get("vendedor_id")?.trim() || null;
    const estado = request.nextUrl.searchParams.get("estado")?.trim() || null;

    let query = supabase
      .from("comisiones")
      .select(
        "id, vendedor_id, cliente_id, cotizacion_id, proyecto_id, tipo, estado, monto_venta, base_comision, porcentaje, monto_comision, config_comisiones_id, pagada_at, created_at, updated_at, vendedor:usuarios(nombre), cliente:clientes(empresa)"
      )
      .order("created_at", { ascending: false });

    if (currentUser.rol === "comercial") {
      query = query.eq("vendedor_id", currentUser.id);
    } else if (currentUser.rol === "admin" && vendedorId) {
      query = query.eq("vendedor_id", vendedorId);
    } else if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (estado === "pendiente" || estado === "pagada" || estado === "cancelada") {
      query = query.eq("estado", estado);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const commissions = (data ?? []).map((item) => {
      const commission = item as ComisionListado & {
        vendedor?: { nombre: string | null } | null;
        cliente?: { empresa: string | null } | null;
      };

      const { vendedor, cliente, ...rest } = commission;

      return {
        ...rest,
        vendedor_nombre: vendedor?.nombre ?? null,
        cliente_nombre: cliente?.empresa ?? null
      } satisfies ComisionListado;
    });

    return NextResponse.json({ data: commissions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
