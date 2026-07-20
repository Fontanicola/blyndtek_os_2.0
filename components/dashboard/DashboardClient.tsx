"use client";

import { useMemo, type ReactNode } from "react";
import { Card, EmptyState } from "@/components/ui";
import { InboxIcon } from "@/components/ui/icons";
import { MetricaCard, PLChart } from "@/components/finanzas";
import { VentasVsCobradoChart } from "./VentasVsCobradoChart";
import {
  BellIcon,
  CalendarioIcon,
  DashboardIcon,
  FinanzasIcon,
  OutboundIcon,
  ProyectosIcon,
  TareasIcon
} from "@/components/icons";
import { formatUSD } from "@/lib/utils/formatters";
import type { DashboardPeriod } from "@/types/dashboard";
import type { BadgeVariant } from "@/types/ui";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { CapacidadEntrega } from "./CapacidadEntrega";
import { DashboardSeccion } from "./DashboardSeccion";
import { EmbudoLeads } from "./EmbudoLeads";
import { FeaturesRecientes } from "./FeaturesRecientes";
import { WinRateChart } from "./WinRateChart";

type DashboardMetricCard = {
  label: string;
  value: string | number;
  icono?: ReactNode;
  colorIcono?: "signal" | "success" | "danger" | "warning" | "graphite";
  trend?: string | null;
  direction?: "up" | "down";
  status?: {
    label: string;
    variant: BadgeVariant;
  };
};

