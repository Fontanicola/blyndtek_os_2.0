import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentesDatabase, Automatizacion, AutomatizacionFrecuencia } from "@/types/agentes";

export const AUTOMATIZACION_ASESOR_ENDPOINT = "/api/agentes/asesor-financiero/analizar";
export const AUTOMATIZACION_CONTENIDO_ENDPOINT = "/api/planes-semanales/generar-automatico";

const WEEKDAY_LABELS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function normalizeAutomationTime(value: string | null | undefined) {
  if (!value) {
    return "09:00";
  }

  return value.slice(0, 5);
}

export function formatAutomatizacionHorario(automatizacion: Pick<Automatizacion, "frecuencia" | "dia_semana" | "dia_mes" | "hora">) {
  const hora = normalizeAutomationTime(automatizacion.hora);

  if (automatizacion.frecuencia === "diaria") {
    return `Todos los días a las ${hora}`;
  }

  if (automatizacion.frecuencia === "semanal") {
    const day = automatizacion.dia_semana ?? 1;
    return `Todos los ${WEEKDAY_LABELS[day] ?? "lunes"} a las ${hora}`;
  }

  return `Todos los meses, día ${automatizacion.dia_mes ?? 1} a las ${hora}`;
}

export function isAutomatizacionFrecuencia(value: unknown): value is AutomatizacionFrecuencia {
  return value === "diaria" || value === "semanal" || value === "mensual";
}

export async function fetchAutomatizacionByEndpoint(
  supabase: SupabaseClient<AgentesDatabase>,
  endpointTrigger: string
) {
  const { data, error } = await supabase
    .from("automatizaciones")
    .select("*")
    .eq("endpoint_trigger", endpointTrigger)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as Automatizacion | null;
}

export async function marcarAutomatizacionEjecutada(
  supabase: SupabaseClient<AgentesDatabase>,
  automatizacionId: string
) {
  const { error } = await supabase
    .from("automatizaciones")
    .update({ ultima_ejecucion: new Date().toISOString() })
    .eq("id", automatizacionId);

  if (error) {
    throw new Error(error.message);
  }
}

