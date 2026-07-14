import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isValidGitHubRepo } from "@/lib/ai-dev";
import { sincronizarDesdeFeature } from "@/lib/proyectos/sincronizarFeatureTarea";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoFeature } from "@/types/features";
import type { Database } from "@/types/supabase";
import type { EstadoTarea } from "@/types/tareas";

type RouteContext = {
  params: {
    id: string;
  };
};

type FaseWithProject = {
  id: string;
  nombre: string;
  descripcion: string | null;
  proyecto_id: string;
  ai_dev_estado: string | null;
  ai_dev_iniciado_at: string | null;
  ai_dev_error: string | null;
  pr_url: string | null;
  pr_numero: number | null;
  sql_pendiente: string | null;
  sql_ejecutado: boolean | null;
  proyectos: {
    id: string;
    nombre: string;
    github_repo: string | null;
    responsable_id: string | null;
  } | null;
};

type FeatureRow = {
  id: string;
  estado: EstadoFeature;
  nombre: string;
  descripcion: string | null;
  fase_id: string;
  orden: number;
};

type TaskRow = {
  id: string;
  feature_id: string | null;
  estado: EstadoTarea;
  responsable_id: string | null;
  es_ia: boolean | null;
};

type PhaseSnapshot = Pick<
  FaseWithProject,
  | "ai_dev_estado"
  | "ai_dev_iniciado_at"
  | "ai_dev_error"
  | "pr_url"
  | "pr_numero"
  | "sql_pendiente"
  | "sql_ejecutado"
>;

function nowIso() {
  return new Date().toISOString();
}

