import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PublicFeatureState,
  PublicRoadmapFeature,
  PublicRoadmapPayment,
  PublicRoadmapPaymentSummary,
  PublicRoadmapPhase,
  PublicRoadmapPhaseState,
  PublicRoadmapProject
} from "@/types/roadmap-public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    token: string;
  };
};

type ProjectRecord = {
  id: string;
  cliente_id: string;
  nombre: string;
  estado: string;
  avance_pct: number | null;
  fecha_inicio: string | null;
  entrega_comprometida: string | null;
  created_at: string;
  url_sistema: string | null;
  roadmap_pin: string | null;
};

type PhaseRecord = {
  id: string;
  nombre: string;
  estado: PublicRoadmapPhaseState;
  orden: number;
  fecha_estimada_inicio: string | null;
  fecha_estimada_fin: string | null;
  descripcion: string | null;
  created_at: string;
};

type FeatureRecord = {
  id: string;
  fase_id: string;
  nombre: string;
  estado: PublicFeatureState;
  orden: number | null;
  created_at: string;
};

type CobroRecord = {
  id: string;
  concepto: string;
  monto: number;
  fecha_vencimiento: string;
  estado: PublicRoadmapPayment["estado"];
  tipo: "one_pay" | "hito";
  cliente_id: string;
  proyecto_id: string | null;
  created_at: string;
};

type PaymentSummaryResult = PublicRoadmapPaymentSummary & {
  cobros: CobroRecord[];
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

function normalizeFeatureState(estado: string): PublicFeatureState {
  if (estado === "en_curso" || estado === "lista") {
    return estado;
  }

  return "pendiente";
}

function buildPhasesFromRecords(
  phaseRecords: PhaseRecord[],
  featureRecords: FeatureRecord[]
): PublicRoadmapPhase[] {
  if (phaseRecords.length > 0) {
    return [...phaseRecords]
      .sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre))
      .map<PublicRoadmapPhase>((phase) => {
        const matchingFeatures = featureRecords.filter((feature) => {
          const phaseValue = feature.fase_id.trim();
          return phaseValue === phase.id || phaseValue === phase.nombre.trim();
        });

        const publicFeatures: PublicRoadmapFeature[] = matchingFeatures.map((feature) => ({
          nombre: feature.nombre,
          estado: normalizeFeatureState(feature.estado)
        }));

        const completed = publicFeatures.filter((feature) => feature.estado === "lista").length;

        return {
          id: phase.id,
          nombre: phase.nombre,
          estado: getPhaseState(publicFeatures),
          fecha_estimada_inicio: phase.fecha_estimada_inicio,
          fecha_estimada_fin: phase.fecha_estimada_fin,
          descripcion: phase.descripcion,
          features_totales: publicFeatures.length,
          features_completadas: completed,
          features: publicFeatures
        };
      });
  }

  const phasesMap = new Map<string, PublicRoadmapFeature[]>();

  featureRecords.forEach((feature) => {
    const phaseName = feature.fase_id.trim() || "General";
    const current = phasesMap.get(phaseName) ?? [];
    current.push({
      nombre: feature.nombre,
      estado: normalizeFeatureState(feature.estado)
    });
    phasesMap.set(phaseName, current);
  });

  return Array.from(phasesMap.entries()).map<PublicRoadmapPhase>(([nombre, phaseFeatures]) => {
    const completed = phaseFeatures.filter((feature) => feature.estado === "lista").length;

    return {
      id: nombre,
      nombre,
      estado: getPhaseState(phaseFeatures),
      fecha_estimada_inicio: null,
      fecha_estimada_fin: null,
      descripcion: null,
      features_totales: phaseFeatures.length,
      features_completadas: completed,
      features: phaseFeatures
    };
  });
}

function sumMonto(items: Array<{ monto: number }>) {
  return items.reduce((accumulator, item) => accumulator + Number(item.monto ?? 0), 0);
}

async function findProjectByToken(supabase: ReturnType<typeof createAdminClient>, token: string) {
  const select = "id, cliente_id, nombre, estado, avance_pct, fecha_inicio, entrega_comprometida, created_at, url_sistema, roadmap_pin";

  const bySlug = await supabase
    .from("proyectos")
    .select(select)
    .eq("roadmap_slug", token)
    .eq("roadmap_publico_activo", true)
    .maybeSingle<ProjectRecord>();

  if (bySlug.data) {
    return bySlug.data;
  }

  const byToken = await supabase
    .from("proyectos")
    .select(select)
    .eq("roadmap_token", token)
    .eq("roadmap_publico_activo", true)
    .maybeSingle<ProjectRecord>();

  return byToken.data ?? null;
}

