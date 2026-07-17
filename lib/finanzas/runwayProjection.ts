import { addMonths, formatMonthKey, getLastMonths, startOfMonth, type RunwayPoint } from "@/lib/finanzas";
import { calcularEgresosPeriodo } from "@/lib/finanzas/calcularEgresosPeriodo";
import { fechaStringAFechaLocal } from "@/lib/utils/fechas";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";

export type RunwayProjection = {
  mrr: number;
  recurringExpenses: number;
  nonRecurringAverage: number;
  monthlyBurn: number;
  runwayMonths: number | null;
  runwayStatus: "normal" | "estable" | "agotado";
  series: RunwayPoint[];
  cobros_sin_fecha_usd: number;
  suscripciones_sin_fecha_usd: number;
};

export type RunwayProjectionOptions = {
  incluirPendientes?: boolean;
};

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function calculateActiveMrr(suscripciones: Suscripcion[], referenceDate: Date) {
  return suscripciones
    .filter((suscripcion) => {
      const fechaInicio = fechaStringAFechaLocal(suscripcion.fecha_inicio);
      const fechaBaja = fechaStringAFechaLocal(suscripcion.fecha_baja);
      const fechaInicioOk = !suscripcion.fecha_inicio || (fechaInicio != null && !Number.isNaN(fechaInicio.getTime()) && fechaInicio <= referenceDate);
      const fechaBajaOk = !suscripcion.fecha_baja || (fechaBaja != null && !Number.isNaN(fechaBaja.getTime()) && fechaBaja > referenceDate);
      return suscripcion.estado === "activa" && fechaInicioOk && fechaBajaOk;
    })
    .reduce((total, suscripcion) => total + suscripcion.monto_mensual, 0);
}

function calculateRecurringExpenses(egresos: Egreso[], referenceDate: Date) {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = addMonths(monthStart, 1);

  return calcularEgresosPeriodo(egresos, monthStart, monthEnd)
    .filter((egreso) => egreso.recurrente)
    .reduce((total, egreso) => total + egreso.monto, 0);
}

function calculateAverageNonRecurringExpenses(egresos: Egreso[], referenceDate: Date, months = 3) {
  const monthList = getLastMonths(months, referenceDate);

  const monthlyValues = monthList.map((monthDate) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = addMonths(monthStart, 1);

    return calcularEgresosPeriodo(egresos, monthStart, monthEnd)
      .filter((egreso) => !egreso.recurrente)
      .reduce((total, egreso) => total + egreso.monto, 0);
  });

  return monthlyValues.length > 0 ? sum(monthlyValues) / monthlyValues.length : 0;
}

function isValidDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const parsed = fechaStringAFechaLocal(value);
  return parsed != null && !Number.isNaN(parsed.getTime());
}

function getFutureProjectionMonths(referenceDate: Date, months: number) {
  const baseMonth = startOfMonth(referenceDate);
  return Array.from({ length: months }, (_value, index) => addMonths(baseMonth, index + 1));
}

function buildPendingIncomeSchedule(
  cobros: Cobro[],
  suscripciones: Suscripcion[],
  referenceDate: Date,
  months = 12
) {
  const schedule = new Map<string, number>();
  const cobrosFutureMonths = new Set(getFutureProjectionMonths(referenceDate, months).map((monthDate) => formatMonthKey(monthDate)));
  const futureMonths = getFutureProjectionMonths(referenceDate, months);
  let cobrosSinFechaUsd = 0;
  let suscripcionesSinFechaUsd = 0;

  for (const cobro of cobros) {
    if (cobro.estado !== "pendiente") {
      continue;
    }

    if (!isValidDate(cobro.fecha_vencimiento)) {
      cobrosSinFechaUsd += cobro.monto;
      continue;
    }

    const monthKey = formatMonthKey(startOfMonth(fechaStringAFechaLocal(cobro.fecha_vencimiento)));
    if (!cobrosFutureMonths.has(monthKey)) {
      continue;
    }

    schedule.set(monthKey, (schedule.get(monthKey) ?? 0) + cobro.monto);
  }

  for (const suscripcion of suscripciones) {
    if (suscripcion.estado !== "pendiente") {
      continue;
    }

    if (!isValidDate(suscripcion.fecha_inicio)) {
      suscripcionesSinFechaUsd += suscripcion.monto_mensual;
      continue;
    }

    const fechaInicio = fechaStringAFechaLocal(suscripcion.fecha_inicio);
    if (!fechaInicio || Number.isNaN(fechaInicio.getTime())) {
      suscripcionesSinFechaUsd += suscripcion.monto_mensual;
      continue;
    }

    const startMonth = startOfMonth(fechaInicio);

    for (const monthDate of futureMonths) {
      if (monthDate < startMonth) {
        continue;
      }

      const monthKey = formatMonthKey(monthDate);
      schedule.set(monthKey, (schedule.get(monthKey) ?? 0) + suscripcion.monto_mensual);
    }
  }

  return {
    schedule,
    cobrosSinFechaUsd,
    suscripcionesSinFechaUsd
  };
}

