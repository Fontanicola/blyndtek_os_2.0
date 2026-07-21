import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularBalanceTotalTesoreria } from "@/lib/finanzas/tesoreria";
import {
  getPresupuestoMonthBounds,
  getPreviousPresupuestoMonth,
  hidratarPresupuesto,
  normalizarMesPresupuesto,
  ordenarPresupuestoItems,
  presupuestoMesAFecha
} from "@/lib/finanzas/presupuestos";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";
import type { PresupuestoItem, PresupuestoPatchInput } from "@/types/presupuestos";
import type { TipoCobro } from "@/types/cobros";
import type { CategoriaEgreso } from "@/types/egresos";

type PresupuestoRow = Database["public"]["Tables"]["presupuestos_mensuales"]["Row"];
type PresupuestoInsert = Database["public"]["Tables"]["presupuestos_mensuales"]["Insert"];
type PresupuestoItemRow = Database["public"]["Tables"]["presupuesto_items"]["Row"];
type PresupuestoItemInsert = Database["public"]["Tables"]["presupuesto_items"]["Insert"];

type CobroSugeridoRow = {
  id: string;
  concepto: string;
  monto: number;
  fecha_vencimiento: string;
  estado: "pendiente" | "facturado" | "cobrado" | "vencido";
  tipo: TipoCobro;
};

type SuscripcionSugeridaRow = {
  id: string;
  cliente_id: string;
  tipo: "mantenimiento" | "brick";
  monto_mensual: number;
  estado: "pendiente" | "activa" | "pausada" | "baja";
};

type ClienteMiniRow = {
  id: string;
  empresa: string;
};

type EgresoRecurrenteSugeridoRow = {
  id: string;
  concepto: string;
  categoria: CategoriaEgreso;
  monto: number;
  activo: boolean;
};

