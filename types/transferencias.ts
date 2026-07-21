export type TransferenciaCaja = {
  id: string;
  caja_origen_id: string;
  caja_destino_id: string;
  monto: number;
  fecha: string;
  nota: string | null;
  egreso_id: string;
  cobro_id: string;
  creado_por: string | null;
  created_at: string;
};

export type CreateTransferenciaCajaInput = {
  caja_origen_id: string;
  caja_destino_id: string;
  monto: number;
  fecha: string;
  nota?: string | null;
};

export type TransferenciaCajaListadoItem = TransferenciaCaja & {
  caja_origen_nombre: string;
  caja_destino_nombre: string;
};

export type TransferenciaCajaResponse = {
  data: TransferenciaCajaListadoItem;
};

export type TransferenciasCajaListResponse = {
  data: TransferenciaCajaListadoItem[];
};
