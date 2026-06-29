export type TipoSuscripcion = "mantenimiento" | "brick";
export type CicloSuscripcion = "mensual" | "anual";
export type EstadoSuscripcion = "pendiente" | "activa" | "pausada" | "baja";

export type Suscripcion = {
  id: string;
  cliente_id: string;
  proyecto_id: string | null;
  cotizacion_id: string;
  tipo: TipoSuscripcion;
  monto_mensual: number;
  ciclo: CicloSuscripcion;
  fecha_inicio: string | null;
  proxima_cobro: string | null;
  estado: EstadoSuscripcion;
  fecha_baja: string | null;
  motivo_baja: string | null;
  created_at: string;
};

export type CreateSuscripcionInput = {
  cliente_id: string;
  proyecto_id?: string | null;
  cotizacion_id: string;
  tipo: TipoSuscripcion;
  monto_mensual: number;
  ciclo: CicloSuscripcion;
  fecha_inicio?: string | null;
  proxima_cobro?: string | null;
  estado?: EstadoSuscripcion;
  fecha_baja?: string | null;
  motivo_baja?: string | null;
};

export type UpdateSuscripcionInput = Partial<CreateSuscripcionInput>;
