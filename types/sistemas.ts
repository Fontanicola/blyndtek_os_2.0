import type { Json } from "@/types/supabase";

export type SistemaEstado = "activo" | "pausado" | "retirado" | string;
export type HealthCheckEstado = "ok" | "degradado" | "caido" | string;

export type SistemaGestionado = {
  id: string;
  proyecto_id: string | null;
  cliente_id: string | null;
  nombre: string;
  url_produccion: string | null;
  url_staging: string | null;
  management_endpoint: string | null;
  management_token: string | null;
  vercel_project_id: string | null;
  vercel_team_id: string | null;
  supabase_project_ref: string | null;
  stack: Json | null;
  version_patrones: string | null;
  estado: SistemaEstado;
  monitoreo_activo: boolean;
  created_at: string;
  updated_at: string;
};

export type SistemaGestionadoPublico = Omit<SistemaGestionado, "management_token"> & {
  management_token_masked: string | null;
  ultimo_check?: SistemaHealthCheck | null;
};

export type SistemaLista = SistemaGestionadoPublico & {
  ultimo_check: SistemaHealthCheck | null;
};

export type SistemaHealthCheck = {
  id: string;
  sistema_id: string;
  estado: HealthCheckEstado;
  latencia_ms: number | null;
  db_ok: boolean | null;
  detalle: string | null;
  checked_at: string;
};

export type SistemaIncidente = {
  id: string;
  sistema_id: string;
  tipo: string;
  severidad: string;
  titulo: string;
  detalle: string | null;
  resuelto: boolean;
  resuelto_at: string | null;
  resuelto_por: string | null;
  created_at: string;
  estado?: string;
  fuente?: string;
  fingerprint?: string | null;
  ocurrencias?: number;
  primera_ocurrencia_at?: string;
  ultima_ocurrencia_at?: string;
  ruta?: string | null;
  deployment_id?: string | null;
  commit_sha?: string | null;
  external_url?: string | null;
  metadata?: Json;
};

export type SistemaDeploy = {
  id: string;
  sistema_id: string;
  vercel_deployment_id: string | null;
  estado: string | null;
  commit_sha: string | null;
  commit_mensaje: string | null;
  desplegado_at: string | null;
  created_at: string;
};

export type SistemaCreateInput = {
  nombre: string;
  url_produccion?: string | null;
  url_staging?: string | null;
  management_endpoint?: string | null;
  management_token?: string | null;
  proyecto_id?: string | null;
  cliente_id?: string | null;
  vercel_project_id?: string | null;
  vercel_team_id?: string | null;
  supabase_project_ref?: string | null;
  stack?: Json | null;
  version_patrones?: string | null;
  estado?: SistemaEstado;
  monitoreo_activo?: boolean;
};

export type SistemaPatchInput = Partial<Omit<SistemaCreateInput, "management_token">>;

export type SistemaErrorInput = {
  mensaje: string;
  stack?: string | null;
  ruta?: string | null;
  timestamp?: string | null;
};
