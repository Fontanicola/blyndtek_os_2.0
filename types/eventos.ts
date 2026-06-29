export type TipoEvento = "tarea" | "seguimiento" | "vencimiento" | "reunion";

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

export type CreateEventoInput = {
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoEvento;
  usuario_id: string;
  referencia_tipo?: "tarea" | "lead" | "cobro";
  referencia_id?: string;
  google_event_id?: string | null;
};

export type UpdateEventoInput = Partial<CreateEventoInput>;
