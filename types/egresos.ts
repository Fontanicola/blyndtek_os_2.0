import type { CuentaMedio } from "@/types/cobros";

export type CategoriaEgreso =
  | "dominios"
  | "hosting_infraestructura"
  | "herramientas_software"
  | "marketing_ads"
  | "impuestos_contable"
  | "sueldos_honorarios"
  | "comisiones"
  | "otro"
  | "transferencia";

export type CategoriaEgresoRecurrente = Exclude<CategoriaEgreso, "transferencia">;

export type Egreso = {
  id: string;
  concepto: string;
  categoria: CategoriaEgreso;
  monto: number;
  fecha: string;
  recurrente: boolean;
  recurrente_config_id: string | null;
  caja_id: string | null;
  cuenta_medio: CuentaMedio | null;
  pagado: boolean;
  fecha_pago: string | null;
  cliente_id: string | null;
  proyecto_id: string | null;
  comision_id: string | null;
  notas: string | null;
  created_at: string;
};

export type CreateEgresoInput = {
  concepto: string;
  categoria: CategoriaEgreso;
  monto: number;
  fecha: string;
  recurrente?: boolean;
  recurrente_config_id?: string | null;
  caja_id?: string | null;
  cuenta_medio?: CuentaMedio | null;
  pagado?: boolean;
  fecha_pago?: string | null;
  cliente_id?: string | null;
  proyecto_id?: string | null;
  comision_id?: string | null;
  notas?: string | null;
};

export type UpdateEgresoInput = Partial<CreateEgresoInput>;

export type EgresoRecurrenteConfig = {
  id: string;
  concepto: string;
  categoria: CategoriaEgresoRecurrente;
  monto: number;
  cliente_id: string | null;
  proyecto_id: string | null;
  caja_id: string | null;
  dia_pago: number;
  activo: boolean;
  fecha_inicio: string;
  created_at: string;
};

export type EgresoRecurrenteHistorialItem = {
  month: string;
  label: string;
  pagado: boolean;
  exists: boolean;
  egreso_id: string | null;
};
