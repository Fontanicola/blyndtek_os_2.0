import { NextRequest, NextResponse } from "next/server";
import { getLegacyCuentaMedioValues } from "@/lib/cajas";
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

type CajaRow = {
  id: string;
  slug: string;
};

function getCurrentMonthKey() {
  return formatMonthKey(startOfMonth(new Date()));
}

function isMonthKey(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function normalizeRequestedType(value: string | null | undefined): "ingreso" | "egreso" | "todos" {
  if (value === "ingreso" || value === "egreso") {
    return value;
  }

  return "todos";
}

function normalizeRequestedRange(searchParams: URLSearchParams) {
  const legacyMonth = searchParams.get("mes");
  const mesDesdeParam = searchParams.get("mes_desde") ?? legacyMonth;
  const mesHastaParam = searchParams.get("mes_hasta");
  const defaultMonth = getCurrentMonthKey();
  const mesDesde = isMonthKey(mesDesdeParam) ? mesDesdeParam : defaultMonth;
  const mesHastaCandidate = isMonthKey(mesHastaParam) ? mesHastaParam : null;

  if (!mesHastaCandidate) {
    return {
      mesDesde,
      mesHasta: mesDesde
    };
  }

  if (mesHastaCandidate < mesDesde) {
    return {
      mesDesde: mesHastaCandidate,
      mesHasta: mesDesde
    };
  }

  return {
    mesDesde,
    mesHasta: mesHastaCandidate
  };
}

function getCobroEffectiveDate(cobro: CobroMovimientoRow) {
  return cobro.fecha_cobro ?? cobro.fecha_vencimiento ?? hoyLocalString(fechaStringAFechaLocal(cobro.created_at) ?? new Date());
}

function getEgresoEffectiveDate(egreso: EgresoMovimientoRow) {
  return egreso.fecha_pago ?? egreso.fecha;
}

function isDateInRange(dateValue: string | null | undefined, mesDesde: string, mesHasta: string) {
  if (!dateValue) {
    return false;
  }

  const date = fechaStringAFechaLocal(dateValue);
  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }

  const monthKey = formatMonthKey(startOfMonth(date));
  return monthKey >= mesDesde && monthKey <= mesHasta;
}

function compareByFechaDesc(a: MovimientoCaja, b: MovimientoCaja) {
  const aDate = fechaStringAFechaLocal(a.fecha);
  const bDate = fechaStringAFechaLocal(b.fecha);

  if (!aDate || !bDate || Number.isNaN(aDate.getTime()) || Number.isNaN(bDate.getTime())) {
    return 0;
  }

  return bDate.getTime() - aDate.getTime();
}

