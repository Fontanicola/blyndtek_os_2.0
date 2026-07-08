import { createAdminClient } from "@/lib/supabase/admin";
import { recalcularAvanceProyecto } from "@/lib/proyectos/recalcularAvance";
import type { EstadoFeature } from "@/types/features";
import type { EstadoTarea } from "@/types/tareas";

export const FEATURE_A_TAREA = {
  pendiente: "nueva",
  en_curso: "en_proceso",
  lista: "terminada"
} as const satisfies Record<EstadoFeature, EstadoTarea>;

export const TAREA_A_FEATURE = {
  nueva: "pendiente",
  en_proceso: "en_curso",
  terminada: "lista"
} as const satisfies Record<EstadoTarea, EstadoFeature>;

type SyncTaskRow = {
  id: string;
  estado: EstadoTarea;
};

type SyncFeatureRow = {
  id: string;
  estado: EstadoFeature;
  proyecto_id: string;
};

export async function sincronizarDesdeFeature(featureId: string, nuevoEstado: EstadoFeature): Promise<void> {
  const supabase = createAdminClient();

  const { data: tarea } = await supabase
    .from("tareas")
    .select("id, estado")
    .eq("feature_id", featureId)
    .maybeSingle();

  if (!tarea) {
    return;
  }

  const currentTask = tarea as SyncTaskRow;
  const targetEstado = FEATURE_A_TAREA[nuevoEstado];

  if (currentTask.estado === targetEstado) {
    return;
  }

  await supabase.from("tareas").update({ estado: targetEstado }).eq("id", currentTask.id);
}

export async function sincronizarDesdeTarea(tareaId: string, nuevoEstado: EstadoTarea): Promise<void> {
  const supabase = createAdminClient();

  const { data: tarea } = await supabase
    .from("tareas")
    .select("id, feature_id, estado")
    .eq("id", tareaId)
    .maybeSingle();

  if (!tarea) {
    return;
  }

  const currentTask = tarea as SyncTaskRow & { feature_id: string | null };

  if (!currentTask.feature_id) {
    return;
  }

  const { data: feature } = await supabase
    .from("features")
    .select("id, estado, proyecto_id")
    .eq("id", currentTask.feature_id)
    .maybeSingle();

  if (!feature) {
    return;
  }

  const currentFeature = feature as SyncFeatureRow;
  const targetEstado = TAREA_A_FEATURE[nuevoEstado];

  if (currentFeature.estado === targetEstado) {
    return;
  }

  const { error } = await supabase
    .from("features")
    .update({ estado: targetEstado })
    .eq("id", currentFeature.id);

  if (error) {
    throw new Error(error.message);
  }

  await recalcularAvanceProyecto(supabase, currentFeature.proyecto_id);
}
