export type TipoCobro = "one_pay" | "hito" | "mantenimiento" | "brick";
export type EstadoCobro = "pendiente" | "facturado" | "cobrado" | "vencido";
export type CuentaMedio = string;

export type CobroHistorialCambio = {
  id: string;
  cobro_id: string;
  monto_anterior: number | null;
  monto_nuevo: number | null;
  fecha_anterior: string | null;
  fecha_nueva: string | null;
  nota: string | null;
  modificado_por: string | null;
  modificado_por_nombre?: string | null;
  created_at: string;
};

export type Cobro = {
  id: string;
  cliente_id: string;
  cliente?: {
    empresa: string;
  } | null;
  proyecto_id: string | null;
  suscripcion_id: string | null;
  cotizacion_id: string | null;
  concepto: string;
  tipo: TipoCobro;
  monto: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_cobro: string | null;
  cuenta_medio: CuentaMedio | null;
  tolerancia_dias: number;
  estado: EstadoCobro;
  created_at: string;
  historial?: CobroHistorialCambio[];
};

export type CreateCobroInput = {
  cliente_id: string;
  proyecto_id?: string | null;
  suscripcion_id?: string | null;
  cotizacion_id?: string | null;
  concepto: string;
  tipo: TipoCobro;
  monto: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_cobro?: string | null;
  cuenta_medio?: CuentaMedio | null;
  tolerancia_dias?: number;
  estado?: EstadoCobro;
};

export type UpdateCobroInput = Partial<CreateCobroInput> & {
  nota_historial?: string | null;
};
