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
  roadmap_token: string;
  roadmap_publico_activo: boolean;
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
  roadmap_publico_activo?: boolean;
};

export type UpdateProyectoInput = Partial<CreateProyectoInput>;
