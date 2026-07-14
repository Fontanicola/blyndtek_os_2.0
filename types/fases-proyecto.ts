import type { AiDevEstado } from "@/types/aiDev";

export type EstadoFaseProyecto = "pendiente" | "en_curso" | "lista";
export type PrioridadFaseProyecto = "alta" | "media" | "baja";

export type FaseProyecto = {
  id: string;
  proyecto_id: string;
  nombre: string;
  estado: EstadoFaseProyecto;
  prioridad: PrioridadFaseProyecto;
  orden: number;
  fecha_estimada_inicio?: string | null;
  fecha_estimada_fin?: string | null;
  descripcion?: string | null;
  ai_dev_estado?: AiDevEstado;
  ai_dev_iniciado_at?: string | null;
  ai_dev_error?: string | null;
  pr_url?: string | null;
  pr_numero?: number | null;
  sql_pendiente?: string | null;
  sql_ejecutado?: boolean;
  created_at?: string;
};

export type CreateFaseProyectoInput = {
  nombre: string;
  estado?: EstadoFaseProyecto;
  prioridad?: PrioridadFaseProyecto;
  orden?: number;
  fecha_estimada_inicio?: string | null;
  fecha_estimada_fin?: string | null;
  descripcion?: string | null;
  ai_dev_estado?: AiDevEstado;
  ai_dev_iniciado_at?: string | null;
  ai_dev_error?: string | null;
  pr_url?: string | null;
  pr_numero?: number | null;
  sql_pendiente?: string | null;
  sql_ejecutado?: boolean;
};

export type UpdateFaseProyectoInput = Partial<CreateFaseProyectoInput>;
