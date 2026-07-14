export type Producto = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  precio_mensual_default: number | null;
  color: string;
  created_at: string;
};

export type EstadoFeatureProducto = "idea" | "planificado" | "en_desarrollo" | "lanzado";

export type ProductoFeature = {
  id: string;
  producto_id: string;
  titulo: string;
  descripcion: string | null;
  estado: EstadoFeatureProducto;
  prioridad: "alta" | "media" | "baja";
  solicitado_por_cliente_id: string | null;
  orden: number;
  created_at: string;
};

export type CreateProductoFeatureInput = {
  titulo: string;
  descripcion?: string | null;
  estado?: EstadoFeatureProducto;
  prioridad?: "alta" | "media" | "baja";
  solicitado_por_cliente_id?: string | null;
  orden?: number;
};

export type UpdateProductoFeatureInput = Partial<CreateProductoFeatureInput>;

export type ProductoHistoricoMRRPoint = {
  month: string;
  label: string;
  mrr: number;
};

export type ProductoMetricas = {
  mrr: number;
  suscriptores_activos: number;
  nuevos_periodo: number;
  bajas_periodo: number;
  churn_pct: number | null;
  historico_mrr: ProductoHistoricoMRRPoint[];
};
