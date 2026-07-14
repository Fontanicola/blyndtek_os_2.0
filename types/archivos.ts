export type Seccion = "clientes" | "proyectos" | "comercial" | "finanzas" | "general";

export type Carpeta = {
  id: string;
  nombre: string;
  seccion: Seccion;
  orden: number;
  carpeta_padre_id: string | null;
  cliente_id: string | null;
  proyecto_id: string | null;
  es_automatica: boolean;
  creado_por: string | null;
  created_at: string;
};

export type Archivo = {
  id: string;
  nombre: string;
  carpeta_id: string | null;
  orden: number;
  storage_path: string;
  tipo_mime: string | null;
  tamanio_bytes: number | null;
  en_papelera: boolean;
  eliminado_at: string | null;
  subido_por: string | null;
  created_at: string;
};

export type CarpetaConConteos = Carpeta & {
  subcarpetas_count: number;
  archivos_count: number;
};

export type CarpetaContenido = {
  carpeta: Carpeta;
  subcarpetas: Carpeta[];
  archivos: Archivo[];
};
