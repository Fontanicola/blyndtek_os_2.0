import type { Cobro } from "@/types/cobros";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";

export type MetricasFinanzas = {
  mrr: number;
  cobros_pendientes: number;
  cobros_vencidos: number;
  ingresos_mes: number;
  egresos_mes: number;
  pl_mes: number;
  caja_actual: number;
  quema_neta: number;
  runway_meses: number | null;
};

export type ConfigFinanzas = {
  id: string;
  caja_inicial: number;
  updated_at: string;
};

export type FinanzaItem = Cobro | Egreso | Suscripcion;
