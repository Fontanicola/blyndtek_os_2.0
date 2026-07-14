export type ProductoPlan = {
  id: string;
  producto_id: string;
  nombre: string;
  precio_mensual: number;
  descripcion: string | null;
  orden: number;
  created_at: string;
};

export type CreateProductoPlanInput = {
  nombre: string;
  precio_mensual: number;
  descripcion?: string | null;
  orden?: number;
};

export type UpdateProductoPlanInput = Partial<CreateProductoPlanInput>;
