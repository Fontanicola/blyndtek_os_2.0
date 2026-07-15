"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { DashboardIcon, FinanzasIcon } from "@/components/icons";
import { formatUSD } from "@/lib/utils/formatters";
import { MetricaCard } from "./MetricaCard";
import type { AgenteAnalisis } from "@/types/agentes";

type AsesorFinancieroTabProps = {
  analisisReciente: AgenteAnalisis | null;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;
};

type AnalisisDatos = {
  caja_inicial?: number;
  config?: {
    runway_objetivo_meses?: number;
    resumen_automatico_activo?: boolean;
    frecuencia_resumen?: string;
  };
  metricas?: {
    margen_mensual_usd?: number;
    runway_actual_meses?: number | null;
    runway_objetivo_meses?: number;
    excedente_disponible_usd?: number;
    proyectos_activos?: number;
    capacidad_maxima?: number;
    capacidad_disponible_pct?: number;
    pipeline_ponderado_usd?: number;
    concentracion_riesgo?: {
      cliente_id: string;
      cliente_nombre: string;
      porcentaje: number;
    } | null;
    meta_ads_disponible?: boolean;
    caja_actual_usd?: number;
    quema_mensual_usd?: number;
    mrr_actual_usd?: number;
    costo_mensual_usd?: number;
  };
};

