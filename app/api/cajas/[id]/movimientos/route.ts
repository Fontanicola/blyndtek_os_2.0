import { NextRequest, NextResponse } from "next/server";
import { formatMonthKey, startOfMonth } from "@/lib/finanzas";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fechaInputAString, fechaStringAFechaLocal, hoyLocalString } from "@/lib/utils/fechas";
import type { MovimientoCaja, ResumenMovimientosCaja } from "@/types/finanzas";

type CobroMovimientoRow = {
  id: string;
  concepto: string;
  monto: number;
  fecha_cobro: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
  estado: "pendiente" | "facturado" | "cobrado" | "vencido";
  tipo: "one_pay" | "hito" | "mantenimiento" | "brick" | "diagnostico" | "otro" | "transferencia";
  cliente: {
    empresa: string;
  } | null;
};

type EgresoMovimientoRow = {
  id: string;
  concepto: string;
  monto: number;
  fecha_pago: string | null;
  fecha: string;
  pagado: boolean;
  categoria:
    | "dominios"
    | "hosting_infraestructura"
    | "herramientas_software"
    | "marketing_ads"
    | "impuestos_contable"
    | "sueldos_honorarios"
    | "comisiones"
    | "otro"
    | "transferencia";
  cliente: {
    empresa: string;
  } | null;
};

function getCurrentMonthKey() {
  return formatMonthKey(startOfMonth(new Date()));
}

function isMonthKey(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function normalizeRequestedMonth(value: string | null | undefined) {
  if (!isMonthKey(value)) {
    return getCurrentMonthKey();
  }

  return value;
}

function getCobroEffectiveDate(cobro: CobroMovimientoRow) {
  return cobro.fecha_cobro ?? cobro.fecha_vencimiento ?? hoyLocalString(fechaStringAFechaLocal(cobro.created_at) ?? new Date());
}

function getEgresoEffectiveDate(egreso: EgresoMovimientoRow) {
  return egreso.fecha_pago ?? egreso.fecha;
}

function isDateInMonth(dateValue: string | null | undefined, monthKey: string) {
  if (!dateValue) {
    return false;
  }

  const date = fechaStringAFechaLocal(dateValue);
  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }

  return formatMonthKey(startOfMonth(date)) === monthKey;
}

function compareByFechaDesc(a: MovimientoCaja, b: MovimientoCaja) {
  const aDate = fechaStringAFechaLocal(a.fecha);
  const bDate = fechaStringAFechaLocal(b.fecha);

  if (!aDate || !bDate || Number.isNaN(aDate.getTime()) || Number.isNaN(bDate.getTime())) {
    return 0;
  }

  return bDate.getTime() - aDate.getTime();
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cajaId = context.params.id;
    const isSinAsignar = cajaId === "sin_asignar";
    const month = normalizeRequestedMonth(request.nextUrl.searchParams.get("mes"));
    const supabase = createAdminClient();

    const [cobrosResult, egresosResult] = await Promise.all([
      isSinAsignar
        ? supabase
            .from("cobros")
            .select("id, concepto, monto, fecha_cobro, fecha_vencimiento, created_at, estado, tipo, cliente:clientes(empresa)")
            .is("caja_id", null)
        : supabase
            .from("cobros")
            .select("id, concepto, monto, fecha_cobro, fecha_vencimiento, created_at, estado, tipo, cliente:clientes(empresa)")
            .eq("caja_id", cajaId),
      isSinAsignar
        ? supabase
            .from("egresos")
            .select("id, concepto, monto, fecha_pago, fecha, pagado, categoria, cliente:clientes(empresa)")
            .is("caja_id", null)
        : supabase
            .from("egresos")
            .select("id, concepto, monto, fecha_pago, fecha, pagado, categoria, cliente:clientes(empresa)")
            .eq("caja_id", cajaId)
    ]);

    if (cobrosResult.error) {
      return NextResponse.json({ error: cobrosResult.error.message }, { status: 500 });
    }

    if (egresosResult.error) {
      return NextResponse.json({ error: egresosResult.error.message }, { status: 500 });
    }

    const cobros = ((cobrosResult.data ?? []) as CobroMovimientoRow[])
      .filter((cobro) => isDateInMonth(getCobroEffectiveDate(cobro), month))
      .map(
        (cobro) =>
          ({
            id: cobro.id,
            tipo: "ingreso",
            concepto: cobro.concepto,
            monto: cobro.monto,
            fecha: fechaInputAString(getCobroEffectiveDate(cobro)),
            estado: cobro.estado,
            cliente_nombre: cobro.cliente?.empresa ?? null,
            categoria: null,
            cobro_tipo: cobro.tipo
          }) satisfies MovimientoCaja
      );

    const egresos = ((egresosResult.data ?? []) as EgresoMovimientoRow[])
      .filter((egreso) => isDateInMonth(getEgresoEffectiveDate(egreso), month))
      .map(
        (egreso) =>
          ({
            id: egreso.id,
            tipo: "egreso",
            concepto: egreso.concepto,
            monto: egreso.monto,
            fecha: fechaInputAString(getEgresoEffectiveDate(egreso)),
            estado: egreso.pagado ? "pagado" : "pendiente",
            cliente_nombre: egreso.cliente?.empresa ?? null,
            categoria: egreso.categoria,
            cobro_tipo: null
          }) satisfies MovimientoCaja
      );

    const movimientos = [...cobros, ...egresos].sort(compareByFechaDesc);

    const resumenMes: ResumenMovimientosCaja = {
      total_ingresos: cobros.reduce((total, item) => total + item.monto, 0),
      total_egresos: egresos.reduce((total, item) => total + item.monto, 0),
      balance_neto_mes: cobros.reduce((total, item) => total + item.monto, 0) - egresos.reduce((total, item) => total + item.monto, 0)
    };

    return NextResponse.json({
      data: {
        caja_id: cajaId,
        mes: month,
        movimientos,
        resumen_mes: resumenMes
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
