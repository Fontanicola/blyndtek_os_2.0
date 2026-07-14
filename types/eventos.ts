export type TipoEvento = "tarea" | "seguimiento" | "vencimiento" | "reunion";
export type EstadoEventoInvitado = "pendiente" | "aceptado" | "rechazado" | "propuesta_alternativa";

export type EventoInvitado = {
  id: string;
  evento_id: string;
  usuario_id: string;
  estado: EstadoEventoInvitado;
  fecha_propuesta_alt: string | null;
  hora_propuesta_alt: string | null;
  comentario: string | null;
  respondido_at: string | null;
  created_at: string;
};

export type EventoInvitadoDetalle = EventoInvitado & {
  usuario_nombre: string;
  usuario_email?: string | null;
  organizador_nombre?: string | null;
  evento_titulo?: string | null;
  evento_fecha_inicio?: string | null;
  evento_fecha_fin?: string | null;
};

export type Evento = {
  id: string;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoEvento;
  usuario_id: string;
  referencia_tipo: "tarea" | "lead" | "cobro";
  referencia_id: string;
  google_event_id: string | null;
  created_at: string;
};

export type EventoConInvitados = Evento & {
  invited_user_ids: string[];
  invitaciones: EventoInvitadoDetalle[];
};

export type CreateEventoInput = {
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoEvento;
  usuario_id: string;
  referencia_tipo?: "tarea" | "lead" | "cobro";
  referencia_id?: string;
  google_event_id?: string | null;
  invited_user_ids?: string[];
};

export type UpdateEventoInput = Partial<CreateEventoInput>;
