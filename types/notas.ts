import type { Json } from "@/types/supabase";

export type CarpetaNota = {
  id: string;
  nombre: string;
  orden: number;
  creado_por: string | null;
  created_at: string;
};

export type Nota = {
  id: string;
  titulo: string;
  contenido: Json;
  carpeta_id: string | null;
  fijada: boolean;
  en_papelera: boolean;
  eliminada_at: string | null;
  cliente_id: string | null;
  proyecto_id: string | null;
  lead_id: string | null;
  tags: string[] | null;
  creado_por: string | null;
  updated_at: string;
  created_at: string;
};

export type CreateCarpetaNotaInput = {
  nombre: string;
  orden?: number;
};

export type UpdateCarpetaNotaInput = Partial<CreateCarpetaNotaInput>;

export type CreateNotaInput = {
  titulo?: string;
  contenido?: Json;
  carpeta_id?: string | null;
  cliente_id?: string | null;
  proyecto_id?: string | null;
  lead_id?: string | null;
  tags?: string[] | null;
  fijada?: boolean;
  en_papelera?: boolean;
};

export type UpdateNotaInput = Partial<{
  titulo: string;
  contenido: Json;
  carpeta_id: string | null;
  fijada: boolean;
  en_papelera: boolean;
  eliminada_at: string | null;
  cliente_id: string | null;
  proyecto_id: string | null;
  lead_id: string | null;
  tags: string[] | null;
}>;
