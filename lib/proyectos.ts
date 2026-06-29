import type { Feature } from "@/types/features";
import type { Proyecto } from "@/types/proyectos";

export const PROYECTO_ESTADO_LABELS: Record<Proyecto["estado"], string> = {
  por_empezar: "Por empezar",
  en_desarrollo: "En desarrollo",
  implementacion: "Implementación",
  entregado: "Entregado",
  soporte: "Soporte",
  pausado: "Pausado"
};

export const PROYECTO_ESTADO_OPTIONS = Object.keys(PROYECTO_ESTADO_LABELS) as Array<
  Proyecto["estado"]
>;

export function calculateAvancePct(features: Pick<Feature, "estado">[]) {
  if (features.length === 0) {
    return 0;
  }

  const completed = features.filter((feature) => feature.estado === "lista").length;
  return Math.round((completed / features.length) * 100);
}

export function groupFeaturesByPhase(features: Feature[]) {
  const grouped = new Map<string, Feature[]>();

  for (const feature of features) {
    const current = grouped.get(feature.fase) ?? [];
    grouped.set(feature.fase, [...current, feature]);
  }

  return Array.from(grouped.entries()).map(([fase, items]) => ({
    fase,
    features: items
  }));
}
