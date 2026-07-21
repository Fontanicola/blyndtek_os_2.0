export type PresupuestoTipo = "ingreso" | "egreso";

export type PresupuestoOrigen = "cobro_existente" | "suscripcion" | "egreso_recurrente" | "manual";

export type PresupuestoItem = {
  id: string;
  presupuesto_id: string;
  tipo: PresupuestoTipo;
  origen: PresupuestoOrigen;
  referencia_id: string | null;
  concepto: string;
  monto: number;
  incluido: boolean;
  created_at: string;
};

export type PresupuestoMensual = {
  id: string;
  mes: string;
  caja_inicial_usd: number;
  caja_final_proyectada_usd: number;
  items: PresupuestoItem[];
  ingresos_incluidos_usd: number;
  egresos_incluidos_usd: number;
};

export type PresupuestoPatchInput =
  | {
      item_id: string;
      incluido?: boolean;
      monto?: number;
      concepto?: string;
    }
  | {
      tipo: PresupuestoTipo;
      concepto: string;
      monto: number;
      origen?: PresupuestoOrigen;
      incluido?: boolean;
    };
