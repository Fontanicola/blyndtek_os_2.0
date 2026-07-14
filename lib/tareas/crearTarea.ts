import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { CreateTareaInput, Tarea } from "@/types/tareas";

type CrearTareaOptions = {
  defaultResponsableId?: string | null;
};

export async function crearTareaConAdminClient(
  supabase: SupabaseClient<Database>,
  input: CreateTareaInput,
  options: CrearTareaOptions = {}
): Promise<Tarea> {
  const titulo = input.titulo?.trim();

  if (!titulo) {
    throw new Error("titulo is required");
  }

  const responsableId = input.responsable_id?.trim() || options.defaultResponsableId || null;

  const payload = {
    titulo,
    proyecto_id: input.proyecto_id?.trim() || null,
    lead_id: input.lead_id?.trim() || null,
    feature_id: input.feature_id?.trim() || null,
    responsable_id: responsableId,
    prioridad: input.prioridad ?? "media",
    fecha_limite: input.fecha_limite ?? null,
    estado: input.estado ?? "nueva",
    notas: input.notas ?? null
  };

  const { data, error } = await supabase.from("tareas").insert(payload).select("*").single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la tarea.");
  }

  return data as Tarea;
}
