export type MarcaContenido = {
  id: string;
  nombre: string;
  slug: string;
  tono_voz: string | null;
  publico_objetivo: string | null;
  paleta_colores: string | null;
  que_mostrar: string | null;
  que_evitar: string | null;
  meta_ig_business_id: string | null;
  meta_page_id: string | null;
  color: string;
  created_at: string;
};

export type PilarContenido = {
  id: string;
  marca_id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  created_at: string;
};

export type PiezaContenidoEstado =
  | "idea"
  | "en_diseno"
  | "lista"
  | "programada"
  | "publicada"
  | "fallida";

export type PiezaContenido = {
  id: string;
  marca_id: string;
  pilar_id: string | null;
  titulo: string;
  storage_path: string | null;
  caption: string | null;
  hashtags: string[];
  plataforma: string;
  estado: PiezaContenidoEstado;
  fecha_programada: string | null;
  publicado_at: string | null;
  meta_post_id: string | null;
  meta_error: string | null;
  generado_con_ia: boolean;
  prompt_higgsfield: string | null;
  creativo_referencia_id: string | null;
  creado_por: string | null;
  updated_at: string;
  created_at: string;
  pilar?: PilarContenido | null;
};

export type ContenidoDatabase = {
  public: {
    Tables: {
      marcas_contenido: {
        Row: MarcaContenido;
        Insert: Partial<MarcaContenido> & Pick<MarcaContenido, "nombre" | "slug">;
        Update: Partial<MarcaContenido>;
      };
      pilares_contenido: {
        Row: PilarContenido;
        Insert: Partial<PilarContenido> & Pick<PilarContenido, "marca_id" | "nombre">;
        Update: Partial<PilarContenido>;
      };
      piezas_contenido: {
        Row: PiezaContenido;
        Insert: Partial<PiezaContenido> & Pick<PiezaContenido, "marca_id">;
        Update: Partial<PiezaContenido>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
