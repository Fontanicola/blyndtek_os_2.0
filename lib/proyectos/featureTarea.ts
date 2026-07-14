import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { FEATURE_A_TAREA } from "@/lib/proyectos/sincronizarFeatureTarea";
import { crearTareaConAdminClient } from "@/lib/tareas/crearTarea";
import type { Feature } from "@/types/features";
import type { Tarea } from "@/types/tareas";

type FeatureWithProjectOwner = Pick<
  Feature,
  "id" | "nombre" | "descripcion" | "fase_id" | "estado" | "responsable_id" | "proyecto_id"
> & {
  proyectos?: {
    responsable_id: string | null;
  } | null;
};

export async function crearTareaVinculadaAFeature(
  supabase: SupabaseClient<Database>,
  feature: FeatureWithProjectOwner
): Promise<Tarea> {
  return crearTareaConAdminClient(supabase, {
    titulo: feature.nombre,
    proyecto_id: feature.proyecto_id,
    feature_id: feature.id,
    responsable_id: feature.responsable_id ?? feature.proyectos?.responsable_id ?? null,
    prioridad: "media",
    fecha_limite: null,
    estado: FEATURE_A_TAREA[feature.estado],
    notas: null
  });
}
