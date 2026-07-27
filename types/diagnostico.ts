export type PreguntaDiagnostico = {
  id: string;
  categoria: string;
  pregunta: string;
  orden: number;
  activa: boolean;
  momento: "formulario" | "sesion";
  created_at: string;
};

export type DiagnosticoEstado = "pendiente" | "respondido" | "informe_generado";
export type DiagnosticoCompletadoPor = "cliente" | "admin" | null;

export type Diagnostico = {
  id: string;
  lead_id: string;
  token_publico: string;
  respuestas: Record<string, string> | null;
  completado_por: DiagnosticoCompletadoPor;
  fecha_completado: string | null;
  informe_hallazgos: unknown | null;
  modulos_sugeridos: unknown | null;
  precio_ideal_desarrollo: number | null;
  precio_minimo_desarrollo: number | null;
  precio_ideal_mensual: number | null;
  precio_minimo_mensual: number | null;
  estado: DiagnosticoEstado;
  created_at: string;
};

export type DiagnosticoCuantificacionGuardada = {
  total_mensual_usd: number;
  total_anual_usd: number;
  por_tipo: Record<string, number>;
  metricas_con_datos: number;
  confianza: "alta" | "media" | "baja";
};

export type ModuloCatalogo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio_ideal: number;
  precio_minimo: number;
  incremento_mensual: number | null;
  activo: boolean;
  created_at: string;
};

export const DIAGNOSTICO_CONTEXTO_KEY = "__contexto_adicional";

export type DiagnosticoPublicPayload = {
  diagnostico: Pick<
    Diagnostico,
    "id" | "token_publico" | "respuestas" | "estado" | "completado_por" | "fecha_completado"
  >;
  lead: {
    empresa: string;
    contacto_1_nombre: string | null;
  } | null;
  preguntas: PreguntaDiagnostico[];
};
