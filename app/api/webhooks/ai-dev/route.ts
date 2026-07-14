import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearTareaConAdminClient } from "@/lib/tareas/crearTarea";
import { estimateAiDevCostUsd, extractPullRequestNumber } from "@/lib/ai-dev";

type WebhookStatus = "codeando" | "pr_abierto" | "fallido";

type WebhookTask = {
  titulo: string;
  descripcion?: string | null;
};

type WebhookBody = {
  fase_id?: string;
  ejecucion_id?: string;
  estado?: WebhookStatus;
  pr_url?: string | null;
  sql_pendiente?: string | null;
  tareas_manuales?: WebhookTask[];
  tokens_entrada?: number | null;
  tokens_salida?: number | null;
  tiempo_segundos?: number | null;
  error?: string | null;
};

type PhaseRow = {
  id: string;
  proyecto_id: string;
  ai_dev_estado: string | null;
  ai_dev_error: string | null;
  pr_url: string | null;
  pr_numero: number | null;
  sql_pendiente: string | null;
  sql_ejecutado: boolean | null;
  proyectos: {
    responsable_id: string | null;
  } | null;
};

type PhaseUpdatePayload = {
  ai_dev_estado?: "codeando" | "pr_abierto" | "fallido";
  ai_dev_error?: string | null;
  pr_url?: string | null;
  pr_numero?: number | null;
  sql_pendiente?: string | null;
  sql_ejecutado?: boolean;
};

type ExecutionUpdatePayload = {
  estado?: "en_curso" | "completado" | "fallido";
  finalizado_at?: string | null;
  pr_url?: string | null;
  tokens_entrada?: number | null;
  tokens_salida?: number | null;
  costo_estimado_usd?: number | null;
};

type TaskRow = {
  id: string;
  estado: string;
  es_ia: boolean | null;
};

function nowIso() {
  return new Date().toISOString();
}

function getSecret(request: NextRequest) {
  return request.headers.get("x-ai-dev-secret") ?? request.headers.get("x-blyndtek-ai-dev-secret");
}

async function syncAiTasksForFailure(supabase: ReturnType<typeof createAdminClient>, phaseId: string) {
  const { data: featureRows, error: featureError } = await supabase
    .from("features")
    .select("id")
    .eq("fase_id", phaseId);

  if (featureError) {
    throw new Error(featureError.message);
  }

  const featureIds = (featureRows ?? []).map((feature) => feature.id);
  if (featureIds.length === 0) {
    return;
  }

  const { data: taskRows, error: taskError } = await supabase
    .from("tareas")
    .select("id, estado, es_ia")
    .in("feature_id", featureIds)
    .eq("estado", "en_proceso")
    .eq("es_ia", true);

  if (taskError) {
    throw new Error(taskError.message);
  }

  await Promise.all(
    ((taskRows ?? []) as TaskRow[]).map(async (task) => {
      await supabase
        .from("tareas")
        .update({
          estado: "nueva",
          es_ia: true
        })
        .eq("id", task.id);
    })
  );
}

