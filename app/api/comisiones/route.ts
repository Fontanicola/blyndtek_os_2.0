import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ComisionListado } from "@/types/comisiones";

const BASE_SELECT =
  "id, vendedor_id, cliente_id, cotizacion_id, tipo, estado, monto_venta, base_comision, monto_comision, pagada_at, created_at, vendedor:usuarios(nombre), cliente:clientes(empresa)";
const SELECT_WITH_LEAD = `${BASE_SELECT}, lead_id`;

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const vendedorId = request.nextUrl.searchParams.get("vendedor_id")?.trim() || null;
    const estado = request.nextUrl.searchParams.get("estado")?.trim() || null;

    let query = supabase.from("comisiones").select(SELECT_WITH_LEAD).order("created_at", { ascending: false });

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

    let data: Array<Record<string, unknown>> | null = null;
    let error: { code?: string; message: string } | null = null;

    const initialResult = await query;
    data = (initialResult.data as Array<Record<string, unknown>> | null) ?? null;
    error = initialResult.error ? { code: initialResult.error.code, message: initialResult.error.message } : null;

    if (error?.code === "42703" && error.message.includes("comisiones.lead_id")) {
      const fallbackQuery = supabase.from("comisiones").select(BASE_SELECT).order("created_at", { ascending: false });

      let scopedFallbackQuery = fallbackQuery;

      if (currentUser.rol === "comercial") {
        scopedFallbackQuery = scopedFallbackQuery.eq("vendedor_id", currentUser.id);
      } else if (currentUser.rol === "admin" && vendedorId) {
        scopedFallbackQuery = scopedFallbackQuery.eq("vendedor_id", vendedorId);
      }

      if (estado === "pendiente" || estado === "pagada" || estado === "cancelada") {
        scopedFallbackQuery = scopedFallbackQuery.eq("estado", estado);
      }

      const fallbackResult = await scopedFallbackQuery;
      data = (fallbackResult.data as Array<Record<string, unknown>> | null) ?? null;
      error = fallbackResult.error ? { code: fallbackResult.error.code, message: fallbackResult.error.message } : null;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as Array<{
      id: string;
      vendedor_id: string;
      cliente_id: string | null;
      lead_id?: string | null;
      cotizacion_id: string | null;
      tipo: "venta" | "diagnostico";
      estado: "pendiente" | "pagada" | "cancelada";
      monto_venta: number;
      base_comision: number;
      monto_comision: number;
      pagada_at: string | null;
      created_at: string;
      vendedor?: { nombre: string | null } | null;
      cliente?: { empresa: string | null } | null;
    }>;

    const leadIds = Array.from(new Set(rows.map((item) => item.lead_id).filter((value): value is string => Boolean(value))));
    let leadNameById = new Map<string, string>();

    if (leadIds.length > 0) {
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("id, empresa, contacto_1_nombre")
        .in("id", leadIds);

      if (leadsError) {
        return NextResponse.json({ error: leadsError.message }, { status: 500 });
      }

      leadNameById = new Map(
        (leadsData ?? []).map((lead) => [
          lead.id,
          lead.empresa?.trim() || lead.contacto_1_nombre?.trim() || lead.id
        ])
      );
    }

    const commissions = rows.map((commission) => {
      const { vendedor, cliente, ...rest } = commission;
      const porcentaje =
        rest.base_comision > 0 ? Number(((rest.monto_comision / rest.base_comision) * 100).toFixed(2)) : 0;
      const leadNombre = rest.lead_id ? leadNameById.get(rest.lead_id) ?? null : null;

      return {
        ...rest,
        lead_id: commission.lead_id ?? null,
        config_comisiones_id: null,
        updated_at: rest.created_at,
        porcentaje,
        vendedor_nombre: vendedor?.nombre ?? null,
        cliente_nombre: cliente?.empresa ?? null,
        lead_nombre: leadNombre
      } satisfies ComisionListado;
    });

    return NextResponse.json({ data: commissions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