async function fetchCobrosPublicos(supabase: ReturnType<typeof createAdminClient>, project: ProjectRecord) {
  const select = "id, concepto, monto, fecha_vencimiento, estado, tipo, cliente_id, proyecto_id, created_at";

  const [projectCobros, clientCobros] = await Promise.all([
    supabase
      .from("cobros")
      .select(select)
      .eq("proyecto_id", project.id)
      .in("tipo", ["hito", "one_pay"])
      .returns<CobroRecord[]>(),
    supabase
      .from("cobros")
      .select(select)
      .eq("cliente_id", project.cliente_id)
      .in("tipo", ["hito", "one_pay"])
      .returns<CobroRecord[]>()
  ]);

  if (projectCobros.error) {
    throw new Error(projectCobros.error.message);
  }

  if (clientCobros.error) {
    throw new Error(clientCobros.error.message);
  }

  const merged = new Map<string, CobroRecord>();

  for (const cobro of [...(projectCobros.data ?? []), ...(clientCobros.data ?? [])]) {
    merged.set(cobro.id, cobro);
  }

  const cobros = Array.from(merged.values()).sort((first, second) => {
    if (first.fecha_vencimiento !== second.fecha_vencimiento) {
      return first.fecha_vencimiento.localeCompare(second.fecha_vencimiento);
    }

    return first.concepto.localeCompare(second.concepto);
  });

  const totalContrato = sumMonto(cobros);
  const totalPagado = sumMonto(cobros.filter((cobro) => cobro.estado === "cobrado"));
  const totalPendiente = Math.max(totalContrato - totalPagado, 0);

  const hitos: PublicRoadmapPayment[] = cobros.map((cobro) => ({
    concepto: cobro.concepto,
    monto: Number(cobro.monto),
    fecha_vencimiento: cobro.fecha_vencimiento,
    estado: cobro.estado
  }));

  return {
    cobros,
    total_contrato: totalContrato,
    total_pagado: totalPagado,
    total_pendiente: totalPendiente,
    hitos
  } satisfies PaymentSummaryResult;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const token = params.token.trim();

    if (!token) {
      return NextResponse.json({ error: "Roadmap no encontrado." }, { status: 404 });
    }

    const supabase = createAdminClient();
    const project = await findProjectByToken(supabase, token);

    if (!project) {
      return NextResponse.json({ error: "Roadmap no encontrado." }, { status: 404 });
    }

    const [phaseResult, featureResult, paymentSummary] = await Promise.all([
      supabase
        .from("fases_proyecto")
        .select("id, nombre, estado, orden, fecha_estimada_inicio, fecha_estimada_fin, descripcion, created_at")
        .eq("proyecto_id", project.id)
        .order("orden", { ascending: true })
        .returns<PhaseRecord[]>(),
      supabase
        .from("features")
        .select("id, fase_id, nombre, estado, orden, created_at")
        .eq("proyecto_id", project.id)
        .order("orden", { ascending: true, nullsFirst: false })
        .returns<FeatureRecord[]>(),
      fetchCobrosPublicos(supabase, project)
    ]);

    if (phaseResult.error) {
      return NextResponse.json({ error: phaseResult.error.message }, { status: 500 });
    }

    if (featureResult.error) {
      return NextResponse.json({ error: featureResult.error.message }, { status: 500 });
    }

    const lastUpdatedCandidates = [
      project.created_at,
      ...(phaseResult.data ?? []).map((phase) => phase.created_at),
      ...(featureResult.data ?? []).map((feature) => feature.created_at),
      ...(paymentSummary.cobros ?? []).map((cobro) => cobro.created_at)
    ].filter(Boolean);

    const ultimaActualizacion =
      lastUpdatedCandidates.length > 0
        ? lastUpdatedCandidates.sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0] ?? null
        : null;

    const payload: PublicRoadmapProject = {
      nombre: project.nombre,
      estado: project.estado,
      avance_pct: project.avance_pct ?? 0,
      fecha_inicio: project.fecha_inicio,
      entrega_comprometida: project.entrega_comprometida,
      fases: buildPhasesFromRecords(phaseResult.data ?? [], featureResult.data ?? []),
      ultima_actualizacion: ultimaActualizacion,
      url_sistema: project.url_sistema,
      tiene_pin: Boolean(project.roadmap_pin?.trim()),
      pagos: {
        total_contrato: paymentSummary.total_contrato,
        total_pagado: paymentSummary.total_pagado,
        total_pendiente: paymentSummary.total_pendiente,
        hitos: paymentSummary.hitos
      }
    };

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
