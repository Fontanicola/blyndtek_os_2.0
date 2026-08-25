import type { Database, Json } from "@/types/supabase";

export type TechEventLevel = "debug" | "info" | "warning" | "error" | "fatal";
export type IncidentSeverity = "baja" | "media" | "alta" | "critica";

export type TechEvent = {
  id: string;
  sistema_id: string | null;
  fuente: string;
  tipo: string;
  nivel: TechEventLevel;
  fingerprint: string;
  mensaje: string;
  ruta: string | null;
  status_code: number | null;
  duracion_ms: number | null;
  deployment_id: string | null;
  commit_sha: string | null;
  proyecto_externo_id: string | null;
  metadata: Json;
  ocurrido_at: string;
  recibido_at: string;
};

export type TechIncident = {
  id: string;
  sistema_id: string;
  tipo: string;
  severidad: IncidentSeverity | string;
  titulo: string;
  detalle: string | null;
  resuelto: boolean;
  resuelto_at: string | null;
  resuelto_por: string | null;
  estado: string;
  fuente: string;
  fingerprint: string | null;
  ocurrencias: number;
  primera_ocurrencia_at: string;
  ultima_ocurrencia_at: string;
  ruta: string | null;
  deployment_id: string | null;
  commit_sha: string | null;
  external_url: string | null;
  metadata: Json;
  created_at: string;
};

export type TechIntegration = {
  id: string;
  sistema_id: string;
  proveedor: string;
  estado: "no_configurado" | "conectado" | "degradado" | "error";
  ultima_sincronizacion_at: string | null;
  ultimo_error: string | null;
  configuracion: Json;
  created_at: string;
  updated_at: string;
};

export type TechSlo = {
  id: string;
  sistema_id: string;
  disponibilidad_objetivo: number;
  latencia_p95_objetivo_ms: number;
  tasa_error_objetivo: number;
  ventana_dias: number;
  created_at: string;
  updated_at: string;
};

export type TechRemediation = {
  id: string;
  sistema_id: string;
  incidente_id: string | null;
  estado: string;
  nivel_autonomia: number;
  resumen: string;
  branch: string | null;
  commit_sha: string | null;
  verificaciones: Json;
  iniciada_at: string;
  finalizada_at: string | null;
  created_at: string;
};

export type TechGuardStatus = "ejecutando" | "saludable" | "hallazgos" | "fallida" | "bloqueada";
export type TechActionStatus = "detectada" | "diagnosticando" | "preparada" | "verificada" | "desplegada" | "fallida" | "bloqueada" | "revertida";

export type TechGuard = {
  id: string;
  automation_id: string;
  estado: TechGuardStatus;
  ventana_desde: string;
  ventana_hasta: string;
  iniciada_at: string;
  finalizada_at: string | null;
  resumen: string | null;
  sistemas_revisados: number;
  incidentes_detectados: number;
  acciones_ejecutadas: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type TechAction = {
  id: string;
  guardia_id: string | null;
  sistema_id: string | null;
  incidente_id: string | null;
  actor: "codex" | "automatizacion" | "humano" | "sistema";
  tipo: string;
  estado: TechActionStatus;
  titulo: string;
  detalle: string | null;
  evidencia: Json;
  branch: string | null;
  commit_sha: string | null;
  deployment_id: string | null;
  external_url: string | null;
  iniciada_at: string;
  finalizada_at: string | null;
  created_at: string;
  updated_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type TechOpsDatabase = Database & {
  public: {
    Tables: Database["public"]["Tables"] & {
      sistemas_incidentes: Table<TechIncident, TechIncidentInsert>;
      sistemas_eventos_tecnicos: Table<TechEvent, Omit<TechEvent, "id" | "recibido_at"> & { id?: string; recibido_at?: string }>;
      sistemas_integraciones: Table<TechIntegration, Omit<TechIntegration, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }>;
      sistemas_slos: Table<TechSlo, Omit<TechSlo, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }>;
      sistemas_remediaciones: Table<TechRemediation, Omit<TechRemediation, "id" | "created_at"> & { id?: string; created_at?: string }>;
      sistemas_guardias: Table<TechGuard, Omit<TechGuard, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }>;
      sistemas_acciones_tecnicas: Table<TechAction, Omit<TechAction, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }>;
    };
    Views: Database["public"]["Views"];
    Functions: Database["public"]["Functions"];
    Enums: Database["public"]["Enums"];
    CompositeTypes: Database["public"]["CompositeTypes"];
  };
};

export type TechEventInput = {
  sistema_id?: string | null;
  fuente: string;
  tipo: string;
  nivel?: TechEventLevel;
  fingerprint?: string | null;
  mensaje: string;
  ruta?: string | null;
  status_code?: number | null;
  duracion_ms?: number | null;
  deployment_id?: string | null;
  commit_sha?: string | null;
  proyecto_externo_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ocurrido_at?: string | null;
};

type TechIncidentInsert = Pick<TechIncident, "sistema_id" | "tipo" | "titulo"> &
  Partial<Omit<TechIncident, "id" | "created_at" | "sistema_id" | "tipo" | "titulo">> & {
    id?: string;
    created_at?: string;
  };
