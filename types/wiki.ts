import type { Json } from "@/types/supabase";

export type WikiCategoria = {
  id: string;
  nombre: string;
  orden: number;
  creado_por: string | null;
  created_at: string;
};

export type WikiArticulo = {
  id: string;
  titulo: string;
  contenido: Json;
  categoria_id: string | null;
  orden: number;
  creado_por: string | null;
  updated_at: string;
  created_at: string;
};

export type CreateWikiCategoriaInput = {
  nombre: string;
  orden?: number;
};

export type UpdateWikiCategoriaInput = Partial<CreateWikiCategoriaInput>;

export type CreateWikiArticuloInput = {
  titulo?: string;
  contenido?: Json;
  categoria_id?: string | null;
  orden?: number;
};

export type UpdateWikiArticuloInput = Partial<{
  titulo: string;
  contenido: Json;
  categoria_id: string | null;
  orden: number;
}>;