function buildSeries(
  cajaActual: number,
  monthlyBurn: number,
  months = 12,
  referenceDate = new Date(),
  extrasByMonth = new Map<string, number>()
) {
  const series: RunwayPoint[] = [
    {
      month: formatMonthKey(startOfMonth(referenceDate)),
      label: "Ahora",
      caja: cajaActual
    }
  ];

  let caja = cajaActual;

  for (let index = 1; index <= months; index += 1) {
    const monthDate = addMonths(startOfMonth(referenceDate), index);
    const month = formatMonthKey(monthDate);
    caja -= monthlyBurn;
    caja += extrasByMonth.get(month) ?? 0;

    series.push({
      month,
      label: `+${index}m`,
      caja
    });
  }

  return series;
}

export function calculateRunwayProjection(
  cajaActual: number,
  cobros: Cobro[],
  egresos: Egreso[],
  suscripciones: Suscripcion[],
  referenceDate = new Date(),
  months = 12,
  options: RunwayProjectionOptions = {}
): RunwayProjection {
  const { incluirPendientes = false } = options;
  const mrr = calculateActiveMrr(suscripciones, referenceDate);
  const recurringExpenses = calculateRecurringExpenses(egresos, referenceDate);
  const nonRecurringAverage = calculateAverageNonRecurringExpenses(egresos, referenceDate, 3);
  const monthlyBurn = recurringExpenses + nonRecurringAverage - mrr;
  const pendingSchedule = buildPendingIncomeSchedule(cobros, suscripciones, referenceDate, months);
  const series = buildSeries(
    cajaActual,
    monthlyBurn,
    months,
    referenceDate,
    incluirPendientes ? pendingSchedule.schedule : new Map()
  );
  const runwayMonths = series.findIndex((point) => point.caja <= 0);
  const runwayStatus = monthlyBurn <= 0 ? "estable" : cajaActual <= 0 ? "agotado" : "normal";

  return {
    mrr,
    recurringExpenses,
    nonRecurringAverage,
    monthlyBurn,
    runwayMonths: runwayMonths === -1 ? null : runwayMonths,
    runwayStatus,
    series,
    cobros_sin_fecha_usd: pendingSchedule.cobrosSinFechaUsd,
    suscripciones_sin_fecha_usd: pendingSchedule.suscripcionesSinFechaUsd
  };
}

export function buildRunwayScenarioSeries(
  baseSeries: RunwayPoint[],
  hypotheses: Array<{ meses: string[]; monto: number }>,
  months = 12
): RunwayPoint[] {
  const extraByMonth = new Map<string, number>();

  for (const hypothesis of hypotheses) {
    for (const month of hypothesis.meses) {
      extraByMonth.set(month, (extraByMonth.get(month) ?? 0) + hypothesis.monto);
    }
  }

  let accumulatedExtra = 0;

  return baseSeries
    .map((point, index) => {
      if (index === 0) {
        return point;
      }

      accumulatedExtra += extraByMonth.get(point.month) ?? 0;
      return {
        ...point,
        caja: point.caja - accumulatedExtra
      } satisfies RunwayPoint;
    })
    .slice(0, months + 1);
}
