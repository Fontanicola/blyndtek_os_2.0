import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import {
  CRONISTA_AUTOMATIZACION_ENDPOINT,
  construirLogMarkdown,
  fechaActualArgentina,
  generarPreguntasCronista,
  isCronistaDate,
  reunirDatosDurosCronista
} from "@/lib/agentes/cronista";
import {
  fetchAutomatizacionByEndpoint,
  marcarAutomatizacionEjecutada
} from "@/lib/agentes/automatizaciones";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase, CronistaLogDiario } from "@/types/agentes";

export const maxDuration = 30;

function isCronAuthorized(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${serviceRoleKey}`;
}

async function parseFecha(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { fecha?: unknown } | null;
  if (body?.fecha === undefined) {
    return fechaActualArgentina();
  }
  return isCronistaDate(body.fecha) ? body.fecha : null;
}

export async function POST(request: NextRequest) {
  let automationId: string | null = null;
  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;

  try {
    const cronAuthorized = isCronAuthorized(request);
    const currentUser = cronAuthorized ? null : await getCurrentUser();

    if (!cronAuthorized && (!currentUser || currentUser.rol !== "admin")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const fecha = await parseFecha(request);
    if (!fecha) {
      return NextResponse.json({ error: "La fecha debe usar el formato YYYY-MM-DD." }, { status: 400 });
    }

    const automatizacion = cronAuthorized
      ? await fetchAutomatizacionByEndpoint(supabase, CRONISTA_AUTOMATIZACION_ENDPOINT)
      : null;
    automationId = automatizacion?.id ?? null;

    if (cronAuthorized && automatizacion && !automatizacion.activa) {
      await marcarAutomatizacionEjecutada(supabase, automatizacion.id);
      return NextResponse.json({ data: { skipped: true, motivo: "automatizacion_pausada" } });
    }

    const { data: existente, error: existenteError } = await supabase
      .from("logs_diarios")
      .select("*")
      .eq("fecha", fecha)
      .maybeSingle();

    if (existenteError) {
      return NextResponse.json({ error: existenteError.message }, { status: 500 });
    }

    if (existente?.estado === "completado") {
      if (cronAuthorized && automatizacion) {
        await marcarAutomatizacionEjecutada(supabase, automatizacion.id);
      }
      return NextResponse.json({ data: { log: existente, skipped: true, motivo: "log_completado" } });
    }

    const datosDuros = await reunirDatosDurosCronista(supabase, fecha);
    const { preguntas, usage } = await generarPreguntasCronista(datosDuros);
    const logEstructurado = construirLogMarkdown({ fecha, datos: datosDuros });
    const now = new Date().toISOString();

    const { data: log, error: upsertError } = await supabase
      .from("logs_diarios")
      .upsert(
        {
          fecha,
          datos_duros: datosDuros,
          preguntas,
          log_estructurado: logEstructurado,
          estado: "sin_contexto_humano",
          tokens_entrada: usage.tokensEntrada,
          tokens_salida: usage.tokensSalida,
          costo_estimado_usd: usage.costoEstimadoUsd,
          updated_at: now
        },
        { onConflict: "fecha" }
      )
      .select("*")
      .single();

    if (upsertError || !log) {
      return NextResponse.json(
        { error: upsertError?.message ?? "No se pudo guardar el log diario." },
        { status: 500 }
      );
    }

    if (cronAuthorized && automatizacion) {
      await marcarAutomatizacionEjecutada(supabase, automatizacion.id);
    }

    return NextResponse.json(
      {
        data: {
          log: log as CronistaLogDiario,
          generado_automaticamente: cronAuthorized
        }
      },
      { status: existente ? 200 : 201 }
    );
  } catch (error) {
    if (automationId) {
      await marcarAutomatizacionEjecutada(supabase, automationId).catch(() => undefined);
    }

    const message = error instanceof Error ? error.message : "Error inesperado.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