async function rollbackAiDevKickoff(
  supabase: ReturnType<typeof createAdminClient>,
  phaseId: string,
  featureSnapshots: Array<{ id: string; estado: EstadoFeature }>,
  taskSnapshots: TaskRow[],
  phaseSnapshot: PhaseSnapshot
) {
  const rollbackPhasePayload: Database["public"]["Tables"]["fases_proyecto"]["Update"] = {
    ai_dev_estado: phaseSnapshot.ai_dev_estado ?? undefined,
    ai_dev_iniciado_at: phaseSnapshot.ai_dev_iniciado_at,
    ai_dev_error: phaseSnapshot.ai_dev_error,
    pr_url: phaseSnapshot.pr_url,
    pr_numero: phaseSnapshot.pr_numero,
    sql_pendiente: phaseSnapshot.sql_pendiente,
    sql_ejecutado: phaseSnapshot.sql_ejecutado
  } as Record<string, unknown>;

  await Promise.all(
    featureSnapshots.map(async (feature) => {
      await supabase.from("features").update({ estado: feature.estado }).eq("id", feature.id);
    })
  );

  await Promise.all(
    taskSnapshots.map(async (task) => {
      await supabase
        .from("tareas")
        .update({
          estado: task.estado,
          responsable_id: task.responsable_id ?? undefined,
          es_ia: task.es_ia ?? false
        })
        .eq("id", task.id);
    })
  );

  await supabase
    .from("fases_proyecto")
    .update(rollbackPhasePayload)
    .eq("id", phaseId);
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: fase, error: faseError } = await supabase
      .from("fases_proyecto")
      .select(
        `
          id,
          nombre,
          descripcion,
          proyecto_id,
          ai_dev_estado,
          ai_dev_iniciado_at,
          ai_dev_error,
          pr_url,
          pr_numero,
          sql_pendiente,
          sql_ejecutado,
          proyectos (
            id,
            nombre,
            github_repo,
            responsable_id
          )
        `
      )
      .eq("id", params.id)
      .maybeSingle();

    if (faseError || !fase) {
      const status = faseError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: faseError?.message ?? "No se pudo encontrar la fase." }, { status });
    }

    const currentPhase = fase as FaseWithProject;
    const githubRepo = currentPhase.proyectos?.github_repo?.trim() ?? "";

    if (!githubRepo || !isValidGitHubRepo(githubRepo)) {
      return NextResponse.json(
        { error: "Este proyecto no tiene un repositorio de GitHub configurado para AI Dev." },
        { status: 400 }
      );
    }

    const { data: features, error: featuresError } = await supabase
      .from("features")
      .select("id, estado, nombre, descripcion, fase_id, orden")
      .eq("fase_id", currentPhase.id)
      .neq("estado", "lista")
      .order("orden", { ascending: true });

    if (featuresError) {
      return NextResponse.json({ error: featuresError.message }, { status: 500 });
    }

    const featureRows = (features ?? []) as FeatureRow[];
    const featureSnapshots = featureRows.map((feature) => ({
      id: feature.id,
      estado: feature.estado
    }));
    const featureIds = featureRows.map((feature) => feature.id);

    const { data: taskRows, error: taskRowsError } =
      featureIds.length > 0
        ? await supabase
            .from("tareas")
            .select("id, feature_id, estado, responsable_id, es_ia")
            .in("feature_id", featureIds)
        : { data: [], error: null as { message: string } | null };

    if (taskRowsError) {
      return NextResponse.json({ error: taskRowsError.message }, { status: 500 });
    }

    const taskByFeatureId = new Map<string, TaskRow>();
    for (const task of (taskRows ?? []) as TaskRow[]) {
      if (task.feature_id) {
        taskByFeatureId.set(task.feature_id, task);
      }
    }

    const taskSnapshots: TaskRow[] = [];
    const webhookSecret = process.env.AI_DEV_WEBHOOK_SECRET;
    const webhookUrl =
      process.env.BLYNDTEK_WEBHOOK_URL ?? new URL("/api/webhooks/ai-dev", _request.nextUrl.origin).toString();
    const modelOrchestrator = process.env.AI_DEV_MODEL_ORQUESTADOR ?? "claude-sonnet-4-6";
    const modelImplementation = process.env.AI_DEV_MODEL_IMPLEMENTACION ?? "claude-sonnet-4-6";
    let executionId: string | null = null;

    if (!webhookSecret) {
      return NextResponse.json({ error: "Falta AI_DEV_WEBHOOK_SECRET." }, { status: 500 });
    }

    try {
      for (const feature of featureRows) {
        if (feature.estado === "pendiente") {
          const { error: featureUpdateError } = await supabase
            .from("features")
            .update({ estado: "en_curso" })
            .eq("id", feature.id);

          if (featureUpdateError) {
            throw new Error(featureUpdateError.message);
          }

          await sincronizarDesdeFeature(feature.id, "en_curso");
        }

        const linkedTask = taskByFeatureId.get(feature.id);
        if (!linkedTask) {
          continue;
        }

        taskSnapshots.push({
          id: linkedTask.id,
          feature_id: linkedTask.feature_id,
          estado: linkedTask.estado,
          responsable_id: linkedTask.responsable_id,
          es_ia: linkedTask.es_ia
        });

        const nextEstado: EstadoTarea = linkedTask.estado === "terminada" ? "terminada" : "en_proceso";
        const { error: taskUpdateError } = await supabase
          .from("tareas")
          .update({
            estado: nextEstado,
            responsable_id: null,
            es_ia: true
          })
          .eq("id", linkedTask.id);

        if (taskUpdateError) {
          throw new Error(taskUpdateError.message);
        }
      }

      const { data: updatedPhase, error: updateError } = await supabase
        .from("fases_proyecto")
        .update({
          ai_dev_estado: "planificando",
          ai_dev_iniciado_at: nowIso(),
          ai_dev_error: null,
          pr_url: null,
          pr_numero: null,
          sql_pendiente: null,
          sql_ejecutado: false
        })
        .eq("id", currentPhase.id)
        .select("id")
        .single();

      if (updateError || !updatedPhase) {
        throw new Error(updateError?.message ?? "No se pudo iniciar AI Dev.");
      }

      const { data: ejecucion, error: ejecucionError } = await supabase
        .from("ai_dev_ejecuciones")
        .insert({
          fase_id: currentPhase.id,
          modelo_orquestador: modelOrchestrator,
          modelo_implementacion: modelImplementation,
          estado: "en_curso",
          iniciado_por: currentUser.id,
          iniciado_at: nowIso(),
          finalizado_at: null,
          pr_url: null,
          tokens_entrada: null,
          tokens_salida: null,
          costo_estimado_usd: null
        })
        .select("id")
        .single();

      if (ejecucionError || !ejecucion) {
        throw new Error(ejecucionError?.message ?? "No se pudo crear la ejecución de AI Dev.");
      }

      executionId = ejecucion.id;

      const { data: phaseForPayload } = await supabase
        .from("fases_proyecto")
        .select("id, nombre, descripcion, proyecto_id")
        .eq("id", currentPhase.id)
        .maybeSingle();

      const clientPayload = {
        fase_id: currentPhase.id,
        nombre_fase: phaseForPayload?.nombre ?? currentPhase.nombre,
        descripcion_fase: phaseForPayload?.descripcion ?? currentPhase.descripcion,
        proyecto_id: phaseForPayload?.proyecto_id ?? currentPhase.proyecto_id,
        proyecto_nombre: currentPhase.proyectos?.nombre ?? null,
        github_repo: githubRepo,
        features: featureRows.map((feature) => ({
          nombre: feature.nombre,
          descripcion: feature.descripcion,
          fase_id: feature.fase_id,
          orden: feature.orden
        })),
        ejecucion_id: ejecucion.id,
        webhook_url: webhookUrl,
        webhook_secret: webhookSecret
      };

      const githubResponse = await fetch(`https://api.github.com/repos/${githubRepo}/dispatches`, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}`,
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify({
          event_type: "ai-dev-build",
          client_payload: clientPayload
        })
      });

      if (!githubResponse.ok) {
        const errorBody = await githubResponse.text();
        const message = `GitHub dispatch falló (${githubResponse.status}): ${errorBody.slice(0, 240)}`;

        await rollbackAiDevKickoff(supabase, currentPhase.id, featureSnapshots, taskSnapshots, currentPhase);

        await supabase
          .from("ai_dev_ejecuciones")
          .update({
            estado: "fallido",
            finalizado_at: nowIso()
          })
          .eq("id", ejecucion.id);

        return NextResponse.json({ error: message }, { status: 500 });
      }

      return NextResponse.json({ data: { ejecucion_id: ejecucion.id } });
    } catch (innerError) {
      await rollbackAiDevKickoff(supabase, currentPhase.id, featureSnapshots, taskSnapshots, currentPhase);

      if (executionId) {
        await supabase
          .from("ai_dev_ejecuciones")
          .update({
            estado: "fallido",
            finalizado_at: nowIso()
          })
          .eq("id", executionId);
      }

      throw innerError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
