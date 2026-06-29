export type CuentaServicio = {
  id: string;
  proyecto_id: string;
  servicio: string;
  para_que: string | null;
  cuenta_email: string | null;
  notas_acceso: string | null;
  created_at: string;
};

export type CreateCuentaServicioInput = Omit<CuentaServicio, "id" | "created_at">;
export type UpdateCuentaServicioInput = Partial<CreateCuentaServicioInput>;
