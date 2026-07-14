export type ConfigComisiones = {
  id: string;
  piso_base_usd: number;
  tier_1_pct: number;
  tier_2_umbral_usd: number;
  tier_2_pct: number;
  bono_ventas_mes_umbral: number;
  bono_monto_usd: number;
  updated_at: string;
};

export type ComisionEstado = "pendiente" | "pagada" | "cancelada";

export type Comision = {
  id: string;
  vendedor_id: string;
  cliente_id: string;
  cotizacion_id: string | null;
  tipo: "venta";
  estado: ComisionEstado;
  monto_venta: number;
  base_comision: number;
  porcentaje: number;
  monto_comision: number;
  config_comisiones_id: string | null;
  pagada_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ComisionListado = Comision & {
  vendedor_nombre: string | null;
  cliente_nombre: string | null;
};
