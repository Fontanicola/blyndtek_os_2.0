import type { Feature } from "@/types/features";
import type { FaseProyecto } from "@/types/fases-proyecto";

function uniquePhaseIds(features: Feature[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const feature of features) {
    if (!seen.has(feature.fase_id)) {
      seen.add(feature.fase_id);
      ordered.push(feature.fase_id);
    }
  }

  return ordered;
}

export function migrarSiNecesario(fases: FaseProyecto[], features: Feature[]): FaseProyecto[] {
  if (fases.length > 0 || features.length === 0) {
    return fases;
  }

  return uniquePhaseIds(features).map((faseId, index) => ({
    id: faseId,
    proyecto_id: "",
    nombre: faseId,
    estado: "pendiente" as const,
    prioridad: "media" as const,
    orden: index + 1,
    created_at: new Date(0).toISOString()
  }));
}