function dedupeRowsById<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function dedupeMovimientos(rows: MovimientoCaja[]) {
  return Array.from(new Map(rows.map((row) => [`${row.tipo}:${row.id}`, row])).values());
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cajaId = context.params.id;
    const isSinAsignar = cajaId === "sin_asignar";
    const { mesDesde, mesHasta } = normalizeRequestedRange(request.nextUrl.searchParams);
    const tipoFiltro = normalizeRequestedType(request.nextUrl.searchParams.get("tipo"));
    const supabase = createAdminClient();

    let matchValues: string[] = [];

    if (!isSinAsignar) {
      const { data: caja, error: cajaError } = await supabase.from("cajas").select("id, slug").eq("id", cajaId).maybeSingle();

      if (cajaError) {
        return NextResponse.json({ error: cajaError.message }, { status: 500 });
      }

      if (!caja) {
        return NextResponse.json({ error: "Caja no encontrada." }, { status: 404 });
      }

      const cajaRow = caja as CajaRow;
      matchValues = Array.from(new Set([cajaRow.slug, ...getLegacyCuentaMedioValues(cajaRow.slug)]));
    }

    const includeIngresos = tipoFiltro === "todos" || tipoFiltro === "ingreso";
    const includeEgresos = tipoFiltro === "todos" || tipoFiltro === "egreso";

    const [cobrosByCajaResult, cobrosByCuentaResult, egresosByCajaResult, egresosByCuentaResult] = await Promise.all([
      !includeIngresos
        ? Promise.resolve({ data: [] as CobroMovimientoRow[], error: null })
        : isSinAsignar
        ? supabase
            .from("cobros")
            .select("id, concepto, monto, fecha_cobro, fecha_vencimiento, created_at, estado, tipo, cliente:clientes(empresa)")
            .eq("estado", "cobrado")
            .is("caja_id", null)
            .is("cuenta_medio", null)
        : supabase
            .from("cobros")
            .select("id, concepto, monto, fecha_cobro, fecha_vencimiento, created_at, estado, tipo, cliente:clientes(empresa)")
            .eq("estado", "cobrado")
            .eq("caja_id", cajaId),
      !includeIngresos || isSinAsignar || matchValues.length === 0
        ? Promise.resolve({ data: [] as CobroMovimientoRow[], error: null })
        : supabase
            .from("cobros")
            .select("id, concepto, monto, fecha_cobro, fecha_vencimiento, created_at, estado, tipo, cliente:clientes(empresa)")
            .eq("estado", "cobrado")
            .in("cuenta_medio", matchValues),
      !includeEgresos
        ? Promise.resolve({ data: [] as EgresoMovimientoRow[], error: null })
        : isSinAsignar
        ? supabase
            .from("egresos")
            .select("id, concepto, monto, fecha_pago, fecha, pagado, categoria, cliente:clientes(empresa)")
            .eq("pagado", true)
            .is("caja_id", null)
            .is("cuenta_medio", null)
        : supabase
            .from("egresos")
            .select("id, concepto, monto, fecha_pago, fecha, pagado, categoria, cliente:clientes(empresa)")
            .eq("pagado", true)
            .eq("caja_id", cajaId),
      !includeEgresos || isSinAsignar || matchValues.length === 0
        ? Promise.resolve({ data: [] as EgresoMovimientoRow[], error: null })
        : supabase
            .from("egresos")
            .select("id, concepto, monto, fecha_pago, fecha, pagado, categoria, cliente:clientes(empresa)")
            .eq("pagado", true)
            .in("cuenta_medio", matchValues)
    ]);

    const cobrosError = cobrosByCajaResult.error ?? cobrosByCuentaResult.error;
    const egresosError = egresosByCajaResult.error ?? egresosByCuentaResult.error;

    if (cobrosError) {
      return NextResponse.json({ error: cobrosError.message }, { status: 500 });
    }

    if (egresosError) {
      return NextResponse.json({ error: egresosError.message }, { status: 500 });
    }

    const cobrosSource = dedupeRowsById([
      ...((cobrosByCajaResult.data ?? []) as CobroMovimientoRow[]),
      ...((cobrosByCuentaResult.data ?? []) as CobroMovimientoRow[])
    ]);
    const egresosSource = dedupeRowsById([
      ...((egresosByCajaResult.data ?? []) as EgresoMovimientoRow[]),
      ...((egresosByCuentaResult.data ?? []) as EgresoMovimientoRow[])
    ]);

    const cobros = cobrosSource
      .filter((cobro) => isDateInRange(getCobroEffectiveDate(cobro), mesDesde, mesHasta))
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

    const egresos = egresosSource
      .filter((egreso) => isDateInRange(getEgresoEffectiveDate(egreso), mesDesde, mesHasta))
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

    const movimientos = dedupeMovimientos([...cobros, ...egresos]).sort(compareByFechaDesc);
    const resumenIngresos = movimientos
      .filter((item) => item.tipo === "ingreso")
      .reduce((total, item) => total + item.monto, 0);
    const resumenEgresos = movimientos
      .filter((item) => item.tipo === "egreso")
      .reduce((total, item) => total + item.monto, 0);

    const resumenPeriodo: ResumenMovimientosCaja = {
      total_ingresos: resumenIngresos,
      total_egresos: resumenEgresos,
      balance_neto_periodo: resumenIngresos - resumenEgresos
    };

    return NextResponse.json({
      data: {
        caja_id: cajaId,
        mes: mesDesde === mesHasta ? mesDesde : null,
        mes_desde: mesDesde,
        mes_hasta: mesHasta,
        tipo: tipoFiltro,
        movimientos,
        resumen_periodo: resumenPeriodo
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
