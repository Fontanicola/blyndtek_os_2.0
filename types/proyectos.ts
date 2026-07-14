import type { PublicRoadmapCredentials } from "@/types/roadmap-public";

export type EstadoProyecto =
  | "por_empezar"
  | "en_desarrollo"
  | "implementacion"
  | "entregado"
  | "soporte"
  | "pausado";

export type Proyecto = {
  id: string;
  cotizacion_id: string;
  cliente_id: string;
  nombre: string;
  estado: EstadoProyecto;
  responsable_id: string | null;
  devs_asignados: string[];
  fecha_inicio: string | null;
  entrega_comprometida: string | null;
  entrega_real: string | null;
  avance_pct: number;
  valor_total: number | null;
  notas_arquitectura: string | null;
  url_sistema: string | null;
  credenciales_cliente: PublicRoadmapCredentials | null;
  roadmap_pin: string | null;
  roadmap_token: string;
  roadmap_slug: string | null;
  roadmap_publico_activo: boolean;
  github_repo: string | null;
  created_at: string;
};

export type CreateProyectoInput = {
  cotizacion_id: string;
  cliente_id: string;
  nombre: string;
  estado?: EstadoProyecto;
  responsable_id?: string | null;
  devs_asignados?: string[];
  fecha_inicio?: string | null;
  entrega_comprometida?: string | null;
  entrega_real?: string | null;
  valor_total?: number | null;
  notas_arquitectura?: string | null;
  url_sistema?: string | null;
  credenciales_cliente?: PublicRoadmapCredentials | null;
  roadmap_pin?: string | null;
  roadmap_publico_activo?: boolean;
  roadmap_slug?: string | null;
  github_repo?: string | null;
};

export type UpdateProyectoInput = Partial<CreateProyectoInput>;
