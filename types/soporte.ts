export type SoporteTicketEstado = "abierto" | "en_progreso" | "esperando_cliente" | "resuelto" | "cerrado";
export type SoporteTicketPrioridad = "baja" | "media" | "alta" | "critica";
export type RevisionCuentaEstado = "pendiente" | "programada" | "realizada" | "cancelada";
export type UpsellEstado = "detectada" | "contactada" | "propuesta" | "ganada" | "perdida";
export type UpsellTipo = "nueva_fase" | "modulo" | "automatizacion" | "mantenimiento";

export type SoporteTicket = {
  id: string;
  cliente_id: string;
  proyecto_id: string | null;
  titulo: string;
  descripcion: string;
  prioridad: SoporteTicketPrioridad;
  sla_horas: number;
  estado: SoporteTicketEstado;
  responsable_id: string | null;
  fecha_limite: string | null;
  resuelto_at: string | null;
  created_at: string;
  updated_at: string;
  cliente_nombre?: string;
  proyecto_nombre?: string | null;
};

export type SoporteHandoff = {
  id: string;
  proyecto_id: string;
  cliente_id: string;
  estado: "pendiente" | "recibido" | "completo";
  fecha_transferencia: string | null;
  checklist: Record<string, boolean>;
  notas: string | null;
  recibido_por: string | null;
  created_at: string;
  updated_at: string;
};

export type RevisionCuenta = {
  id: string;
  cliente_id: string;
  proyecto_id: string | null;
  periodo_inicio: string;
  estado: RevisionCuentaEstado;
  fecha_programada: string | null;
  fecha_realizada: string | null;
  satisfaccion: number | null;
  resumen: string | null;
  decisiones: string | null;
  proximas_acciones: string[];
  cliente_nombre?: string;
  proyecto_nombre?: string | null;
};

export type OportunidadUpsell = {
  id: string;
  cliente_id: string;
  proyecto_id: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: UpsellTipo;
  estado: UpsellEstado;
  prioridad: "baja" | "media" | "alta";
  monto_estimado_usd: number | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  origen: "revision_trimestral" | "soporte" | "delivery" | "comercial";
  responsable_id: string | null;
  created_at: string;
  updated_at: string;
  cliente_nombre?: string;
};
