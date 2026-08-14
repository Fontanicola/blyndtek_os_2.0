import type { SupabaseClient } from "@supabase/supabase-js";
import { generarCronistaReportePdf } from "@/lib/agentes/cronista-reporte-pdf";
import { enviarReporteSocios } from "@/lib/agentes/cronista-reporte-email";
import {
  construirReporteMarkdown,
  generarContenidoReporte,
  reunirFuentesReporte,
  reunirMetricasReporte,
  resolverPeriodoCronista
} from "@/lib/agentes/cronista-reportes";
import type { Json } from "@/types/supabase";
import type {
  AgentesDatabase,
  CronistaReporte,
  CronistaReporteTipo
} from "@/types/agentes";

export async function ejecutarReporteCronista(params: {
  supabase: SupabaseClient<AgentesDatabase>;
  tipo: CronistaReporteTipo;
  referenceDate?: Date;
}) {
  const { supabase, tipo } = params;
  const periodo = resolverPeriodoCronista(tipo, params.referenceDate);
  const { data: existente, error: existenteError } = await supabase
    .from("reportes_cronista")
    .select("*")
    .eq("tipo", tipo)
    .eq("periodo_inicio", periodo.inicio)
    .maybeSingle();
  if (existenteError) {
    throw new Error(existenteError.message);
  }
  if (existente?.estado === "completado") {
    return { reporte: existente as CronistaReporte, skipped: true, motivo: "reporte_completado" };
  }

  let reporte = existente as CronistaReporte | null;
  if (!reporte) {
    const { data, error } = await supabase
      .from("reportes_cronista")
      .insert({ tipo, periodo_inicio: periodo.inicio, periodo_fin: periodo.fin })
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "No se pudo registrar la ejecución del reporte.");
    }
    reporte = data as CronistaReporte;
  }

  let generado: Awaited<ReturnType<typeof generarContenidoReporte>> | null = null;
  let metricas: Awaited<ReturnType<typeof reunirMetricasReporte>> | null = null;
  let fuentes: Awaited<ReturnType<typeof reunirFuentesReporte>> | null = null;
  let markdown: string | null = null;
  let pdf: Buffer | null = null;
  let generationPersisted = false;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await supabase
      .from("reportes_cronista")
      .update({
        estado: "procesando",
        intentos: attempt,
        error_detalle: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", reporte.id);

    try {
      if (!generado || !metricas || !fuentes || !markdown || !pdf) {
        metricas = await reunirMetricasReporte(supabase, periodo);
        fuentes = await reunirFuentesReporte(supabase, tipo, periodo);
        generado = await generarContenidoReporte({ tipo, periodo, metricas, fuentes });
        markdown = construirReporteMarkdown({ tipo, periodo, metricas, fuentes, contenido: generado.contenido });
        pdf = await generarCronistaReportePdf({ tipo, periodo, metricas, contenido: generado.contenido });
      }

      if (!generationPersisted) {
        const { error: persistError } = await supabase
          .from("reportes_cronista")
          .update({
            metricas_duras: metricas as unknown as Json,
            fuentes: fuentes as unknown as Json,
            reporte_markdown: markdown,
            tokens_entrada: generado.usage.tokensEntrada,
            tokens_salida: generado.usage.tokensSalida,
            costo_estimado_usd: generado.usage.costoEstimadoUsd,
            updated_at: new Date().toISOString()
          })
          .eq("id", reporte.id);
        if (persistError) {
          throw new Error(persistError.message);
        }
        generationPersisted = true;
      }

      const resendId = await enviarReporteSocios({
        reporteId: reporte.id,
        tipo,
        periodo,
        contenido: generado.contenido,
        pdf
      });
      const now = new Date().toISOString();
      const { data: completed, error: completeError } = await supabase
        .from("reportes_cronista")
        .update({
          estado: "completado",
          error_detalle: null,
          resend_email_id: resendId,
          enviado_at: now,
          updated_at: now
        })
        .eq("id", reporte.id)
        .select("*")
        .single();
      if (completeError || !completed) {
        throw new Error(completeError?.message ?? "El email se envió, pero no se pudo cerrar la ejecución.");
      }
      return { reporte: completed as CronistaReporte, skipped: false, motivo: null };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Error inesperado al generar el reporte.");
      const { error: failureLogError } = await supabase
        .from("reportes_cronista")
        .update({
          estado: "fallido",
          intentos: attempt,
          error_detalle: lastError.message.slice(0, 2000),
          updated_at: new Date().toISOString()
        })
        .eq("id", reporte.id);
      if (failureLogError) {
        throw new Error(`${lastError.message} Además, no se pudo registrar el fallo: ${failureLogError.message}`);
      }
    }
  }

  throw lastError ?? new Error("El reporte falló después de dos intentos.");
}
