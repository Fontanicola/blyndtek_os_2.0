import { formatUSD } from "@/lib/utils/formatters";
import { calcularEgresosPeriodo } from "@/lib/finanzas/calcularEgresosPeriodo";
import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";

export type MonthlyFinancialPoint = {
  month: string;
  label: string;
  ingresos: number;
  egresos: number;
  margen: number;
  clientes_activos: number;
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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getEndOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseDateOnly(dateString: string | null | undefined) {
  if (!dateString) {
    return new Date(NaN);
  }

  const [yearPart = "1970", monthPart = "1", dayPart = "1"] = `${dateString}`.split("-");
  const year = Number(yearPart ?? "1970");
  const month = Number(monthPart ?? "1");
  const day = Number(dayPart ?? "1");
  return new Date(year, month - 1, day);
}

export function getCobroEffectiveDueDate(cobro: Pick<Cobro, "fecha_vencimiento" | "tolerancia_dias">) {
  const effectiveDate = parseDateOnly(cobro.fecha_vencimiento);

  if (Number.isNaN(effectiveDate.getTime())) {
    return effectiveDate;
  }

  effectiveDate.setDate(effectiveDate.getDate() + (cobro.tolerancia_dias ?? 0));
  return effectiveDate;
}

export function isCobroVencido(
  cobro: Pick<Cobro, "estado" | "fecha_vencimiento" | "tolerancia_dias">,
  reference = new Date()
) {
  if (cobro.estado === "cobrado") {
    return false;
  }

  if (!cobro.fecha_vencimiento) {
    return false;
  }

  return getCobroEffectiveDueDate(cobro) < startOfDay(reference);
}

export function getLastMonths(count: number, from = new Date()) {
  return Array.from({ length: count }, (_value, index) => addMonths(startOfMonth(from), index - (count - 1)));
}

function countActiveClientsAtDate(suscripciones: Suscripcion[], referenceDate: Date) {
  const activeClients = new Set(
    suscripciones
      .filter((suscripcion) => {
        const fechaInicioOk = !suscripcion.fecha_inicio || new Date(suscripcion.fecha_inicio) <= referenceDate;
        const fechaBajaOk = !suscripcion.fecha_baja || new Date(suscripcion.fecha_baja) > referenceDate;
        return suscripcion.estado === "activa" && fechaInicioOk && fechaBajaOk;
      })
      .map((suscripcion) => suscripcion.cliente_id)
  );

  return activeClients.size;
}

export function buildMonthlyFinancialSeries(
  cobros: Cobro[],
  egresos: Egreso[],
  suscripciones: Suscripcion[],
  months = 12
) {
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

    const egresosMes = calcularEgresosPeriodo(egresos, monthDate, nextMonth)
      .reduce((total, egreso) => total + egreso.monto, 0);
    const margen = ingresos - egresosMes;
    const clientesActivos = countActiveClientsAtDate(suscripciones, getEndOfMonth(monthDate));

    return {
      month: monthKey,
      label: formatMonthLabel(monthDate),
      ingresos,
      egresos: egresosMes,
      margen,
      clientes_activos: clientesActivos
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
