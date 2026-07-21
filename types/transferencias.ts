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
