export type PrioridadTarea = "alta" | "media" | "baja";

export type EstadoTarea = "nueva" | "en_proceso" | "terminada";

export type Tarea = {
  id: string;
  titulo: string;
  proyecto_id: string | null;
  responsable_id: string;
  prioridad: PrioridadTarea;
  fecha_limite: string | null;
  estado: EstadoTarea;
  notas: string | null;
  created_at: string;
};

export type CreateTareaInput = {
  titulo: string;
  proyecto_id?: string | null;
  responsable_id?: string;
  prioridad?: PrioridadTarea;
  fecha_limite?: string | null;
  estado?: EstadoTarea;
  notas?: string | null;
};

export type UpdateTareaInput = Partial<CreateTareaInput>;
