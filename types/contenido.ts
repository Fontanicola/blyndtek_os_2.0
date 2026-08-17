export type MarcaContenido = {
  id: string;
  nombre: string;
  slug: string;
  tono_voz: string | null;
  publico_objetivo: string | null;
  paleta_colores: string | null;
  tipografia: string | null;
  reglas_visuales: string | null;
  que_mostrar: string | null;
  que_evitar: string | null;
  meta_ig_business_id: string | null;
  meta_page_id: string | null;
  color: string;
  created_at: string;
};

export type CanalContenido = {
  id: string;
  marca_id: string;
  nombre: string;
  slug: string;
  plataforma: string;
  color: string;
  orden: number;
  activo: boolean;
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

export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue | undefined } | JsonValue[];

export type PlanSemanal = {
  id: string;
  marca_id: string;
  semana_inicio: string;
  tema_general: string;
  noticia_fuente: string;
  noticia_url: string;
  estado?: string;
  created_at: string;
};

export type GeneracionAutomatica = {
  id: string;
  plan_semanal_id: string | null;
  estado: "en_curso" | "completado" | "fallido";
  piezas_generadas: number;
  error_detalle: string | null;
  iniciado_at: string;
  finalizado_at: string | null;
};

export type PiezaContenidoEstado =
  | "idea"
  | "en_diseno"
  | "lista"
  | "programada"
  | "publicada"
  | "fallida";

export type PiezaContenidoTipo = "noticia" | "caso_uso" | "dato_rapido" | "reel" | "historia" | null;

export type PiezaContenido = {
  id: string;
  marca_id: string;
  plan_semanal_id: string | null;
  pilar_id: string | null;
  tipo_pieza: PiezaContenidoTipo;
  titulo: string;
  storage_path: string | null;
  fondo_storage_path: string | null;
  imagenes_generadas: string[] | null;
  caption: string | null;
  hashtags: string[];
  guion: JsonValue | null;
  plataforma: string;
  estado: PiezaContenidoEstado;
  fecha_programada: string | null;
  publicado_at: string | null;
  meta_post_id: string | null;
  meta_error: string | null;
  generado_con_ia: boolean;
  prompt_higgsfield: string | null;
  prompt_fondo: string | null;
  higgsfield_job_id: string | null;
  higgsfield_estado: "procesando" | "completado" | "fallido" | null;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  costo_generacion_usd: number | null;
  creativo_referencia_id: string | null;
  creado_por: string | null;
  updated_at: string;
  created_at: string;
  pilar?: PilarContenido | null;
  plan?: PlanSemanal | null;
};

export type MarcaIdentidadSeccion = {
  id: string;
  marca_id: string;
  clave: string;
  titulo: string;
  contenido: string;
  orden: number;
  visible: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegracionContenido = {
  id: string;
  marca_id: string;
  red: "instagram" | "linkedin";
  nombre_cuenta: string;
  cuenta_externa_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  activa: boolean;
  metadata: Record<string, JsonValue>;
  created_at: string;
  updated_at: string;
};

export type ContenidoDatabase = {
  public: {
    Tables: {
      marcas_contenido: {
        Row: MarcaContenido;
        Insert: Partial<MarcaContenido> & Pick<MarcaContenido, "nombre" | "slug">;
        Update: Partial<MarcaContenido>;
      };
      canales_contenido: {
        Row: CanalContenido;
        Insert: Partial<CanalContenido> & Pick<CanalContenido, "marca_id" | "nombre" | "slug" | "plataforma">;
        Update: Partial<CanalContenido>;
      };
      planes_semanales: {
        Row: PlanSemanal;
        Insert: Partial<PlanSemanal> & Pick<PlanSemanal, "marca_id" | "semana_inicio" | "tema_general" | "noticia_fuente" | "noticia_url">;
        Update: Partial<PlanSemanal>;
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
      generaciones_automaticas: {
        Row: GeneracionAutomatica;
        Insert: Partial<GeneracionAutomatica> & Pick<GeneracionAutomatica, "estado">;
        Update: Partial<GeneracionAutomatica>;
      };
      marca_identidad_secciones: {
        Row: MarcaIdentidadSeccion;
        Insert: Partial<MarcaIdentidadSeccion> & Pick<MarcaIdentidadSeccion, "marca_id" | "clave" | "titulo">;
        Update: Partial<MarcaIdentidadSeccion>;
      };
      contenido_integraciones_sociales: {
        Row: IntegracionContenido;
        Insert: Partial<IntegracionContenido> & Pick<IntegracionContenido, "marca_id" | "red" | "nombre_cuenta">;
        Update: Partial<IntegracionContenido>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
