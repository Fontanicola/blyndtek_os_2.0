import type { Json, Database } from "@/types/supabase";
import type { Usuario } from "@/types/auth";

export type Agente = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  color: string;
  created_at: string;
};

export type AgenteConfigKey = "runway_objetivo_meses" | "resumen_automatico_activo" | "frecuencia_resumen";

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
};

export type AgenteAnalisisTipo = "automatico" | "bajo_demanda";

export type AgenteAnalisis = {
  id: string;
  agente_id: string;
  tipo: AgenteAnalisisTipo;
  datos_calculados: Json;
  analisis_texto: string;
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
          created_at?: string;
        };
        Update: Partial<AgenteAnalisis>;
        Relationships: [];
      };
    };
  };
};