export async function POST(request: NextRequest) {
  try {
    const secret = getSecret(request);
    const expectedSecret = process.env.AI_DEV_WEBHOOK_SECRET;

    if (!expectedSecret) {
      return NextResponse.json({ error: "Falta AI_DEV_WEBHOOK_SECRET." }, { status: 500 });
    }

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as WebhookBody;

    if (!body.fase_id || !body.ejecucion_id || !body.estado) {
      return NextResponse.json(
        { error: "fase_id, ejecucion_id y estado son requeridos." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: phase, error: phaseError } = await supabase
      .from("fases_proyecto")
      .select(
        `
          id,
          proyecto_id,
          ai_dev_estado,
          ai_dev_error,
          pr_url,
          pr_numero,
          sql_pendiente,
          sql_ejecutado,
          proyectos (
            responsable_id
          )
        `
      )
      .eq("id", body.fase_id)
      .maybeSingle();

    if (phaseError || !phase) {
      const status = phaseError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: phaseError?.message ?? "No se encontró la fase." }, { status });
    }

    const currentPhase = phase as PhaseRow;
    const phaseUpdates: PhaseUpdatePayload = {};
    const executionUpdates: ExecutionUpdatePayload = {};

    if (body.estado === "codeando") {
      phaseUpdates.ai_dev_estado = "codeando";
    }

    if (body.estado === "pr_abierto") {
      phaseUpdates.ai_dev_estado = "pr_abierto";
      phaseUpdates.pr_url = body.pr_url ?? currentPhase.pr_url ?? null;
      phaseUpdates.pr_numero = extractPullRequestNumber(phaseUpdates.pr_url as string | null);
      if (typeof body.sql_pendiente === "string") {
        phaseUpdates.sql_pendiente = body.sql_pendiente;
        phaseUpdates.sql_ejecutado = false;
      }
    }

    if (body.estado === "fallido") {
      phaseUpdates.ai_dev_estado = "fallido";
      phaseUpdates.ai_dev_error = body.error ?? "AI Dev falló sin detalle.";
    }

    if (Object.keys(phaseUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from("fases_proyecto")
        .update(phaseUpdates)
        .eq("id", body.fase_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    if (Array.isArray(body.tareas_manuales) && body.tareas_manuales.length > 0) {
      for (const tarea of body.tareas_manuales) {
        try {
          await crearTareaConAdminClient(
            supabase,
            {
              titulo: `[IA] ${tarea.titulo}`,
              proyecto_id: currentPhase.proyecto_id,
              notas: tarea.descripcion ?? null
            },
            { defaultResponsableId: currentPhase.proyectos?.responsable_id ?? null }
          );
        } catch (taskError) {
          console.error(
            "No se pudo crear una tarea manual de AI Dev:",
            taskError instanceof Error ? taskError.message : "Unexpected task error"
          );
        }
      }
    }

    if (typeof body.tiempo_segundos === "number" && body.tiempo_segundos > 0) {
      const end = new Date();
      const start = new Date(end.getTime() - body.tiempo_segundos * 1000);

      const { error: sessionError } = await supabase.from("sesiones_tiempo").insert({
        fase_id: body.fase_id,
        usuario_id: null,
        es_ia: true,
        inicio: start.toISOString(),
        fin: end.toISOString(),
        duracion_segundos: Math.max(0, Math.round(body.tiempo_segundos)),
        nota: "AI Dev"
      });

      if (sessionError) {
        return NextResponse.json({ error: sessionError.message }, { status: 500 });
      }
    }

    if (typeof body.tokens_entrada === "number" || typeof body.tokens_salida === "number") {
      executionUpdates.tokens_entrada = body.tokens_entrada ?? null;
      executionUpdates.tokens_salida = body.tokens_salida ?? null;
      executionUpdates.costo_estimado_usd = estimateAiDevCostUsd(
        body.tokens_entrada ?? null,
        body.tokens_salida ?? null
      );
    }

    if (body.pr_url) {
      executionUpdates.pr_url = body.pr_url;
    }

    if (body.estado === "pr_abierto") {
      executionUpdates.estado = "completado";
      executionUpdates.finalizado_at = nowIso();
    } else if (body.estado === "fallido") {
      executionUpdates.estado = "fallido";
      executionUpdates.finalizado_at = nowIso();
    }

    if (Object.keys(executionUpdates).length > 0) {
      const { error: executionError } = await supabase
        .from("ai_dev_ejecuciones")
        .update(executionUpdates)
        .eq("id", body.ejecucion_id);

      if (executionError) {
        return NextResponse.json({ error: executionError.message }, { status: 500 });
      }
    }

    if (body.estado === "fallido") {
      await syncAiTasksForFailure(supabase, body.fase_id);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
