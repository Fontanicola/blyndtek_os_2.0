export type PrioridadTarea = "alta" | "media" | "baja";

export type EstadoTarea = "nueva" | "en_proceso" | "terminada";

export type Tarea = {
  id: string;
  titulo: string;
  proyecto_id: string | null;
  lead_id: string | null;
  feature_id: string | null;
  responsable_id: string | null;
  fase_nombre?: string | null;
  prioridad: PrioridadTarea;
  fecha_limite: string | null;
  estado: EstadoTarea;
  notas: string | null;
  es_ia?: boolean;
  created_at: string;
};

export type CreateTareaInput = {
  titulo: string;
  proyecto_id?: string | null;
  lead_id?: string | null;
  feature_id?: string | null;
  responsable_id?: string | null;
  prioridad?: PrioridadTarea;
  fecha_limite?: string | null;
  estado?: EstadoTarea;
  notas?: string | null;
};

export type UpdateTareaInput = Partial<CreateTareaInput>;
