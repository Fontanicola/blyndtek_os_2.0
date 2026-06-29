export type TipoCobro = "one_pay" | "hito" | "mantenimiento" | "brick";
export type EstadoCobro = "pendiente" | "facturado" | "cobrado" | "vencido";

export type Cobro = {
  id: string;
  cliente_id: string;
  proyecto_id: string | null;
  suscripcion_id: string | null;
  cotizacion_id: string | null;
  concepto: string;
  tipo: TipoCobro;
  monto: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  fecha_cobro: string | null;
  estado: EstadoCobro;
  created_at: string;
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
  estado?: EstadoCobro;
};

export type UpdateCobroInput = Partial<CreateCobroInput>;
