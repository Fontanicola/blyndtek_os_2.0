"use client";

import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import {
  chartTheme,
  formatCompactCurrencyTick,
  getChartActiveDot,
  getChartDot,
  getChartGradientFill,
  getConservativeCurveType,
  renderChartGradient
} from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { ProductoHistoricoMRRPoint } from "@/types/productos";

type MRRChartProps = {
  data: ProductoHistoricoMRRPoint[];
  loading?: boolean;
};

function ChartSkeleton() {
  return (
    <Card padding="md" className="space-y-4">
      <div>
        <div className="h-4 w-40 rounded-pill bg-paper animate-pulse" />
        <div className="mt-2 h-3 w-64 rounded-pill bg-paper animate-pulse" />
      </div>
      <div className="h-[320px] rounded-card bg-paper animate-pulse" />
    </Card>
  );
}

export function MRRChart({ data, loading = false }: MRRChartProps) {
  const gradientId = useId();
  const hasData = data.some((point) => point.mrr > 0);
  const curveType = useMemo(() => getConservativeCurveType(data.map((point) => point.mrr)), [data]);

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        label: point.label
      })),
    [data]
  );

  if (loading && !data.length) {
    return <ChartSkeleton />;
  }

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">MRR mensual</h3>
          <p className="text-sm text-graphite">Evolución de ingresos recurrentes de los últimos seis meses.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Recurrencia</span>
      </div>

      {!hasData ? (
        <div className="rounded-card border border-line-soft bg-paper px-4 py-10 text-sm text-graphite">
          Sin datos suficientes para dibujar el histórico de MRR.
        </div>
      ) : (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
              <defs>{renderChartGradient(gradientId, "signal")}</defs>
              <CartesianGrid
                stroke={chartTheme.grid.stroke}
                strokeDasharray={chartTheme.grid.strokeDasharray}
                vertical={chartTheme.grid.vertical}
              />
              <XAxis
                dataKey="label"
                tick={chartTheme.axis.tick}
                axisLine={chartTheme.axis.axisLine}
                tickLine={chartTheme.axis.tickLine}
                interval="preserveStartEnd"
                tickMargin={chartTheme.axis.tickMargin}
              />
              <YAxis
                tick={chartTheme.axis.tick}
                axisLine={chartTheme.axis.axisLine}
                tickLine={chartTheme.axis.tickLine}
                tickMargin={chartTheme.axis.tickMargin}
                domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.1), 1)]}
                tickFormatter={formatCompactCurrencyTick}
              />
              <Tooltip
                content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const d = payload[0]?.payload as (typeof chartData)[number] | undefined;
                  if (!d) {
                    return null;
                  }

                  return (
                    <div className={chartTheme.tooltip.className}>
                      <p className={chartTheme.tooltip.titleClassName}>{label}</p>
                      <div className={chartTheme.tooltip.bodyClassName}>
                        <div className={chartTheme.tooltip.rowClassName}>
                          <span className={chartTheme.tooltip.labelClassName} style={{ color: chartTheme.colors.signal }}>
                            MRR
                          </span>
                          <span className={chartTheme.tooltip.valueClassName}>{formatUSD(d.mrr)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                dataKey="mrr"
                name="MRR"
                type={curveType}
                stroke={chartTheme.colors.signal}
                strokeWidth={chartTheme.area.strokeWidth}
                fill={getChartGradientFill(gradientId)}
                fillOpacity={chartTheme.area.fillOpacity}
                dot={getChartDot(chartTheme.colors.signal)}
                activeDot={getChartActiveDot(chartTheme.colors.signal)}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
