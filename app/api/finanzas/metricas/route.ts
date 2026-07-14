import { NextResponse } from "next/server";
import { buildMonthlyFinancialSeries } from "@/lib/finanzas";
import { calcularEgresosPeriodo } from "@/lib/finanzas/calcularEgresosPeriodo";
import { calculateRunwayProjection } from "@/lib/finanzas/runwayProjection";
import { isCobroVencido } from "@/lib/finanzas";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cobro } from "@/types/cobros";
import type { Comision } from "@/types/comisiones";
import type { ConfigFinanzas, MetricasFinanzas } from "@/types/finanzas";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";

function currentMonthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [
      { data: configRows, error: configError },
      { data: cobrosRows, error: cobrosError },
      { data: egresosRows, error: egresosError },
      { data: suscripcionesRows, error: suscripcionesError },
      { data: comisionesRows, error: comisionesError }
    ] = await Promise.all([
      supabase.from("config_finanzas").select("*").order("updated_at", { ascending: false }).limit(1),
      supabase.from("cobros").select("*"),
      supabase.from("egresos").select("*"),
      supabase.from("suscripciones").select("*").eq("estado", "activa"),
      supabase.from("comisiones").select("monto_comision, estado").eq("estado", "pendiente")
    ]);

    const errors = [configError, cobrosError, egresosError, suscripcionesError, comisionesError].filter(Boolean);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0]?.message ?? "No se pudieron calcular las métricas" }, { status: 500 });
    }

    const config = (configRows?.[0] ?? { id: "config_finanzas", caja_inicial: 0, updated_at: new Date().toISOString() }) as ConfigFinanzas;
    const cobros = (cobrosRows ?? []) as Cobro[];
    const egresos = (egresosRows ?? []) as Egreso[];
    const suscripciones = (suscripcionesRows ?? []) as Suscripcion[];
    const comisionesPendientes = (comisionesRows ?? []) as Array<Pick<Comision, "monto_comision" | "estado">>;

    const today = new Date();
    const { start: monthStart, end: monthEnd } = currentMonthBounds(today);
    const mrr = suscripciones.reduce((total, item) => total + item.monto_mensual, 0);

    const cobrosPendientes = cobros
      .filter((cobro) => cobro.estado === "pendiente")
      .reduce((total, cobro) => total + cobro.monto, 0);

    const cobrosVencidos = cobros.filter((cobro) => isCobroVencido(cobro, today)).reduce((total, cobro) => total + cobro.monto, 0);
    const comisionesPendientesUsd = comisionesPendientes.reduce((total, comision) => total + comision.monto_comision, 0);

    const ingresosMes = cobros
      .filter((cobro) => cobro.estado === "cobrado" && cobro.fecha_cobro)
      .filter((cobro) => {
        const fecha = new Date(cobro.fecha_cobro ?? cobro.fecha_emision);
        return fecha >= monthStart && fecha < monthEnd;
      })
      .reduce((total, cobro) => total + cobro.monto, 0);

    const egresosMes = calcularEgresosPeriodo(egresos, monthStart, monthEnd)
      .reduce((total, egreso) => total + egreso.monto, 0);

    const plMes = ingresosMes - egresosMes;
    const cajaActual =
      config.caja_inicial +
      cobros.filter((cobro) => cobro.estado === "cobrado").reduce((total, cobro) => total + cobro.monto, 0) -
      egresos.filter((egreso) => egreso.pagado).reduce((total, egreso) => total + egreso.monto, 0);
    const runwayProjection = calculateRunwayProjection(cajaActual, cobros, egresos, suscripciones, today);
    const historicoPl = buildMonthlyFinancialSeries(cobros, egresos, suscripciones, 12);

    const metricas: MetricasFinanzas = {
      mrr,
      cobros_pendientes: cobrosPendientes,
      cobros_vencidos: cobrosVencidos,
      comisiones_pendientes_usd: comisionesPendientesUsd,
      ingresos_mes: ingresosMes,
      egresos_mes: egresosMes,
      pl_mes: plMes,
      caja_actual: cajaActual,
      quema_neta: runwayProjection.monthlyBurn,
      runway_meses: runwayProjection.runwayMonths,
      runway_estado: runwayProjection.runwayStatus,
      historico_pl: historicoPl
    };

    return NextResponse.json({ data: metricas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
