"use client";

import { useMemo } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { chartTheme, formatCompactCurrencyTick } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";

type VentasChartPoint = {
  mes: string;
  cantidad_ventas: number;
  monto_total_usd: number;
};

type VentasChartProps = {
  data: VentasChartPoint[];
};

export function VentasChart({ data }: VentasChartProps) {
  const hasData = useMemo(
    () => data.some((point) => point.cantidad_ventas > 0 || point.monto_total_usd > 0),
    [data]
  );

  return (
    <Card padding="md" className="overflow-hidden bg-white">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">Ventas del comercial</h3>
            <p className="text-sm text-graphite">Evolución de cierres y monto total de los últimos 6 meses.</p>
          </div>
          <div className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">6 meses</div>
        </div>

        {!hasData ? (
          <div className="rounded-card border border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
            Todavía no cerraste ninguna venta
          </div>
        ) : (
          <div className="w-full">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={data} margin={{ top: 20, right: 24, left: 12, bottom: 12 }}>
                <CartesianGrid
                  strokeDasharray={chartTheme.grid.strokeDasharray}
                  stroke={chartTheme.grid.stroke}
                  vertical={chartTheme.grid.vertical}
                />
                <XAxis
                  dataKey="mes"
                  tick={chartTheme.axis.tick}
                  axisLine={chartTheme.axis.axisLine}
                  tickLine={chartTheme.axis.tickLine}
                  interval={0}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={formatCompactCurrencyTick}
                  tick={chartTheme.axis.tick}
                  axisLine={chartTheme.axis.axisLine}
                  tickLine={chartTheme.axis.tickLine}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tick={chartTheme.axis.tick}
                  axisLine={chartTheme.axis.axisLine}
                  tickLine={chartTheme.axis.tickLine}
                  domain={[0, (dataMax: number) => Math.max(dataMax * 2.5, 5)]}
                />
                <Tooltip
                  content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const point = payload[0]?.payload as VentasChartPoint | undefined;
                    if (!point) {
                      return null;
                    }

                    return (
                      <div className={chartTheme.tooltip.className}>
                        <p className="mb-2 font-label text-carbon">{label}</p>
                        <p className="text-xs text-signal">Monto: {formatUSD(point.monto_total_usd)}</p>
                        <p className="text-xs text-graphite">Ventas: {point.cantidad_ventas}</p>
                      </div>
                    );
                  }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="cantidad_ventas"
                  name="Ventas"
                  fill={chartTheme.colors.muted}
                  radius={chartTheme.bar.radius}
                  barSize={12}
                />
                <Area
                  yAxisId="left"
                  dataKey="monto_total_usd"
                  name="Monto"
                  stroke={chartTheme.colors.signal}
                  strokeWidth={2.8}
                  fill={chartTheme.colors.signal}
                  fillOpacity={0.08}
                  dot={false}
                  activeDot={{ r: 4, fill: "#FFFFFF", stroke: chartTheme.colors.signal, strokeWidth: 2.5 }}
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
