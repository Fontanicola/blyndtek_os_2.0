import type { CuentaMedio } from "@/types/cobros";

export type CategoriaEgreso =
  | "dominios"
  | "hosting_infraestructura"
  | "herramientas_software"
  | "marketing_ads"
  | "impuestos_contable"
  | "sueldos_honorarios"
  | "comisiones"
  | "otro";

export type Egreso = {
  id: string;
  concepto: string;
  categoria: CategoriaEgreso;
  monto: number;
  fecha: string;
  recurrente: boolean;
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
  cuenta_medio?: CuentaMedio | null;
  pagado?: boolean;
  fecha_pago?: string | null;
  cliente_id?: string | null;
  proyecto_id?: string | null;
  comision_id?: string | null;
  notas?: string | null;
};

export type UpdateEgresoInput = Partial<CreateEgresoInput>;
