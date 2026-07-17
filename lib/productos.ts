import { formatMonthKey, formatMonthLabel, getLastMonths } from "@/lib/finanzas";
import { fechaStringAFechaLocal } from "@/lib/utils/fechas";
import type { DashboardPeriod } from "@/types/dashboard";
import type { Suscripcion } from "@/types/suscripciones";

export type ProductPeriodRange = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

export function getProductPeriodRange(period: DashboardPeriod): ProductPeriodRange {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  if (period === "quarter") {
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    const previousEnd = new Date(start);
    const previousStart = startOfMonth(new Date(start.getFullYear(), start.getMonth() - 3, 1));

    return {
      start,
      end: now,
      previousStart,
      previousEnd,
      label: "Último trimestre"
    };
  }

  if (period === "year") {
    const start = startOfYear(now);
    const previousEnd = new Date(start);
    const previousStart = new Date(start.getFullYear() - 1, 0, 1);

    return {
      start,
      end: now,
      previousStart,
      previousEnd,
      label: "Este año"
    };
  }

  const start = startOfMonth(now);
  const previousEnd = new Date(start);
  const previousStart = startOfMonth(new Date(start.getFullYear(), start.getMonth() - 1, 1));

  return {
    start,
    end: now,
    previousStart,
    previousEnd,
    label: "Este mes"
  };
}

function isActiveAtDate(suscripcion: Suscripcion, referenceDate: Date) {
  const fechaInicioOk = !suscripcion.fecha_inicio || fechaStringAFechaLocal(suscripcion.fecha_inicio) <= referenceDate;
  const fechaBajaOk = !suscripcion.fecha_baja || fechaStringAFechaLocal(suscripcion.fecha_baja) > referenceDate;
  return suscripcion.estado === "activa" && fechaInicioOk && fechaBajaOk;
}

export function calculateProductMrrAtDate(suscripciones: Suscripcion[], productoId: string, referenceDate: Date) {
  return suscripciones
    .filter((suscripcion) => suscripcion.producto_id === productoId)
    .filter((suscripcion) => isActiveAtDate(suscripcion, referenceDate))
    .reduce((total, suscripcion) => total + suscripcion.monto_mensual, 0);
}

export function calculateProductActiveCount(suscripciones: Suscripcion[], productoId: string) {
  return suscripciones.filter((suscripcion) => suscripcion.producto_id === productoId && suscripcion.estado === "activa").length;
}

export function countProductActiveAtDate(suscripciones: Suscripcion[], productoId: string, referenceDate: Date) {
  return suscripciones.filter((suscripcion) => suscripcion.producto_id === productoId && isActiveAtDate(suscripcion, referenceDate)).length;
}

export function buildProductMonthlyMrrSeries(suscripciones: Suscripcion[], productoId: string, months = 6) {
  const monthList = getLastMonths(months);

  return monthList.map((monthDate) => {
    const monthKey = formatMonthKey(monthDate);
    const mrr = calculateProductMrrAtDate(
      suscripciones,
      productoId,
      new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999)
    );

    return {
      month: monthKey,
      label: formatMonthLabel(monthDate),
      mrr
    };
  });
}

export function getProductCurrentBaseMetrics(suscripciones: Suscripcion[], productoId: string, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(23, 59, 59, 999);

  return {
    suscriptoresActivos: calculateProductActiveCount(suscripciones, productoId),
    mrr: calculateProductMrrAtDate(suscripciones, productoId, today)
  };
}
