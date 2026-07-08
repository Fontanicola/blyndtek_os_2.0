import { calculateAvancePct } from "@/lib/proyectos";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Feature } from "@/types/features";
import type { Proyecto } from "@/types/proyectos";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

export async function recalcularAvanceProyecto(
  supabase: SupabaseAdminClient,
  proyectoId: string
): Promise<Proyecto | null> {
  const { data: features } = await supabase
    .from("features")
    .select("estado")
    .eq("proyecto_id", proyectoId);

  const avance_pct = calculateAvancePct((features ?? []) as Array<Pick<Feature, "estado">>);

  const { data: updatedProject } = await supabase
    .from("proyectos")
    .update({ avance_pct })
    .eq("id", proyectoId)
    .select("*")
    .single();

  return (updatedProject as Proyecto) ?? null;
}