function isValidMonto(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

async function calcularCajaActualReal(supabase: SupabaseClient<Database>) {
  const [{ data: configRows, error: configError }, { data: cobrosRows, error: cobrosError }, { data: egresosRows, error: egresosError }] =
    await Promise.all([
      supabase.from("config_finanzas").select("caja_inicial").order("updated_at", { ascending: false }).limit(1),
      supabase.from("cobros").select("estado, monto").eq("estado", "cobrado"),
      supabase.from("egresos").select("pagado, monto").eq("pagado", true)
    ]);

  if (configError) {
    throw new Error(configError.message);
  }

  if (cobrosError) {
    throw new Error(cobrosError.message);
  }

  if (egresosError) {
    throw new Error(egresosError.message);
  }

  return calcularBalanceTotalTesoreria({
    cajaInicial: Number(configRows?.[0]?.caja_inicial ?? 0),
    cobros: (cobrosRows ?? []) as Array<{ estado: "cobrado"; monto: number }>,
    egresos: (egresosRows ?? []) as Array<{ pagado: true; monto: number }>
  });
}

async function fetchPresupuestoRowByMonth(supabase: SupabaseClient<Database>, mes: string) {
  const presupuestoDate = presupuestoMesAFecha(mes);
  if (!presupuestoDate) {
    throw new Error("Mes inválido");
  }

  const { data, error } = await supabase
    .from("presupuestos_mensuales")
    .select("*")
    .eq("mes", presupuestoDate)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as PresupuestoRow | null;
}

async function fetchPresupuestoItems(supabase: SupabaseClient<Database>, presupuestoId: string) {
  const { data, error } = await supabase
    .from("presupuesto_items")
    .select("*")
    .eq("presupuesto_id", presupuestoId);

  if (error) {
    throw new Error(error.message);
  }

  return ordenarPresupuestoItems((data ?? []) as PresupuestoItem[]);
}

async function recalculatePresupuesto(
  supabase: SupabaseClient<Database>,
  presupuesto: PresupuestoRow
) {
  const items = await fetchPresupuestoItems(supabase, presupuesto.id);
  const hydrated = hidratarPresupuesto(presupuesto, items);

  const { error } = await supabase
    .from("presupuestos_mensuales")
    .update({ caja_final_proyectada_usd: hydrated.caja_final_proyectada_usd })
    .eq("id", presupuesto.id);

  if (error) {
    throw new Error(error.message);
  }

  return hydrated;
}

async function buildSuggestedItems(
  supabase: SupabaseClient<Database>,
  mes: string,
  presupuestoId: string
) {
  const bounds = getPresupuestoMonthBounds(mes);
  if (!bounds) {
    throw new Error("Mes inválido");
  }

  const [cobrosResult, suscripcionesResult, egresosRecurrentesResult] = await Promise.all([
    supabase
      .from("cobros")
      .select("id, concepto, monto, fecha_vencimiento, estado, tipo")
      .eq("tipo", "hito")
      .eq("estado", "pendiente")
      .gte("fecha_vencimiento", bounds.from)
      .lt("fecha_vencimiento", bounds.to),
    supabase
      .from("suscripciones")
      .select("id, cliente_id, tipo, monto_mensual, estado")
      .eq("estado", "activa"),
    supabase
      .from("egresos_recurrentes_config")
      .select("id, concepto, categoria, monto, activo")
      .eq("activo", true)
  ]);

  if (cobrosResult.error) {
    throw new Error(cobrosResult.error.message);
  }

  if (suscripcionesResult.error) {
    throw new Error(suscripcionesResult.error.message);
  }

  if (egresosRecurrentesResult.error) {
    throw new Error(egresosRecurrentesResult.error.message);
  }

  const suscripciones = (suscripcionesResult.data ?? []) as SuscripcionSugeridaRow[];
  const clienteIds = [...new Set(suscripciones.map((suscripcion) => suscripcion.cliente_id).filter(Boolean))];
  const clientesMap = new Map<string, string>();

  if (clienteIds.length > 0) {
    const { data: clientesData, error: clientesError } = await supabase
      .from("clientes")
      .select("id, empresa")
      .in("id", clienteIds)
      .returns<ClienteMiniRow[]>();

    if (clientesError) {
      throw new Error(clientesError.message);
    }

    for (const cliente of clientesData ?? []) {
      clientesMap.set(cliente.id, cliente.empresa);
    }
  }

  const suggestedItems: PresupuestoItemInsert[] = [
    ...((cobrosResult.data ?? []) as CobroSugeridoRow[]).map((cobro) => ({
      presupuesto_id: presupuestoId,
      tipo: "ingreso",
      origen: "cobro_existente",
      referencia_id: cobro.id,
      concepto: cobro.concepto,
      monto: cobro.monto,
      incluido: true
    })),
    ...suscripciones.map((suscripcion) => ({
      presupuesto_id: presupuestoId,
      tipo: "ingreso",
      origen: "suscripcion",
      referencia_id: suscripcion.id,
      concepto: `${suscripcion.tipo === "brick" ? "Brick" : "Mantenimiento"} · ${clientesMap.get(suscripcion.cliente_id) ?? "Cliente"}`,
      monto: suscripcion.monto_mensual,
      incluido: true
    })),
    ...((egresosRecurrentesResult.data ?? []) as EgresoRecurrenteSugeridoRow[]).map((egreso) => ({
      presupuesto_id: presupuestoId,
      tipo: "egreso",
      origen: "egreso_recurrente",
      referencia_id: egreso.id,
      concepto: egreso.concepto,
      monto: egreso.monto,
      incluido: true
    }))
  ];

  if (suggestedItems.length === 0) {
    return [] as PresupuestoItem[];
  }

  const { data, error } = await supabase.from("presupuesto_items").insert(suggestedItems).select("*");
  if (error) {
    throw new Error(error.message);
  }

  return ordenarPresupuestoItems((data ?? []) as PresupuestoItem[]);
}

async function ensurePresupuesto(supabase: SupabaseClient<Database>, mes: string) {
  const normalizedMonth = normalizarMesPresupuesto(mes);
  if (!normalizedMonth) {
    throw new Error("Mes inválido");
  }

  const existing = await fetchPresupuestoRowByMonth(supabase, normalizedMonth);
  if (existing) {
    return recalculatePresupuesto(supabase, existing);
  }

  const previousMonth = getPreviousPresupuestoMonth(normalizedMonth);
  let cajaInicial = 0;

  if (previousMonth) {
    const previousBudget = await fetchPresupuestoRowByMonth(supabase, previousMonth);
    if (previousBudget) {
      const previousHydrated = await recalculatePresupuesto(supabase, previousBudget);
      cajaInicial = previousHydrated.caja_final_proyectada_usd;
    } else {
      cajaInicial = await calcularCajaActualReal(supabase);
    }
  } else {
    cajaInicial = await calcularCajaActualReal(supabase);
  }

  const insertPayload: PresupuestoInsert = {
    mes: `${normalizedMonth}-01`,
    caja_inicial_usd: cajaInicial,
    caja_final_proyectada_usd: cajaInicial
  };

  const { data: inserted, error: insertError } = await supabase
    .from("presupuestos_mensuales")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "No se pudo crear el presupuesto.");
  }

  const items = await buildSuggestedItems(supabase, normalizedMonth, inserted.id);
  const hydrated = hidratarPresupuesto(inserted as PresupuestoRow, items);

  const { error: updateError } = await supabase
    .from("presupuestos_mensuales")
    .update({ caja_final_proyectada_usd: hydrated.caja_final_proyectada_usd })
    .eq("id", inserted.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return hydrated;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ mes: string }> }) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { mes } = await context.params;
    const supabase = createAdminClient() as SupabaseClient<Database>;
    const presupuesto = await ensurePresupuesto(supabase, mes);

    return NextResponse.json({ data: presupuesto });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Mes inválido" ? 400 : 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ mes: string }> }) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { mes } = await context.params;
    const body = (await request.json()) as PresupuestoPatchInput;
    const supabase = createAdminClient() as SupabaseClient<Database>;
    const presupuesto = await ensurePresupuesto(supabase, mes);

    if ("item_id" in body) {
      const updatePayload: Partial<PresupuestoItemRow> = {};

      if (typeof body.incluido === "boolean") {
        updatePayload.incluido = body.incluido;
      }

      if (body.concepto != null) {
        if (!body.concepto.trim()) {
          return NextResponse.json({ error: "concepto is required" }, { status: 400 });
        }
        updatePayload.concepto = body.concepto.trim();
      }

      if (body.monto != null) {
        if (!isValidMonto(body.monto)) {
          return NextResponse.json({ error: "monto must be a valid number" }, { status: 400 });
        }
        updatePayload.monto = body.monto;
      }

      if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ data: presupuesto });
      }

      const { error } = await supabase
        .from("presupuesto_items")
        .update(updatePayload)
        .eq("id", body.item_id)
        .eq("presupuesto_id", presupuesto.id);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      if (!body.concepto?.trim()) {
        return NextResponse.json({ error: "concepto is required" }, { status: 400 });
      }

      if (!isValidMonto(body.monto)) {
        return NextResponse.json({ error: "monto must be a valid number" }, { status: 400 });
      }

      const insertPayload: PresupuestoItemInsert = {
        presupuesto_id: presupuesto.id,
        tipo: body.tipo,
        origen: body.origen ?? "manual",
        referencia_id: null,
        concepto: body.concepto.trim(),
        monto: body.monto,
        incluido: body.incluido ?? true
      };

      const { error } = await supabase.from("presupuesto_items").insert(insertPayload);
      if (error) {
        throw new Error(error.message);
      }
    }

    const refreshed = await fetchPresupuestoRowByMonth(supabase, mes);
    if (!refreshed) {
      throw new Error("No se encontró el presupuesto actualizado.");
    }

    const updated = await recalculatePresupuesto(supabase, refreshed);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: message === "Mes inválido" ? 400 : 500 });
  }
}
