export type DiagnosticoSesionEstado = "en_curso" | "completa";

export type DiagnosticoArea = {
  id: string;
  diagnostico_id: string;
  nombre: string;
  responsable: string | null;
  volumen_mensual: number;
  unidad_volumen: string | null;
  herramientas: string[];
  proceso_actual: string | null;
  dependencia_critica: boolean;
  nivel_friccion: number;
  created_at?: string;
  updated_at?: string;
};

export type DiagnosticoMetricaTipo =
  | "trabajo_manual"
  | "doble_carga"
  | "error_operativo"
  | "licencia"
  | "venta_perdida"
  | "otro";

export type DiagnosticoMetrica = {
  id: string;
  diagnostico_id: string;
  area_id: string | null;
  tipo: DiagnosticoMetricaTipo;
  concepto: string;
  horas_mes: number;
  costo_hora_usd: number;
  cargas_mes: number;
  minutos_por_carga: number;
  errores_mes: number;
  costo_por_error_usd: number;
  licencias_mes_usd: number;
  uso_pct: number;
  oportunidades_mes: number;
  ticket_promedio_usd: number;
  tasa_cierre_pct: number;
  costo_mensual_usd: number;
  costo_anual_usd: number;
  confianza: "alta" | "media" | "baja";
  notas: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DiagnosticoSesion = {
  id: string;
  diagnostico_id: string;
  fecha: string;
  duracion_minutos: number | null;
  decisor_nombre: string | null;
  decisor_cargo: string | null;
  notas: string | null;
  estado: DiagnosticoSesionEstado;
  created_at?: string;
  updated_at?: string;
};

export type DiagnosticoCuantitativoResumen = {
  total_mensual_usd: number;
  total_anual_usd: number;
  por_tipo: Record<DiagnosticoMetricaTipo, number>;
  metricas_con_datos: number;
  confianza: "alta" | "media" | "baja";
};

export type DiagnosticoSesionPayload = {
  sesion: DiagnosticoSesion | null;
  areas: DiagnosticoArea[];
  metricas: DiagnosticoMetrica[];
  resumen: DiagnosticoCuantitativoResumen;
};
