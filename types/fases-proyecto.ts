export type EstadoFaseProyecto = "pendiente" | "en_curso" | "lista";

export type FaseProyecto = {
  id: string;
  proyecto_id: string;
  nombre: string;
  estado: EstadoFaseProyecto;
  orden: number;
  fecha_inicio_estimada?: string | null;
  fecha_fin_estimada?: string | null;
  descripcion?: string | null;
  entregables?: string | null;
  created_at?: string;
};

export type CreateFaseProyectoInput = {
  nombre: string;
  estado?: EstadoFaseProyecto;
  orden?: number;
  fecha_inicio_estimada?: string | null;
  fecha_fin_estimada?: string | null;
  descripcion?: string | null;
  entregables?: string | null;
};

export type UpdateFaseProyectoInput = Partial<CreateFaseProyectoInput>;
