export type CategoriaEgreso = "sueldos" | "pauta" | "fijos" | "dev" | "otro";

export type Egreso = {
  id: string;
  concepto: string;
  categoria: CategoriaEgreso;
  monto: number;
  fecha: string;
  recurrente: boolean;
  notas: string | null;
  created_at: string;
};

export type CreateEgresoInput = {
  concepto: string;
  categoria: CategoriaEgreso;
  monto: number;
  fecha: string;
  recurrente?: boolean;
  notas?: string | null;
};

export type UpdateEgresoInput = Partial<CreateEgresoInput>;
