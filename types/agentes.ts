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
    };
  };
};
