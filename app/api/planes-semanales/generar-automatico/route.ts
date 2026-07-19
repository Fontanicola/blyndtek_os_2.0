import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAgenteConfig } from "@/lib/agentes/agentes";
import { generarPlanSemanalContenido } from "@/lib/contenido/generarPlanSemanal";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { hoyLocalString } from "@/lib/utils/fechas";
import type { AgenteConfigRow, AgentesDatabase } from "@/types/agentes";
import type { ContenidoDatabase, PiezaContenido } from "@/types/contenido";

export const runtime = "nodejs";
export const maxDuration = 300;

type GeneracionAutomaticaRow = {
  id: string;
};

type GenerarCompletoResponse = {
  data?: {
    imagenes_generadas?: string[];
  };
  error?: string;
};

function isServiceRoleAuthorized(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(serviceRoleKey && request.headers.get("authorization") === `Bearer ${serviceRoleKey}`);
}

function currentWeekStart() {
  const today = new Date();
  const dayOffset = (today.getDay() + 6) % 7;
  today.setDate(today.getDate() - dayOffset);
  return hoyLocalString(today);
}

async function createExecution(supabase: SupabaseClient<ContenidoDatabase>) {
  const { data, error } = await supabase
    .from("generaciones_automaticas")
    .insert({
      estado: "en_curso",
      piezas_generadas: 0,
      error_detalle: null,
      finalizado_at: null
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el registro de generación automática.");
  }

  return (data as GeneracionAutomaticaRow).id;
}

async function isContentGeneratorEnabled(supabase: SupabaseClient<AgentesDatabase>) {
  const { data: agente, error: agenteError } = await supabase
    .from("agentes")
    .select("id")
    .eq("slug", "generador-contenido")
    .maybeSingle();

  if (agenteError) {
    throw new Error(agenteError.message);
  }

  if (!agente) {
    return true;
  }

  const { data: configRows, error: configError } = await supabase
    .from("agente_config")
    .select("*")
    .eq("agente_id", agente.id);

  if (configError) {
    throw new Error(configError.message);
  }

  return normalizeAgenteConfig((configRows ?? []) as AgenteConfigRow[]).generacion_automatica_activa;
}

async function updateExecution(
  supabase: SupabaseClient<ContenidoDatabase>,
  id: string,
  payload: {
    estado: "completado" | "fallido";
    piezas_generadas: number;
    error_detalle?: string | null;
    plan_semanal_id?: string | null;
  }
) {
  await supabase
    .from("generaciones_automaticas")
    .update({
      estado: payload.estado,
      piezas_generadas: payload.piezas_generadas,
      error_detalle: payload.error_detalle ?? null,
      ...(payload.plan_semanal_id !== undefined ? { plan_semanal_id: payload.plan_semanal_id } : {}),
      finalizado_at: new Date().toISOString()
    } as never)
    .eq("id", id);
}

async function postGenerarCompleto(request: Request, piezaId: string) {
  const response = await fetch(new URL(`/api/piezas-contenido/${piezaId}/generar-completo`, request.url), {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      authorization: request.headers.get("authorization") ?? ""
    }
  });
  const payload = (await response.json().catch(() => ({}))) as GenerarCompletoResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? `No se pudo generar la pieza ${piezaId}.`);
  }

  return payload.data?.imagenes_generadas?.length ?? 0;
}

async function registrarActividadAutomatica({
  supabase,
  generadoPor,
  executionId,
  planId,
  piezasGeneradas,
  errores
}: {
  supabase: SupabaseClient<AgentesDatabase>;
  generadoPor: string | null;
  executionId: string;
  planId: string | null;
  piezasGeneradas: number;
  errores: string[];
}) {
  const { data: agente } = await supabase
    .from("agentes")
    .select("id")
    .eq("slug", "generador-contenido")
    .maybeSingle();

  if (!agente) {
    return;
  }

  await supabase.from("agente_analisis").insert({
    agente_id: agente.id,
    tipo: "automatico",
    datos_calculados: {
      generacion_automatica_id: executionId,
      tipo_generacion: "content_studio_semanal",
      plan_semanal_id: planId,
      piezas_generadas: piezasGeneradas,
      errores
    },
    analisis_texto:
      errores.length > 0
        ? `Generación semanal automática finalizada con errores parciales: ${piezasGeneradas} piezas de feed generadas.`
        : `Generación semanal automática completada: ${piezasGeneradas} piezas de feed listas para revisión.`,
    tokens_entrada: null,
    tokens_salida: null,
    costo_estimado_usd: null,
    generado_por: generadoPor
  } as never);
}

export async function POST(request: Request) {
  const supabase = createAdminClient() as unknown as SupabaseClient<ContenidoDatabase>;
  let executionId: string | null = null;
  let planId: string | null = null;
  let piezasGeneradas = 0;
  const errores: string[] = [];

  try {
    const admin = await getAdminUser();
    const serviceRoleAuthorized = isServiceRoleAuthorized(request);
    if (!admin && !serviceRoleAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    executionId = await createExecution(supabase);
    const generatorEnabled = await isContentGeneratorEnabled(supabase as unknown as SupabaseClient<AgentesDatabase>);

    if (!generatorEnabled) {
      const pausedMessage = "Pausado, no se generó plan semanal automático.";
      await updateExecution(supabase, executionId, {
        estado: "completado",
        piezas_generadas: 0,
        error_detalle: pausedMessage
      });

      return NextResponse.json({
        data: {
          generacion_automatica_id: executionId,
          estado: "pausado",
          plan: null,
          piezas: [],
          piezas_generadas: 0,
          errores: [pausedMessage]
        }
      });
    }

    const created = await generarPlanSemanalContenido({
      supabase,
      semanaInicio: currentWeekStart(),
      creadoPor: admin?.id ?? null
    });
    planId = created.plan.id;

    const feedPieces = created.piezas.filter((pieza) => pieza.plataforma === "instagram_feed");
    for (const pieza of feedPieces) {
      try {
        await postGenerarCompleto(request, pieza.id);
        piezasGeneradas += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido al generar una pieza.";
        errores.push(`${pieza.titulo}: ${message}`);
      }
    }

    const estado = errores.length > 0 ? "fallido" : "completado";
    await updateExecution(supabase, executionId, {
      estado,
      piezas_generadas: piezasGeneradas,
      plan_semanal_id: planId,
      error_detalle: errores.length > 0 ? errores.join("\n") : null
    });

    await registrarActividadAutomatica({
      supabase: supabase as unknown as SupabaseClient<AgentesDatabase>,
      generadoPor: admin?.id ?? null,
      executionId,
      planId,
      piezasGeneradas,
      errores
    });

    return NextResponse.json({
      data: {
        generacion_automatica_id: executionId,
        estado,
        plan: created.plan,
        piezas: created.piezas as PiezaContenido[],
        piezas_generadas: piezasGeneradas,
        errores
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (executionId) {
      await updateExecution(supabase, executionId, {
        estado: "fallido",
        piezas_generadas: piezasGeneradas,
        plan_semanal_id: planId,
        error_detalle: [message, ...errores].join("\n")
      });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
