import type { MonthlyFinancialPoint } from "@/lib/finanzas";
import type { Cobro } from "@/types/cobros";
import type { CategoriaEgreso } from "@/types/egresos";
import type { Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";

export type CarteraClienteItem = {
  cliente_id: string;
  empresa: string;
  total_contrato: number;
  total_cobrado: number;
  total_pendiente: number;
  pct_cobrado: number;
};

export type TesoreriaCajaBalance = {
  id: string | null;
  nombre: string;
  slug: string;
  color: string;
  activa: boolean;
  total_cobrado: number;
  total_egresado: number;
  balance: number;
  ultimo_movimiento: string | null;
  historico: TesoreriaHistoricoPoint[];
  es_sin_asignar?: boolean;
};

export type TesoreriaHistoricoPoint = {
  mes: string;
  cobrado: number;
  egresado: number;
};

export type TesoreriaFinanzas = {
  caja_inicial: number;
  balance_total: number;
  cajas: TesoreriaCajaBalance[];
};

export type MovimientoCaja = {
  id: string;
  tipo: "ingreso" | "egreso";
  concepto: string;
  monto: number;
  fecha: string;
  estado: string;
  cliente_nombre: string | null;
  categoria: CategoriaEgreso | null;
  cobro_tipo: Cobro["tipo"] | null;
};

export type ResumenMovimientosCaja = {
  total_ingresos: number;
  total_egresos: number;
  balance_neto_periodo: number;
};

export type FiltroMovimientosCaja = "ingreso" | "egreso" | "todos";

export type CajaMovimientosPayload = {
  caja_id: string;
  mes: string | null;
  mes_desde: string;
  mes_hasta: string;
  tipo: FiltroMovimientosCaja;
  movimientos: MovimientoCaja[];
  resumen_periodo: ResumenMovimientosCaja;
};

export type MetricasFinanzas = {
  mrr: number;
  facturacion_total: number;
  cobros_pendientes: number;
  cobros_vencidos: number;
  comisiones_pendientes_usd: number;
  ingresos_mes: number;
  egresos_mes: number;
  pl_mes: number;
  caja_actual: number;
  quema_neta: number;
  runway_meses: number | null;
  runway_estado: "normal" | "estable" | "agotado";
  historico_pl: MonthlyFinancialPoint[];
};

export type ConfigFinanzas = {
  id: string;
  caja_inicial: number;
  updated_at: string;
};

export type FinanzaItem = Cobro | Egreso | Suscripcion;
