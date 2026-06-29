export type PublicFeatureState = "pendiente" | "en_curso" | "lista";

export type PublicRoadmapFeature = {
  nombre: string;
  estado: PublicFeatureState;
};

export type PublicRoadmapPhaseState = "completada" | "en_curso" | "pendiente";

export type PublicRoadmapPhase = {
  nombre: string;
  estado: PublicRoadmapPhaseState;
  features: PublicRoadmapFeature[];
};

export type PublicRoadmapProject = {
  nombre: string;
  estado: string;
  avance_pct: number;
  fecha_inicio: string | null;
  entrega_comprometida: string | null;
  fases: PublicRoadmapPhase[];
  ultima_actualizacion: string | null;
};
