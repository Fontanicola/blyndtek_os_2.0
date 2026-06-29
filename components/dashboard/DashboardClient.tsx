"use client";

import { useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { MetricaCard } from "@/components/finanzas";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { DashboardPeriod } from "@/types/dashboard";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { CapacidadEntrega } from "./CapacidadEntrega";
import { DashboardSeccion } from "./DashboardSeccion";
import { MetricaGrande } from "./MetricaGrande";
import { PipelineChart } from "./PipelineChart";
import { RunwayProyectado } from "./RunwayProyectado";
import { WinRateChart } from "./WinRateChart";

const periodOptions: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "Último trimestre" },
  { value: "year", label: "Este año" }
];

function compareLabel(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null) {
    return null;
  }

  const diff = current - previous;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}`;
}

function percentCompare(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || previous === 0) {
    return null;
  }

  const diff = ((current - previous) / previous) * 100;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}%`;
}

type MetricCardData = {
  label: string;
  value: string;
  comparison?: string | null;
};

export function DashboardClient() {
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const { dashboard, loading, error } = useDashboard(period);

  const financialMetrics: MetricCardData[] = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        label: "Cobros pendientes",
        value: formatUSD(dashboard.financiero.cobros_pendientes)
      },
      {
        label: "Cobros vencidos",
        value: formatUSD(dashboard.financiero.cobros_vencidos)
      },
      {
        label: "P&L actual",
        value: formatUSD(dashboard.financiero.pl_mes_actual),
        comparison: compareLabel(dashboard.financiero.pl_mes_actual, dashboard.financiero.pl_mes_anterior)
      }
    ];
  }, [dashboard]);

  const deliveryMetrics: MetricCardData[] = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        label: "Entregadas a tiempo",
        value:
          dashboard.entrega.pct_entregados_a_tiempo == null
            ? "Sin datos"
            : `${dashboard.entrega.pct_entregados_a_tiempo.toFixed(1)}%`,
        comparison: compareLabel(
          dashboard.entrega.features_completadas_semana,
          dashboard.entrega.features_completadas_semana_anterior
        )
      },
      {
        label: "Desvío promedio",
        value:
          dashboard.entrega.desvio_promedio_dias == null
            ? "Sin datos"
            : `${dashboard.entrega.desvio_promedio_dias.toFixed(1)} días`
      },
      {
        label: "Features esta semana",
        value: `${dashboard.entrega.features_completadas_semana}`
      }
    ];
  }, [dashboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-title text-carbon">Dashboard</h1>
          <p className="mt-1 text-sm text-graphite">Métricas inteligentes de Comercial, Finanzas y Entrega.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-pill bg-white p-1 shadow-soft">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={
                  period === option.value
                    ? "rounded-pill bg-signal px-4 py-2 text-sm font-label text-white"
                    : "rounded-pill px-4 py-2 text-sm font-label text-graphite transition-colors duration-fast ease-fast hover:text-carbon"
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <Badge variant="default">
            Actualizado {dashboard ? formatFecha(dashboard.updated_at) : "recientemente"}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_value, index) => (
              <Card key={index} padding="lg" className="animate-pulse space-y-4">
                <div className="h-3 w-24 rounded-pill bg-paper" />
                <div className="h-10 w-32 rounded-card bg-paper" />
                <div className="h-2 w-full rounded-pill bg-paper" />
              </Card>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 2 }, (_value, index) => (
              <Card key={index} padding="lg" className="h-[360px] animate-pulse bg-white">
                <div className="h-4 w-40 rounded-pill bg-paper" />
                <div className="mt-6 h-[280px] rounded-card bg-paper" />
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <Card padding="md" className="border border-danger/20 bg-danger-light">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {dashboard ? (
        <div className="space-y-8">
          <DashboardSeccion title="Comercial" description="Pipeline, conversión y velocidad de cierre.">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <MetricaGrande
                label="Pipeline ponderado"
                value={formatUSD(dashboard.comercial.pipeline_ponderado)}
                comparison={percentCompare(
                  dashboard.comercial.pipeline_ponderado,
                  dashboard.comercial.pipeline_ponderado_anterior
                )}
                trend={
                  dashboard.comercial.pipeline_ponderado > dashboard.comercial.pipeline_ponderado_anterior
                    ? "up"
                    : dashboard.comercial.pipeline_ponderado < dashboard.comercial.pipeline_ponderado_anterior
                      ? "down"
                      : "neutral"
                }
                emptyState="Sin pipeline"
              />

              <PipelineChart data={dashboard.comercial.pipeline_por_etapa} />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <WinRateChart
                outbound={dashboard.comercial.win_rate_por_canal.outbound}
                inbound={dashboard.comercial.win_rate_por_canal.inbound}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <MetricaCard
                  label="Ticket promedio"
                  value={formatUSD(dashboard.comercial.ticket_promedio ?? 0)}
                />
                <MetricaCard
                  label="Ciclo de cierre"
                  value={
                    dashboard.comercial.ciclo_cierre_promedio == null
                      ? "Sin datos"
                      : `${dashboard.comercial.ciclo_cierre_promedio.toFixed(1)} días`
                  }
                />
              </div>
            </div>
          </DashboardSeccion>

          <DashboardSeccion title="Financiero" description="Caja, MRR y tendencia de ingresos.">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <MetricaGrande
                  label="MRR actual"
                  value={formatUSD(dashboard.financiero.mrr_actual)}
                  comparison={percentCompare(dashboard.financiero.mrr_actual, dashboard.financiero.mrr_anterior)}
                  trend={
                    dashboard.financiero.mrr_actual > dashboard.financiero.mrr_anterior
                      ? "up"
                      : dashboard.financiero.mrr_actual < dashboard.financiero.mrr_anterior
                        ? "down"
                        : "neutral"
                  }
                />
                <MetricaGrande
                  label="Runway"
                  value={
                    dashboard.financiero.runway_meses == null
                      ? "N/A"
                      : `${dashboard.financiero.runway_meses.toFixed(1)} meses`
                  }
                  comparison={dashboard.financiero.churn > 0 ? `Churn ${formatUSD(dashboard.financiero.churn)}` : null}
                  trend="neutral"
                />
              </div>

              <RunwayProyectado data={dashboard.financiero.runway_serie} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {financialMetrics.map((metric) => (
                <MetricaCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  trend={metric.comparison ?? undefined}
                />
              ))}
            </div>
          </DashboardSeccion>

          <DashboardSeccion title="Entrega" description="Capacidad, puntualidad y ritmo de desarrollo.">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <CapacidadEntrega
                activos={dashboard.entrega.proyectos_activos}
                capacidadMaxima={dashboard.entrega.capacidad_maxima}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <MetricaGrande
                  label="Entregados a tiempo"
                  value={
                    dashboard.entrega.pct_entregados_a_tiempo == null
                      ? "Sin datos"
                      : `${dashboard.entrega.pct_entregados_a_tiempo.toFixed(1)}%`
                  }
                  comparison={
                    dashboard.entrega.desvio_promedio_dias == null
                      ? null
                      : `${dashboard.entrega.desvio_promedio_dias.toFixed(1)} días de desvío`
                  }
                />
                <MetricaGrande
                  label="Features de la semana"
                  value={`${dashboard.entrega.features_completadas_semana}`}
                  comparison={
                    dashboard.entrega.features_completadas_semana_anterior
                      ? compareLabel(
                          dashboard.entrega.features_completadas_semana,
                          dashboard.entrega.features_completadas_semana_anterior
                        )
                      : null
                  }
                  trend="neutral"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {deliveryMetrics.map((metric) => (
                <MetricaCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  trend={metric.comparison ?? undefined}
                />
              ))}
            </div>
          </DashboardSeccion>
        </div>
      ) : null}

      {!loading && !error && !dashboard ? (
        <Card padding="lg">
          <p className="text-sm text-graphite">No hay métricas disponibles todavía.</p>
        </Card>
      ) : null}
    </div>
  );
}