function isCurrentMonth(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function formatMonthAndTime(dateString: string) {
  return new Date(dateString).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function paragraphs(text: string) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function AsesorFinancieroTab({ analisisReciente, showToast }: AsesorFinancieroTabProps) {
  const [analysis, setAnalysis] = useState<AgenteAnalisis | null>(
    analisisReciente && isCurrentMonth(analisisReciente.created_at) ? analisisReciente : null
  );
  const [loading, setLoading] = useState(false);

  const datos = useMemo<AnalisisDatos>(() => (analysis?.datos_calculados as AnalisisDatos) ?? {}, [analysis?.datos_calculados]);
  const metricas = datos.metricas ?? {};

  async function handleAnalizarAhora() {
    setLoading(true);
    try {
      const response = await fetch("/api/agentes/asesor-financiero/analizar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const payload = (await response.json()) as { data?: { analisis?: AgenteAnalisis }; error?: string };

      if (!response.ok || !payload.data?.analisis) {
        throw new Error(payload.error ?? "No se pudo generar el análisis.");
      }

      setAnalysis(payload.data.analisis);
      showToast("Análisis generado correctamente.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo generar el análisis.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!analysis) {
    return (
      <div className="flex flex-col gap-6">
        <Card padding="lg" className="space-y-4">
          <div className="space-y-2">
            <h2 className="font-title text-2xl text-carbon">Asesor Financiero</h2>
            <p className="max-w-2xl text-sm leading-6 text-graphite">
              El análisis combina métricas reales del negocio con una síntesis clara para revisar opciones, riesgos y
              caminos posibles sin inventar números.
            </p>
          </div>

          <div className="rounded-card border border-dashed border-line bg-paper/40 p-6 text-sm text-graphite">
            Todavía no hay un análisis de este mes. Generá el primero para ver opciones concretas sobre el excedente,
            el runway y la capacidad disponible.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => void handleAnalizarAhora()} loading={loading}>
              Analizar ahora
            </Button>
            <Link href="/agentes" className="text-sm text-graphite transition-colors duration-fast ease-fast hover:text-carbon">
              Ver historial completo
            </Link>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricaCard label="Margen mensual" value="—" icono={<FinanzasIcon />} colorIcono="signal" />
          <MetricaCard label="Runway actual" value="—" icono={<DashboardIcon />} colorIcono="warning" />
          <MetricaCard label="Capacidad disponible" value="—" icono={<DashboardIcon />} colorIcono="graphite" />
        </div>
      </div>
    );
  }

  const runwayActual = metricas.runway_actual_meses;
  const runwayObjetivo = metricas.runway_objetivo_meses ?? datos.config?.runway_objetivo_meses ?? 0;
  const capacidadDisponible = metricas.capacidad_disponible_pct ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-title text-2xl text-carbon">Asesor Financiero</h2>
            <p className="max-w-2xl text-sm leading-6 text-graphite">
              Análisis basado en métricas reales del negocio. El texto explica opciones posibles con su impacto
              numérico, sin reemplazar el criterio humano.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={analysis.tipo === "automatico" ? "signal" : "default"}>
              {analysis.tipo === "automatico" ? "Automático" : "Bajo demanda"}
            </Badge>
            <Badge variant="ghost">{formatMonthAndTime(analysis.created_at)}</Badge>
          </div>
        </div>

        <div className="space-y-4 rounded-card border border-line bg-paper/40 p-5">
          {paragraphs(analysis.analisis_texto).map((paragraph) => (
            <p key={paragraph} className="text-sm leading-7 text-carbon">
              {paragraph}
            </p>
          ))}
        </div>

        {metricas.concentracion_riesgo ? (
          <div className="rounded-card border border-warning/20 bg-warning-light p-4 text-sm text-warning">
            Atención: {metricas.concentracion_riesgo.cliente_nombre} concentra el{" "}
            {metricas.concentracion_riesgo.porcentaje.toFixed(1)}% del MRR activo.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" loading={loading} onClick={() => void handleAnalizarAhora()}>
            Analizar ahora
          </Button>
          <Link href="/agentes" className="text-sm text-graphite transition-colors duration-fast ease-fast hover:text-carbon">
            Ver historial completo
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricaCard
          label="Margen mensual"
          value={formatUSD(metricas.margen_mensual_usd ?? 0)}
          icono={<FinanzasIcon />}
          colorIcono={metricas.margen_mensual_usd != null && metricas.margen_mensual_usd >= 0 ? "success" : "danger"}
        />
        <MetricaCard
          label="Runway actual"
          value={runwayActual == null ? "N/D" : `${runwayActual.toFixed(1)} meses`}
          icono={<DashboardIcon />}
          colorIcono={runwayActual != null && runwayActual > runwayObjetivo ? "success" : "warning"}
          description={runwayObjetivo ? `Objetivo: ${runwayObjetivo.toFixed(0)} meses` : undefined}
        />
        <MetricaCard
          label="Capacidad disponible"
          value={`${capacidadDisponible.toFixed(0)}%`}
          icono={<DashboardIcon />}
          colorIcono={capacidadDisponible < 20 ? "warning" : "signal"}
          description={`Proyectos activos: ${metricas.proyectos_activos ?? 0} / ${metricas.capacidad_maxima ?? 0}`}
        />
        <MetricaCard
          label="Excedente disponible"
          value={formatUSD(metricas.excedente_disponible_usd ?? 0)}
          icono={<FinanzasIcon />}
          colorIcono={metricas.excedente_disponible_usd && metricas.excedente_disponible_usd > 0 ? "signal" : "graphite"}
        />
      </div>

      <Card padding="lg" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-title text-xl text-carbon">Resumen numérico</h3>
            <p className="text-sm text-graphite">Referencia rápida de los números que usa el análisis.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-component bg-paper px-4 py-3">
            <p className="text-xs font-label uppercase tracking-wide text-graphite">Caja actual</p>
            <p className="mt-1 text-lg font-title text-carbon">{formatUSD(metricas.caja_actual_usd ?? 0)}</p>
            <p className="mt-1 text-sm text-graphite">Quema mensual: {formatUSD(metricas.quema_mensual_usd ?? 0)}</p>
          </div>
          <div className="rounded-component bg-paper px-4 py-3">
            <p className="text-xs font-label uppercase tracking-wide text-graphite">MRR actual</p>
            <p className="mt-1 text-lg font-title text-carbon">{formatUSD(metricas.mrr_actual_usd ?? 0)}</p>
            <p className="mt-1 text-sm text-graphite">Costo mensual: {formatUSD(metricas.costo_mensual_usd ?? 0)}</p>
          </div>
          <div className="rounded-component bg-paper px-4 py-3">
            <p className="text-xs font-label uppercase tracking-wide text-graphite">Pipeline ponderado</p>
            <p className="mt-1 text-lg font-title text-carbon">{formatUSD(metricas.pipeline_ponderado_usd ?? 0)}</p>
            <p className="mt-1 text-sm text-graphite">
              Meta Ads: {metricas.meta_ads_disponible ? "Disponible" : "No conectada"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
