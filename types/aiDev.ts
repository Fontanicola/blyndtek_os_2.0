export type AiDevEstado = "ninguno" | "planificando" | "codeando" | "pr_abierto" | "fallido";

export type AiDevEjecucion = {
  id: string;
  fase_id: string;
  modelo_orquestador: string;
  modelo_implementacion: string;
  estado: "en_curso" | "completado" | "fallido";
  pr_url: string | null;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  costo_estimado_usd: number | null;
  iniciado_por: string | null;
  iniciado_at: string;
  finalizado_at: string | null;
};
