import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PublicFeatureState,
  PublicRoadmapFeature,
  PublicRoadmapPhase,
  PublicRoadmapPhaseState,
  PublicRoadmapProject
} from "@/types/roadmap-public";

type RouteContext = {
  params: {
    token: string;
  };
};

type ProjectRecord = {
  id: string;
  nombre: string;
  estado: string;
  avance_pct: number | null;
  fecha_inicio: string | null;
  entrega_comprometida: string | null;
  created_at: string;
};

type FeatureRecord = {
  fase: string | null;
  nombre: string;
  estado: PublicFeatureState;
  created_at: string;
  orden: number | null;
};

function getPhaseState(features: PublicRoadmapFeature[]): PublicRoadmapPhaseState {
  if (features.length > 0 && features.every((feature) => feature.estado === "lista")) {
    return "completada";
  }

  if (features.some((feature) => feature.estado === "en_curso" || feature.estado === "lista")) {
    return "en_curso";
  }

  return "pendiente";
}

function groupFeaturesByPhase(features: FeatureRecord[]) {
  const phasesMap = new Map<string, PublicRoadmapFeature[]>();

  features.forEach((feature) => {
    const phaseName = feature.fase?.trim() || "General";
    const current = phasesMap.get(phaseName) ?? [];
    current.push({
      nombre: feature.nombre,
      estado: feature.estado
    });
    phasesMap.set(phaseName, current);
  });

  return Array.from(phasesMap.entries()).map<PublicRoadmapPhase>(([nombre, phaseFeatures]) => ({
    nombre,
    estado: getPhaseState(phaseFeatures),
    features: phaseFeatures
  }));
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const token = params.token.trim();

    if (!token) {
      return NextResponse.json({ error: "Roadmap no encontrado." }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data: project, error: projectError } = await supabase
      .from("proyectos")
      .select(
        "id, nombre, estado, avance_pct, fecha_inicio, entrega_comprometida, created_at"
      )
      .eq("roadmap_token", token)
      .eq("roadmap_publico_activo", true)
      .single<ProjectRecord>();

    if (projectError || !project) {
      return NextResponse.json({ error: "Roadmap no encontrado." }, { status: 404 });
    }

    const { data: features, error: featuresError } = await supabase
      .from("features")
      .select("fase, nombre, estado, created_at, orden")
      .eq("proyecto_id", project.id)
      .order("fase", { ascending: true })
      .order("orden", { ascending: true, nullsFirst: false })
      .returns<FeatureRecord[]>();

    if (featuresError) {
      return NextResponse.json({ error: featuresError.message }, { status: 500 });
    }

    const orderedFeatures = features ?? [];
    const lastUpdatedCandidates = [
      project.created_at,
      ...orderedFeatures.map((feature) => feature.created_at)
    ].filter(Boolean);
    const ultimaActualizacion =
      lastUpdatedCandidates.length > 0
        ? (lastUpdatedCandidates
            .sort((first, second) => {
              return new Date(second).getTime() - new Date(first).getTime();
            })[0] ?? null)
        : null;

    const payload: PublicRoadmapProject = {
      nombre: project.nombre,
      estado: project.estado,
      avance_pct: project.avance_pct ?? 0,
      fecha_inicio: project.fecha_inicio,
      entrega_comprometida: project.entrega_comprometida,
      fases: groupFeaturesByPhase(orderedFeatures),
      ultima_actualizacion: ultimaActualizacion
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
