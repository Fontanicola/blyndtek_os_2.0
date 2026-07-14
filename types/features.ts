export type EstadoFeature = "pendiente" | "en_curso" | "lista";

export type Feature = {
  id: string;
  proyecto_id: string;
  nombre: string;
  descripcion: string;
  fase_id: string;
  estado: EstadoFeature;
  responsable_id: string | null;
  orden: number;
  created_at: string;
};

export type CreateFeatureInput = Pick<Feature, "proyecto_id" | "nombre" | "descripcion" | "fase_id"> & {
  estado?: EstadoFeature;
  responsable_id?: string | null;
  orden?: number;
};

export type UpdateFeatureInput = Partial<Omit<Feature, "id" | "created_at">>;
