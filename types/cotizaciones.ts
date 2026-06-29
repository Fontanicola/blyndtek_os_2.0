export type EstadoCotizacion = "borrador" | "enviada" | "aceptada" | "rechazada";

export type Hito = {
  id: string;
  nombre: string;
  pct: number;
  monto: number;
};

export type Modulo = {
  id: string;
  nombre: string;
  descripcion: string;
  features: string[];
};

export type MensajeChat = {
  rol: "user" | "assistant";
  contenido: string;
  timestamp: string;
};

export type AdjuntoMetadata = {
  nombre: string;
  tipo: "excel" | "pdf" | "csv";
  tamanio: number;
  contenido_texto: string;
};

export type Beneficio = {
  titulo: string;
  descripcion: string;
  icono: string;
};

export type DiferenciadorBlyndtek = {
  titulo: string;
  descripcion: string;
};

export type MantenimientoDetalle = {
  incluye: { categoria: string; items: string[] }[];
  no_incluye: string[];
};

export type DatosPropuesta = {
  preparado_para: string;
  preparado_por: string;
  firmantes: { nombre: string; rol: string }[];
  email_contacto: string;
  telefono_contacto: string;
  instagram: string;
  linkedin: string;
  validez_dias: number;
  titulo_sistema: string;
  subtitulo_sistema: string;
};

export type Cotizacion = {
  id: string;
  lead_id: string | null;
  cliente_id: string | null;
  empresa: string;
  precio_total: number | null;
  mantenimiento_mensual: number | null;
  plazo_semanas: number | null;
  hitos: Hito[];
  modulos: Modulo[];
  contexto_chat: MensajeChat[];
  adjuntos: AdjuntoMetadata[];
  entendimiento: string | null;
  beneficios: Beneficio[];
  por_que_nosotros: DiferenciadorBlyndtek[];
  justificacion_precio: string | null;
  mantenimiento_detalle: MantenimientoDetalle | null;
  supuestos: string[];
  condiciones_comerciales: string[];
  datos_propuesta: DatosPropuesta | null;
  resumen_ejecutivo: string | null;
  estado: EstadoCotizacion;
  pdf_propuesta_url: string | null;
  pdf_roadmap_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateCotizacionInput = {
  lead_id?: string;
  cliente_id?: string;
  empresa: string;
  precio_total?: number;
  mantenimiento_mensual?: number;
  plazo_semanas?: number;
  hitos?: Hito[];
};

export type UpdateCotizacionInput = Partial<
  Omit<Cotizacion, "id" | "created_at" | "updated_at">
>;

export type ResultadoCascada = {
  cliente_id: string;
  proyecto_id: string;
  roadmap_token: string;
  cobros_creados: number;
  suscripcion_id: string | null;
};
