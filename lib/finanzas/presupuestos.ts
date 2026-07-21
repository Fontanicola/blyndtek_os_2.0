import { addMonths, formatMonthKey, formatMonthLabel, startOfMonth } from "@/lib/finanzas";
import type { PresupuestoItem, PresupuestoMensual } from "@/types/presupuestos";

export function normalizarMesPresupuesto(mes: string) {
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return null;
  }

  const date = new Date(`${mes}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatMonthKey(startOfMonth(date));
}

export function presupuestoMesAFecha(mes: string) {
  const normalized = normalizarMesPresupuesto(mes);
  if (!normalized) {
    return null;
  }

  return `${normalized}-01`;
}

export function presupuestoMesALabel(mes: string) {
  const normalized = normalizarMesPresupuesto(mes);
  if (!normalized) {
    return mes;
  }

  return formatMonthLabel(new Date(`${normalized}-01T00:00:00`));
}

export function getPreviousPresupuestoMonth(mes: string) {
  const normalized = normalizarMesPresupuesto(mes);
  if (!normalized) {
    return null;
  }

  return formatMonthKey(addMonths(new Date(`${normalized}-01T00:00:00`), -1));
}

export function getPresupuestoMonthBounds(mes: string) {
  const normalized = normalizarMesPresupuesto(mes);
  if (!normalized) {
    return null;
  }

  const monthDate = startOfMonth(new Date(`${normalized}-01T00:00:00`));
  const nextMonth = addMonths(monthDate, 1);

  return {
    monthKey: normalized,
    monthLabel: formatMonthLabel(monthDate),
    from: `${normalized}-01`,
    to: `${formatMonthKey(nextMonth)}-01`
  };
}

export function calcularTotalesPresupuesto(items: PresupuestoItem[]) {
  return items.reduce(
    (acc, item) => {
      if (!item.incluido) {
        return acc;
      }

      if (item.tipo === "ingreso") {
        acc.ingresos += item.monto;
      } else {
        acc.egresos += item.monto;
      }

      return acc;
    },
    { ingresos: 0, egresos: 0 }
  );
}

export function hidratarPresupuesto(
  presupuesto: {
    id: string;
    mes: string;
    caja_inicial_usd: number | null;
    caja_final_proyectada_usd: number | null;
  },
  items: PresupuestoItem[]
) {
  const totals = calcularTotalesPresupuesto(items);
  const cajaInicial = Number(presupuesto.caja_inicial_usd ?? 0);

  return {
    id: presupuesto.id,
    mes: presupuesto.mes,
    caja_inicial_usd: cajaInicial,
    caja_final_proyectada_usd: cajaInicial + totals.ingresos - totals.egresos,
    items,
    ingresos_incluidos_usd: totals.ingresos,
    egresos_incluidos_usd: totals.egresos
  } satisfies PresupuestoMensual;
}

export function ordenarPresupuestoItems(items: PresupuestoItem[]) {
  const typeOrder: Record<PresupuestoItem["tipo"], number> = {
    ingreso: 0,
    egreso: 1
  };
  const originOrder: Record<PresupuestoItem["origen"], number> = {
    cobro_existente: 0,
    suscripcion: 1,
    egreso_recurrente: 2,
    manual: 3
  };

  return [...items].sort((first, second) => {
    const typeDiff = typeOrder[first.tipo] - typeOrder[second.tipo];
    if (typeDiff !== 0) {
      return typeDiff;
    }

    const originDiff = originOrder[first.origen] - originOrder[second.origen];
    if (originDiff !== 0) {
      return originDiff;
    }

    return first.concepto.localeCompare(second.concepto, "es");
  });
}
