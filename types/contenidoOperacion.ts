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

export type RedSocial = "instagram" | "linkedin";

export type IntegracionSocial = {
  id: string;
  marca_id: string;
  red: RedSocial;
  nombre_cuenta: string;
  cuenta_externa_id: string | null;
  token_expires_at: string | null;
  activa: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ContenidoMetrica = {
  id: string;
  pieza_id: string | null;
  integracion_id: string | null;
  red: RedSocial;
  fecha: string;
  impresiones: number;
  alcance: number;
  me_gusta: number;
  comentarios: number;
  compartidos: number;
  guardados: number;
  clics: number;
  seguidores_ganados: number;
};
