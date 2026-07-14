import type { EventoInvitado, EventoInvitadoDetalle, EstadoEventoInvitado } from "@/types/eventos";

export type {
  EventoInvitado,
  EventoInvitadoDetalle,
  EstadoEventoInvitado
};

export type InvitacionPendienteEvento = EventoInvitadoDetalle & {
  evento_titulo: string;
  evento_fecha_inicio: string;
  evento_fecha_fin: string;
  organizador_id: string;
  organizador_nombre: string;
};

export type InvitacionEventoResumen = EventoInvitado & {
  evento_titulo: string;
  evento_fecha_inicio: string;
  evento_fecha_fin: string;
  organizador_nombre: string;
};
