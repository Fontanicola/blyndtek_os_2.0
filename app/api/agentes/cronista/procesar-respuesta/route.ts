import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/lib/require-admin";
import {
  addUsage,
  clasificarRespuestaCronista,
  construirLogMarkdown,
  isCronistaDate
} from "@/lib/agentes/cronista";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase, CronistaLogDiario } from "@/types/agentes";

type ProcessBody = {
  fecha?: unknown;
  respuesta?: unknown;
};

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as ProcessBody | null;
  const respuesta = typeof body?.respuesta === "string" ? body.respuesta.trim() : "";

  if (!isCronistaDate(body?.fecha)) {
    return NextResponse.json({ error: "La fecha debe usar el formato YYYY-MM-DD." }, { status: 400 });
  }

  if (!respuesta) {
    return NextResponse.json({ error: "Escribí una respuesta antes de guardar." }, { status: 400 });
  }

  if (respuesta.length > 12_000) {
    return NextResponse.json({ error: "La respuesta supera el máximo de 12.000 caracteres." }, { status: 400 });
  }

  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
  let logId: string | null = null;

  try {
    const { data: log, error: logError } = await supabase
      .from("logs_diarios")
      .select("*")
      .eq("fecha", body.fecha)
      .maybeSingle();

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    if (!log) {
      return NextResponse.json(
        { error: "Primero generá las preguntas del día." },
        { status: 404 }
      );
    }

    logId = log.id;
    const processingAt = new Date().toISOString();
    const { error: processingError } = await supabase
      .from("logs_diarios")
      .update({
        respuesta_cruda: respuesta,
        estado: "procesando",
        updated_at: processingAt
      })
      .eq("id", log.id);

    if (processingError) {
      return NextResponse.json({ error: processingError.message }, { status: 500 });
    }

    const { clasificacion, usage } = await clasificarRespuestaCronista(
      log.datos_duros,
      log.preguntas,
      respuesta
    );
    const accumulatedUsage = addUsage(
      {
        tokensEntrada: log.tokens_entrada,
        tokensSalida: log.tokens_salida,
        costoEstimadoUsd: log.costo_estimado_usd
      },
      usage
    );
    const logEstructurado = construirLogMarkdown({
      fecha: body.fecha,
      datos: log.datos_duros,
      clasificacion
    });

    const { data: actualizado, error: updateError } = await supabase
      .from("logs_diarios")
      .update({
        respuesta_cruda: respuesta,
        log_estructurado: logEstructurado,
        estado: "completado",
        tokens_entrada: accumulatedUsage.tokensEntrada,
        tokens_salida: accumulatedUsage.tokensSalida,
        costo_estimado_usd: accumulatedUsage.costoEstimadoUsd,
        updated_at: new Date().toISOString()
      })
      .eq("id", log.id)
      .select("*")
      .single();

    if (updateError || !actualizado) {
      throw new Error(updateError?.message ?? "No se pudo guardar el contexto del día.");
    }

    return NextResponse.json({ data: { log: actualizado as CronistaLogDiario } });
  } catch (error) {
    if (logId) {
      await supabase
        .from("logs_diarios")
        .update({ estado: "fallido", updated_at: new Date().toISOString() })
        .eq("id", logId)
        .then(() => undefined);
    }

    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
