import { formatUSD } from "@/lib/utils/formatters";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";

export type MonthlyFinancialPoint = {
  month: string;
  label: string;
  ingresos: number;
  egresos: number;
  neto: number;
};

export type RunwayPoint = {
  month: string;
  label: string;
  caja: number;
};

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric"
  }).format(date);
}

export function getLastMonths(count: number, from = new Date()) {
  return Array.from({ length: count }, (_value, index) => addMonths(startOfMonth(from), index - (count - 1)));
}

export function buildMonthlyFinancialSeries(cobros: Cobro[], egresos: Egreso[], months = 6) {
  const monthList = getLastMonths(months);

  return monthList.map((monthDate) => {
    const monthKey = formatMonthKey(monthDate);
    const nextMonth = addMonths(monthDate, 1);
    const ingresos = cobros
      .filter((cobro) => cobro.estado === "cobrado")
      .filter((cobro) => {
        const date = new Date(cobro.fecha_cobro ?? cobro.fecha_emision);
        return formatMonthKey(date) === monthKey;
      })
      .reduce((total, cobro) => total + cobro.monto, 0);

    const egresosMes = egresos
      .filter((egreso) => {
        const date = new Date(egreso.fecha);
        return date >= monthDate && date < nextMonth;
      })
      .reduce((total, egreso) => total + egreso.monto, 0);

    return {
      month: monthKey,
      label: formatMonthLabel(monthDate),
      ingresos,
      egresos: egresosMes,
      neto: ingresos - egresosMes
    } satisfies MonthlyFinancialPoint;
  });
}

export function buildRunwaySeries(cajaActual: number, quemaNeta: number, months = 12) {
  return Array.from({ length: months + 1 }, (_value, index) => {
    const projected = cajaActual - quemaNeta * index;
    const month = formatMonthKey(addMonths(startOfMonth(new Date()), index));
    return {
      month,
      label: index === 0 ? "Ahora" : `+${index}m`,
      caja: projected
    } satisfies RunwayPoint;
  });
}

export function formatFinanceTrend(value: number) {
  return formatUSD(value);
}
