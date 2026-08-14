import type { Json, Database } from "@/types/supabase";
import type { Usuario } from "@/types/auth";

export type AgenteTipo = "analista" | "generador" | "ejecutor" | "vigilante";

export type Agente = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  tipo: AgenteTipo;
  activo: boolean;
  color: string;
  created_at: string;
};

export type AgenteConfigKey =
  | "runway_objetivo_meses"
  | "resumen_automatico_activo"
  | "frecuencia_resumen"
  | "generacion_automatica_activa"
  | "dia_generacion";

export type AgenteConfigRow = {
  id: string;
  agente_id: string;
  clave: AgenteConfigKey | string;
  valor: Json;
  updated_at: string;
};

export type AgenteConfig = {
  runway_objetivo_meses: number;
  resumen_automatico_activo: boolean;
  frecuencia_resumen: string;
  generacion_automatica_activa: boolean;
  dia_generacion: string;
};

export type GeneracionAutomaticaAgente = {
  id: string;
  plan_semanal_id: string | null;
  estado: "en_curso" | "completado" | "fallido";
  piezas_generadas: number;
  error_detalle: string | null;
  iniciado_at: string;
  finalizado_at: string | null;
};

export type AutomatizacionFrecuencia = "diaria" | "semanal" | "mensual";

export type Automatizacion = {
  id: string;
  agente_id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  frecuencia: AutomatizacionFrecuencia;
  dia_semana: number | null;
  dia_mes: number | null;
  hora: string;
  endpoint_trigger: string;
  ultima_ejecucion: string | null;
  created_at: string;
};

export type AutomatizacionConAgente = Automatizacion & {
  agentes?: Pick<Agente, "nombre" | "slug" | "tipo"> | null;
};

export type PiezaContenidoCostoAgente = {
  id: string;
  costo_generacion_usd: number | null;
  created_at: string;
};

export type AgenteAnalisisTipo = "automatico" | "bajo_demanda";

export type AgenteAnalisis = {
  id: string;
  agente_id: string;
  tipo: AgenteAnalisisTipo;
  datos_calculados: Json;
  analisis_texto: string;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  costo_estimado_usd: number | null;
  generado_por: string | null;
  created_at: string;
};

export type AgenteAnalisisConAutor = AgenteAnalisis & {
  generado_por_usuario?: Pick<Usuario, "nombre"> | null;
};

export type CronistaLogEstado = "sin_contexto_humano" | "procesando" | "completado" | "fallido";

export type CronistaPregunta = {
  id: string;
  texto: string;
};

export type CronistaDatosDuros = {
  leads_nuevos: Array<{
    id: string;
    empresa: string;
    canal: string;
    etapa: string;
  }>;
  cambios_etapa_leads: Array<{
    lead_id: string;
    empresa: string;
    desde: string;
    hasta: string;
    ocurrido_at: string;
  }>;
  cobros: Array<{
    id: string;
    concepto: string;
    monto: number;
    estado: string;
    fecha_cobro: string | null;
    cliente: string | null;
  }>;
  egresos: Array<{
    id: string;
    concepto: string;
    monto: number;
    categoria: string;
    pagado: boolean;
    cliente: string | null;
  }>;
  features_completadas: Array<{
    feature_id: string;
    nombre: string;
    proyecto: string;
    ocurrido_at: string;
  }>;
  fases_movidas: Array<{
    fase_id: string;
    nombre: string;
    proyecto: string;
    desde: string;
    hasta: string;
    ocurrido_at: string;
  }>;
  diagnosticos_ejecutados: Array<{
    diagnostico_id: string;
    empresa: string;
    estado: string;
    fecha_completado: string;
  }>;
  incidentes_sistemas: Array<{
    incidente_id: string;
    sistema: string;
    titulo: string;
    severidad: string;
    detalle: string | null;
    ocurrido_at: string;
  }>;
};

export type CronistaLogDiario = {
  id: string;
  fecha: string;
  datos_duros: CronistaDatosDuros;
  preguntas: CronistaPregunta[];
  respuesta_cruda: string | null;
  log_estructurado: string | null;
  estado: CronistaLogEstado;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  costo_estimado_usd: number | null;
  created_at: string;
  updated_at: string;
};

