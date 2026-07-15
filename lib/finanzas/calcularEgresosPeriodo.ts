import type { Egreso } from "@/types/egresos";

function isValidDate(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function calcularEgresosPeriodo(egresos: Egreso[], start: Date, end: Date, clienteId?: string) {
  return egresos.filter((egreso) => {
    if (!egreso.pagado) {
      return false;
    }

    if (clienteId && egreso.cliente_id !== clienteId) {
      return false;
    }

    if (!isValidDate(egreso.fecha)) {
      return false;
    }

    const fecha = new Date(egreso.fecha);

    if (egreso.recurrente) {
      return fecha < end;
    }

    return fecha >= start && fecha < end;
  });
}
