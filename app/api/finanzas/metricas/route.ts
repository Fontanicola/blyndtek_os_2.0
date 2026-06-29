import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cobro } from "@/types/cobros";
import type { ConfigFinanzas, MetricasFinanzas } from "@/types/finanzas";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";

function currentMonthBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function getLastMonths(count: number, from = new Date()) {
  return Array.from({ length: count }, (_value, index) => new Date(from.getFullYear(), from.getMonth() - (count - 1 - index), 1));
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [{ data: configRows, error: configError }, { data: cobrosRows, error: cobrosError }, { data: egresosRows, error: egresosError }, { data: suscripcionesRows, error: suscripcionesError }] = await Promise.all([
      supabase.from("config_finanzas").select("*").order("updated_at", { ascending: false }).limit(1),
      supabase.from("cobros").select("*"),
      supabase.from("egresos").select("*"),
      supabase.from("suscripciones").select("*").eq("estado", "activa")
    ]);

    const errors = [configError, cobrosError, egresosError, suscripcionesError].filter(Boolean);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0]?.message ?? "No se pudieron calcular las métricas" }, { status: 500 });
    }

    const config = (configRows?.[0] ?? { id: "config_finanzas", caja_inicial: 0, updated_at: new Date().toISOString() }) as ConfigFinanzas;
    const cobros = (cobrosRows ?? []) as Cobro[];
    const egresos = (egresosRows ?? []) as Egreso[];
    const suscripciones = (suscripcionesRows ?? []) as Suscripcion[];

    const today = new Date();
    const { start: monthStart, end: monthEnd } = currentMonthBounds(today);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const mrr = suscripciones.reduce((total, item) => total + item.monto_mensual, 0);

    const cobrosPendientes = cobros
      .filter((cobro) => cobro.estado === "pendiente")
      .reduce((total, cobro) => total + cobro.monto, 0);

    const cobrosVencidos = cobros
      .filter((cobro) => {
        const vencida =
          cobro.estado === "vencido" ||
          (cobro.estado === "pendiente" && new Date(cobro.fecha_vencimiento) < todayStart);
        return vencida;
      })
      .reduce((total, cobro) => total + cobro.monto, 0);

    const ingresosMes = cobros
      .filter((cobro) => cobro.estado === "cobrado" && cobro.fecha_cobro)
      .filter((cobro) => {
        const fecha = new Date(cobro.fecha_cobro ?? cobro.fecha_emision);
        return fecha >= monthStart && fecha < monthEnd;
      })
      .reduce((total, cobro) => total + cobro.monto, 0);

    const egresosMes = egresos
      .filter((egreso) => {
        const fecha = new Date(egreso.fecha);
        return fecha >= monthStart && fecha < monthEnd;
      })
      .reduce((total, egreso) => total + egreso.monto, 0);

    const plMes = ingresosMes - egresosMes;
    const cajaActual = config.caja_inicial + cobros.filter((cobro) => cobro.estado === "cobrado").reduce((total, cobro) => total + cobro.monto, 0) - egresos.reduce((total, egreso) => total + egreso.monto, 0);

    const lastThreeMonths = getLastMonths(3, today);
    const burnRates = lastThreeMonths.map((monthDate) => {
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

      const ingresos = cobros
        .filter((cobro) => cobro.estado === "cobrado" && cobro.fecha_cobro)
        .filter((cobro) => {
          const fecha = new Date(cobro.fecha_cobro ?? cobro.fecha_emision);
          return fecha >= start && fecha < end;
        })
        .reduce((total, cobro) => total + cobro.monto, 0);

      const egresosMesActual = egresos
        .filter((egreso) => {
          const fecha = new Date(egreso.fecha);
          return fecha >= start && fecha < end;
        })
        .reduce((total, egreso) => total + egreso.monto, 0);

      return egresosMesActual - ingresos;
    });

    const quemaNeta = burnRates.length > 0 ? sum(burnRates) / burnRates.length : 0;
    const runwayMeses = quemaNeta > 0 ? cajaActual / quemaNeta : null;

    const metricas: MetricasFinanzas = {
      mrr,
      cobros_pendientes: cobrosPendientes,
      cobros_vencidos: cobrosVencidos,
      ingresos_mes: ingresosMes,
      egresos_mes: egresosMes,
      pl_mes: plMes,
      caja_actual: cajaActual,
      quema_neta: quemaNeta,
      runway_meses: runwayMeses
    };

    return NextResponse.json({ data: metricas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
