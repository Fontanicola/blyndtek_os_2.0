import type { Suscripcion } from "@/types/suscripciones";
import type { HitoPagoPropuesta } from "@/lib/diagnostico/informe";

export type EstadoContrato = "activo" | "reemplazado";

export type Contrato = {
  id: string;
  cliente_id: string;
  valor_total: number;
  descuento_diagnostico_usd: number;
  adelanto_pct: number;
  fecha_adelanto: string | null;
  cantidad_cuotas: number;
  dia_pago: number;
  fecha_primera_cuota: string;
  valor_mantenimiento_mensual: number | null;
  dia_facturacion_mantenimiento: number | null;
  estado: EstadoContrato;
  reemplaza_a: string | null;
  motivo_redefinicion: string | null;
  created_at: string;
};

export type ContratoCobroResumenItem = {
  cantidad: number;
  monto: number;
};

export type ContratoCobroResumen = Record<"cobrado" | "pendiente" | "facturado" | "vencido", ContratoCobroResumenItem> & {
  total: ContratoCobroResumenItem;
};

export type ContratoDetalle = {
  contrato: Contrato | null;
  cobros_resumen: ContratoCobroResumen;
};

export type CreateContratoInput = {
  valor_total: number;
  lead_id?: string | null;
  adelanto_pct?: number;
  fecha_adelanto?: string | null;
  cantidad_cuotas: number;
  dia_pago: number;
  fecha_primera_cuota: string;
  valor_mantenimiento_mensual?: number | null;
  dia_facturacion_mantenimiento?: number | null;
  hitos_pago?: HitoPagoPropuesta[];
  motivo_redefinicion?: string | null;
};

export type CreateContratoResponse = {
  contrato: Contrato;
  cobros_creados: number;
  cobros_eliminados: number;
  cobros_eliminados_monto: number;
  suscripcion?: Suscripcion | null;
  contrato_anterior_id: string | null;
};
