"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card, EmptyState } from "@/components/ui";
import { SparklesIcon } from "@/components/ui/icons";
import { chartTheme, formatCompactCurrencyTick } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { AgentesHubCostoHistoricoPoint, AgentesHubCostoHistoricoSerie } from "@/lib/agentes/hub";

type AiHubCostoChartProps = {
  data: AgentesHubCostoHistoricoPoint[];
  series: AgentesHubCostoHistoricoSerie[];
};

export function AiHubCostoChart({ data, series }: AiHubCostoChartProps) {
  const hasData = data.some((point) => point.total_usd > 0);

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Costo de IA por mes</h3>
          <p className="text-sm text-graphite">Distribución del gasto en los últimos 6 meses por agente.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">6 meses</span>
      </div>

      {!hasData || series.length === 0 ? (
        <EmptyState
          icon={SparklesIcon}
          titulo="Todavía no hay costo de IA en el período seleccionado"
          descripcion="El consumo de agentes se va a agrupar por mes cuando haya actividad."
        />
      ) : (
        <>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 20, bottom: 8, left: 8 }} barCategoryGap="28%">
                <CartesianGrid
                  stroke={chartTheme.grid.stroke}
                  strokeDasharray={chartTheme.grid.strokeDasharray}
                  vertical={chartTheme.grid.vertical}
                />
                <XAxis
                  dataKey="mes"
                  tick={chartTheme.axis.tick}
                  axisLine={chartTheme.axis.axisLine}
                  tickLine={chartTheme.axis.tickLine}
                />
                <YAxis
                  tick={chartTheme.axis.tick}
                  axisLine={chartTheme.axis.axisLine}
                  tickLine={chartTheme.axis.tickLine}
                  tickFormatter={formatCompactCurrencyTick}
                />
                <Tooltip
                  content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const point = payload[0]?.payload as AgentesHubCostoHistoricoPoint | undefined;
                    if (!point) {
                      return null;
                    }

                    return (
                      <div className={chartTheme.tooltip.className}>
                        <p className="mb-2 font-label text-carbon">{label}</p>
                        <div className="space-y-1.5">
                          {series.map((serie) => {
                            const amount = Number(point[serie.slug] ?? 0);
                            return (
                              <p key={serie.slug} className="text-xs" style={{ color: serie.color }}>
                                {serie.label}: {formatUSD(amount)}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                {series.map((serie) => (
                  <Bar
                    key={serie.slug}
                    dataKey={serie.slug}
                    name={serie.label}
                    fill={serie.color}
                    radius={chartTheme.bar.radius}
                    barSize={chartTheme.bar.barSize}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
            {series.map((serie) => (
              <span key={serie.slug} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: serie.color }} />
                {serie.label}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