function formatSignedPercentChange(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || previous === 0) {
    return null;
  }

  const diff = ((current - previous) / Math.abs(previous)) * 100;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff.toFixed(1)}%`;
}

function formatSignedCountChange(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null) {
    return null;
  }

  const diff = current - previous;
  if (diff === 0) {
    return null;
  }

  const sign = diff > 0 ? "+" : "";
  return `${sign}${Math.round(diff)}`;
}

function formatRunwayCard(
  runway: {
    runway_estado: "normal" | "estable" | "agotado";
    runway_meses: number | null;
    quema_neta: number;
  }
) {
  if (runway.runway_estado === "estable") {
    return {
      value: "Estable",
      status: {
        label: runway.quema_neta < 0 ? `Generás ${formatUSD(Math.abs(runway.quema_neta))}/mes` : "Sin quema neta",
        variant: "success" as const
      }
    };
  }

  if (runway.runway_estado === "agotado") {
    return {
      value: "Agotado",
      status: {
        label: "Caja agotada",
        variant: "danger" as const
      }
    };
  }

  return {
    value: runway.runway_meses == null ? "Sin datos" : `${runway.runway_meses.toFixed(1)} meses`,
    status: {
      label: `Quema ${formatUSD(Math.abs(runway.quema_neta))}/mes`,
      variant: "warning" as const
    }
  };
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <div className="h-11 w-64 rounded-pill bg-paper animate-pulse" />
      </div>

      <section className="space-y-4">
        <div className="h-6 w-40 rounded-pill bg-paper animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} padding="lg" className="animate-pulse space-y-4">
              <div className="h-3 w-28 rounded-pill bg-paper" />
              <div className="h-9 w-36 rounded-card bg-paper" />
              <div className="h-2 w-24 rounded-pill bg-paper" />
            </Card>
          ))}
        </div>
        <Card padding="lg" className="h-[440px] animate-pulse bg-white">
          <div className="h-4 w-48 rounded-pill bg-paper" />
          <div className="mt-6 h-[360px] rounded-card bg-paper" />
        </Card>
      </section>

      <section className="space-y-4">
        <div className="h-6 w-40 rounded-pill bg-paper animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} padding="lg" className="animate-pulse space-y-4">
              <div className="h-3 w-28 rounded-pill bg-paper" />
              <div className="h-9 w-32 rounded-card bg-paper" />
              <div className="h-2 w-20 rounded-pill bg-paper" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card padding="lg" className="h-[360px] animate-pulse bg-white">
            <div className="h-4 w-44 rounded-pill bg-paper" />
            <div className="mt-6 h-[280px] rounded-card bg-paper" />
          </Card>
          <Card padding="lg" className="h-[360px] animate-pulse bg-white">
            <div className="h-4 w-44 rounded-pill bg-paper" />
            <div className="mt-6 h-[280px] rounded-card bg-paper" />
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="h-6 w-40 rounded-pill bg-paper animate-pulse" />
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} padding="lg" className="animate-pulse space-y-4">
              <div className="h-3 w-28 rounded-pill bg-paper" />
              <div className="h-9 w-32 rounded-card bg-paper" />
              <div className="h-2 w-20 rounded-pill bg-paper" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card padding="lg" className="h-[280px] animate-pulse bg-white">
            <div className="h-4 w-44 rounded-pill bg-paper" />
            <div className="mt-6 h-[200px] rounded-card bg-paper" />
          </Card>
          <Card padding="lg" className="h-[280px] animate-pulse bg-white">
            <div className="h-4 w-44 rounded-pill bg-paper" />
            <div className="mt-6 h-[200px] rounded-card bg-paper" />
          </Card>
        </div>
      </section>
    </div>
  );
}

export function DashboardClient() {
  const period: DashboardPeriod = "month";
  const { dashboard, loading, error } = useDashboard(period);

  const financialCards = useMemo<DashboardMetricCard[]>(() => {
    if (!dashboard) {
      return [];
    }

    const fin = dashboard.financiero;
    const runway = formatRunwayCard(fin);

    return [
      {
        label: "MRR actual",
        value: fin.mrr_actual,
        icono: <FinanzasIcon />,
        colorIcono: "signal",
        trend: formatSignedPercentChange(fin.mrr_actual, fin.mrr_anterior),
        direction:
          fin.mrr_anterior == null || fin.mrr_actual === fin.mrr_anterior
            ? undefined
            : fin.mrr_actual > fin.mrr_anterior
              ? "up"
              : "down"
      },
      {
        label: "Runway",
        value: runway.value,
        icono: <DashboardIcon />,
        colorIcono:
          fin.runway_estado === "estable" ? "success" : fin.runway_estado === "agotado" ? "danger" : "warning",
        status: runway.status
      },
      {
        label: "Cobros pendientes",
        value: fin.cobros_pendientes,
        icono: <FinanzasIcon />,
        colorIcono: "warning"
      },
      {
        label: "Cobros vencidos",
        value: fin.cobros_vencidos,
        icono: <BellIcon />,
        colorIcono: "danger"
      },
      {
        label: "P&L del mes",
        value: fin.pl_mes_actual,
        icono: <FinanzasIcon />,
        colorIcono: "signal",
        trend: formatSignedPercentChange(fin.pl_mes_actual, fin.pl_mes_anterior),
        direction:
          fin.pl_mes_anterior == null || fin.pl_mes_actual === fin.pl_mes_anterior
            ? undefined
            : fin.pl_mes_actual > fin.pl_mes_anterior
              ? "up"
              : "down"
      },
      {
        label: "Vendido (6 meses)",
        value: formatUSD(fin.total_vendido_6m),
        icono: <FinanzasIcon />,
        colorIcono: "success"
      }
    ];
  }, [dashboard]);

  const commercialCards = useMemo<DashboardMetricCard[]>(() => {
    if (!dashboard) {
      return [];
    }

    const comercial = dashboard.comercial;

    return [
      {
        label: "Pipeline ponderado",
        value: formatUSD(comercial.pipeline_ponderado),
        icono: <OutboundIcon />,
        colorIcono: "signal",
        trend: formatSignedPercentChange(comercial.pipeline_ponderado, comercial.pipeline_ponderado_anterior),
        direction:
          comercial.pipeline_ponderado_anterior == null || comercial.pipeline_ponderado === comercial.pipeline_ponderado_anterior
            ? undefined
            : comercial.pipeline_ponderado > comercial.pipeline_ponderado_anterior
              ? "up"
              : "down"
      },
      {
        label: "Ticket promedio",
        value: comercial.ticket_promedio == null ? "Sin datos suficientes" : formatUSD(comercial.ticket_promedio),
        icono: <FinanzasIcon />,
        colorIcono: "success",
        trend: formatSignedPercentChange(comercial.ticket_promedio, comercial.ticket_promedio_anterior),
        direction:
          comercial.ticket_promedio == null ||
          comercial.ticket_promedio_anterior == null ||
          comercial.ticket_promedio === comercial.ticket_promedio_anterior
            ? undefined
            : comercial.ticket_promedio > comercial.ticket_promedio_anterior
              ? "up"
              : "down"
      },
      {
        label: "Ciclo de cierre",
        value: comercial.ciclo_cierre_promedio == null ? "Sin datos suficientes" : `${comercial.ciclo_cierre_promedio.toFixed(1)} días`,
        icono: <CalendarioIcon />,
        colorIcono: "warning",
        trend:
          comercial.ciclo_cierre_promedio == null || comercial.ciclo_cierre_promedio_anterior == null
            ? null
            : `${comercial.ciclo_cierre_promedio > comercial.ciclo_cierre_promedio_anterior ? "+" : "-"}${Math.abs(
                comercial.ciclo_cierre_promedio - comercial.ciclo_cierre_promedio_anterior
              ).toFixed(1)} días vs período anterior`
      }
    ];
  }, [dashboard]);

  const deliveryCards = useMemo<DashboardMetricCard[]>(() => {
    if (!dashboard) {
      return [];
    }

    const entrega = dashboard.entrega;
    const ratio = entrega.capacidad_maxima > 0 ? (entrega.proyectos_activos / entrega.capacidad_maxima) * 100 : 0;

    return [
      {
        label: "Proyectos activos",
        value: `${entrega.proyectos_activos} de ${entrega.capacidad_maxima}`,
        icono: <ProyectosIcon />,
        colorIcono: "signal",
        status: {
          label: ratio > 100 ? "Sobrecargado" : ratio >= 85 ? "Casi al límite" : "Margen sano",
          variant: ratio > 100 ? ("danger" as const) : ratio >= 85 ? ("warning" as const) : ("success" as const)
        }
      },
      {
        label: "Entregados a tiempo",
        value:
          entrega.pct_entregados_a_tiempo == null
            ? "Sin datos suficientes"
            : `${entrega.pct_entregados_a_tiempo.toFixed(1)}%`,
        icono: <TareasIcon />,
        colorIcono: "success"
      },
      {
        label: "Desvío promedio",
        value: entrega.desvio_promedio_dias == null ? "Sin datos suficientes" : `${entrega.desvio_promedio_dias.toFixed(1)} días`,
        icono: <CalendarioIcon />,
        colorIcono: "danger"
      }
    ];
  }, [dashboard]);

  return (
    <div className="space-y-10 pb-24">
      {loading ? <DashboardSkeleton /> : null}

      {error ? (
        <Card padding="md" className="border border-danger/20 bg-danger-light">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {dashboard ? (
        <div className="space-y-10">
          <section>
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {financialCards.map((metric) => (
                  <MetricaCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    icono={metric.icono}
                    colorIcono={metric.colorIcono}
                    trend={metric.trend ?? undefined}
                    direction={metric.direction}
                    status={metric.status}
                  />
                ))}
              </div>

              <PLChart data={dashboard.financiero.historico_pl} />
              <VentasVsCobradoChart data={dashboard.financiero.historico_ventas_vs_cobrado} />
            </div>
          </section>

          <DashboardSeccion
            title="Comercial"
            description="Pipeline, conversión y velocidad de cierre en una sola vista."
          >
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                {commercialCards.map((metric) => (
                  <MetricaCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    icono={metric.icono}
                    colorIcono={metric.colorIcono}
                    trend={metric.trend ?? undefined}
                    direction={metric.direction}
                  />
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <EmbudoLeads data={dashboard.comercial.leads_por_etapa} />
                <WinRateChart
                  outbound={dashboard.comercial.win_rate_por_canal.outbound}
                  inbound={dashboard.comercial.win_rate_por_canal.inbound}
                />
              </div>
            </div>
          </DashboardSeccion>

          <DashboardSeccion
            title="Entrega"
            description="Capacidad del equipo, cumplimiento y ritmo real de desarrollo."
          >
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                {deliveryCards.map((metric) => (
                  <MetricaCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    icono={metric.icono}
                    colorIcono={metric.colorIcono}
                    status={metric.status}
                  />
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <CapacidadEntrega
                  activos={dashboard.entrega.proyectos_activos}
                  capacidadMaxima={dashboard.entrega.capacidad_maxima}
                />

                <div className="space-y-4">
                  <MetricaCard
                    label="Features completadas esta semana"
                    value={`${dashboard.entrega.features_completadas_semana}`}
                    icono={<TareasIcon />}
                    colorIcono="success"
                    trend={formatSignedCountChange(
                      dashboard.entrega.features_completadas_semana,
                      dashboard.entrega.features_completadas_semana_anterior
                    ) ?? undefined}
                    direction={
                      dashboard.entrega.features_completadas_semana_anterior == null ||
                      dashboard.entrega.features_completadas_semana === dashboard.entrega.features_completadas_semana_anterior
                        ? undefined
                        : dashboard.entrega.features_completadas_semana > dashboard.entrega.features_completadas_semana_anterior
                          ? "up"
                          : "down"
                    }
                  />

                  <FeaturesRecientes data={dashboard.entrega.features_recientes} />
                </div>
              </div>
            </div>
          </DashboardSeccion>
        </div>
      ) : null}

      {!loading && !error && !dashboard ? (
        <Card padding="lg">
          <EmptyState
            icon={InboxIcon}
            titulo="No hay métricas disponibles todavía"
            descripcion="Cuando haya actividad comercial, financiera o de entrega, el dashboard va a mostrarla acá."
            className="border-0 bg-transparent"
          />
        </Card>
      ) : null}
    </div>
  );
}
