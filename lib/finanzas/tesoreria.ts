import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";

export type CalcularBalanceTotalInput = {
  cajaInicial: number;
  cobros: Array<Pick<Cobro, "estado" | "monto">>;
  egresos: Array<Pick<Egreso, "pagado" | "monto">>;
};

export function calcularBalanceTotalTesoreria({ cajaInicial, cobros, egresos }: CalcularBalanceTotalInput) {
  const totalCobrado = cobros.filter((cobro) => cobro.estado === "cobrado").reduce((total, cobro) => total + cobro.monto, 0);
  const totalEgresado = egresos.filter((egreso) => egreso.pagado).reduce((total, egreso) => total + egreso.monto, 0);

  return cajaInicial + totalCobrado - totalEgresado;
}