export type CronistaEventoEstado = {
  id: string;
  entidad_tipo: "lead" | "feature" | "fase_proyecto";
  entidad_id: string;
  estado_anterior: string;
  estado_nuevo: string;
  ocurrido_at: string;
};

export type CronistaReporteTipo = "semanal" | "mensual";
export type CronistaReporteEstado = "procesando" | "completado" | "fallido";

export type CronistaReporte = {
  id: string;
  tipo: CronistaReporteTipo;
  periodo_inicio: string;
  periodo_fin: string;
  metricas_duras: Json;
  fuentes: Json;
  reporte_markdown: string | null;
  estado: CronistaReporteEstado;
  intentos: number;
  error_detalle: string | null;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  costo_estimado_usd: number | null;
  resend_email_id: string | null;
  enviado_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentesDatabase = Database & {
  public: {
    Tables: Database["public"]["Tables"] & {
      agentes: {
        Row: Agente;
        Insert: Omit<Agente, "id" | "created_at"> & {
          id?: string;
          descripcion?: string | null;
          tipo?: AgenteTipo;
          activo?: boolean;
          color?: string;
          created_at?: string;
        };
        Update: Partial<Agente>;
        Relationships: [];
      };
      agente_config: {
        Row: AgenteConfigRow;
        Insert: Omit<AgenteConfigRow, "id" | "updated_at"> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<AgenteConfigRow>;
        Relationships: [];
      };
      agente_analisis: {
        Row: AgenteAnalisis;
        Insert: Omit<AgenteAnalisis, "id" | "created_at"> & {
          id?: string;
          tokens_entrada?: number | null;
          tokens_salida?: number | null;
          costo_estimado_usd?: number | null;
          created_at?: string;
        };
        Update: Partial<AgenteAnalisis>;
        Relationships: [];
      };
      generaciones_automaticas: {
        Row: GeneracionAutomaticaAgente;
        Insert: Partial<GeneracionAutomaticaAgente> & Pick<GeneracionAutomaticaAgente, "estado">;
        Update: Partial<GeneracionAutomaticaAgente>;
        Relationships: [];
      };
      automatizaciones: {
        Row: Automatizacion;
        Insert: Omit<Automatizacion, "id" | "created_at"> & {
          id?: string;
          descripcion?: string | null;
          activa?: boolean;
          dia_semana?: number | null;
          dia_mes?: number | null;
          ultima_ejecucion?: string | null;
          created_at?: string;
        };
        Update: Partial<Automatizacion>;
        Relationships: [];
      };
      piezas_contenido: {
        Row: PiezaContenidoCostoAgente;
        Insert: Partial<PiezaContenidoCostoAgente>;
        Update: Partial<PiezaContenidoCostoAgente>;
        Relationships: [];
      };
      logs_diarios: {
        Row: CronistaLogDiario;
        Insert: Pick<CronistaLogDiario, "fecha" | "datos_duros" | "preguntas"> & {
          id?: string;
          respuesta_cruda?: string | null;
          log_estructurado?: string | null;
          estado?: CronistaLogEstado;
          tokens_entrada?: number | null;
          tokens_salida?: number | null;
          costo_estimado_usd?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CronistaLogDiario>;
        Relationships: [];
      };
      cronista_eventos_estado: {
        Row: CronistaEventoEstado;
        Insert: Omit<CronistaEventoEstado, "id" | "ocurrido_at"> & {
          id?: string;
          ocurrido_at?: string;
        };
        Update: Partial<CronistaEventoEstado>;
        Relationships: [];
      };
      reportes_cronista: {
        Row: CronistaReporte;
        Insert: Pick<CronistaReporte, "tipo" | "periodo_inicio" | "periodo_fin"> & {
          id?: string;
          metricas_duras?: Json;
          fuentes?: Json;
          reporte_markdown?: string | null;
          estado?: CronistaReporteEstado;
          intentos?: number;
          error_detalle?: string | null;
          tokens_entrada?: number | null;
          tokens_salida?: number | null;
          costo_estimado_usd?: number | null;
          resend_email_id?: string | null;
          enviado_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CronistaReporte>;
        Relationships: [];
      };
    };
  };
};
