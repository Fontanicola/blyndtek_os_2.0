export type EstadoCliente = "activo" | "inactivo";

export type DatosFacturacion = {
  cuit?: string;
  razon_social?: string;
  direccion?: string;
  condicion_iva?: string;
};

export type Cliente = {
  id: string;
  lead_id: string | null;
  empresa: string;
  pais: string | null;
  contacto_nombre: string | null;
  contacto_email: string | null;
  contacto_whatsapp: string | null;
  datos_facturacion: DatosFacturacion | null;
  estado: EstadoCliente;
  notas: string | null;
  created_at: string;
};

export type CreateClienteInput = Omit<Cliente, "id" | "created_at">;
export type UpdateClienteInput = Partial<CreateClienteInput>;
