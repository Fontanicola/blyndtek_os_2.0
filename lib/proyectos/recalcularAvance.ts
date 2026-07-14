import { createAdminClient } from "@/lib/supabase/admin";
import type { Proyecto } from "@/types/proyectos";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

type PhaseRow = {
  id: string;
  nombre: string;
  estado: "pendiente" | "en_curso" | "lista";
};

type FeatureRow = {
  fase_id: string;
  estado: "pendiente" | "en_curso" | "lista";
};

function getPhaseProgress(fase: PhaseRow, features: FeatureRow[]) {
  if (features.length === 0) {
    return fase.estado === "lista" ? 100 : 0;
  }

  const completed = features.filter((feature) => feature.estado === "lista").length;
  return Math.round((completed / features.length) * 100);
}

export async function recalcularAvanceProyecto(
  supabase: SupabaseAdminClient,
  proyectoId: string
): Promise<Proyecto | null> {
  const { data: currentProject } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", proyectoId)
    .single();

  const [{ data: phases, error: phasesError }, { data: features, error: featuresError }] = await Promise.all([
    supabase.from("fases_proyecto").select("id, nombre, estado").eq("proyecto_id", proyectoId).order("orden", {
      ascending: true
    }),
    supabase.from("features").select("fase_id, estado").eq("proyecto_id", proyectoId)
  ]);

  if (phasesError) {
    throw new Error(phasesError.message);
  }

  if (featuresError) {
    throw new Error(featuresError.message);
  }

  if (!phases || phases.length === 0) {
    return (currentProject as Proyecto) ?? null;
  }

  const avancePctPorFase = phases.map((fase) => {
    const featuresDeFase = (features ?? []).filter((feature) => feature.fase_id === fase.id);
    return getPhaseProgress(fase, featuresDeFase);
  });

  const avance_pct = Math.round(
    avancePctPorFase.reduce((accumulator, value) => accumulator + value, 0) / avancePctPorFase.length
  );

  const { data: updatedProject } = await supabase
    .from("proyectos")
    .update({ avance_pct })
    .eq("id", proyectoId)
    .select("*")
    .single();

  return (updatedProject as Proyecto) ?? null;
}
