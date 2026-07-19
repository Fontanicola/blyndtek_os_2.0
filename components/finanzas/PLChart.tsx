"use client";

import { useMemo } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { chartTheme, formatCompactCurrencyTick } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { MonthlyFinancialPoint } from "@/lib/finanzas";

type PLChartProps = {
  data: MonthlyFinancialPoint[];
};

export function PLChart({ data }: PLChartProps) {
  const averageMargin = useMemo(() => {
    const totalIngresos = data.reduce((total, point) => total + point.ingresos, 0);
    const totalEgresos = data.reduce((total, point) => total + point.egresos, 0);

    if (totalIngresos <= 0) {
      return null;
    }

    return ((totalIngresos - totalEgresos) / totalIngresos) * 100;
  }, [data]);

  return (
    <Card padding="md" className="overflow-hidden bg-white">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">P&amp;L mensual</h3>
            <p className="text-sm text-graphite">Ingresos vs egresos de los ultimos 12 meses.</p>
            <p className="mt-1 text-xs text-graphite">
              Margen promedio (12 meses): {averageMargin == null ? "Sin datos" : `${averageMargin.toFixed(1)}%`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Ingresos", color: chartTheme.colors.signal },
              { label: "Egresos", color: chartTheme.colors.danger },
              { label: "Margen", color: chartTheme.colors.success },
              { label: "Clientes", color: chartTheme.colors.graphite }
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-pill bg-paper px-3 py-1 text-xs font-label text-graphite"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full">
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={data} margin={{ top: 24, right: 28, left: 14, bottom: 14 }}>
              <CartesianGrid
                strokeDasharray={chartTheme.grid.strokeDasharray}
                stroke={chartTheme.grid.stroke}
                vertical={chartTheme.grid.vertical}
              />
              <XAxis
                dataKey="label"
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
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
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
                  const point = payload?.[0]?.payload as MonthlyFinancialPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className={chartTheme.tooltip.className}>
                      <p className="mb-2 font-label text-carbon">{label}</p>
                      <div className="space-y-1.5">
                        <p className="text-xs" style={{ color: chartTheme.colors.signal }}>
                          Ingresos: {formatUSD(point.ingresos)}
                        </p>
                        <p className="text-xs" style={{ color: chartTheme.colors.danger }}>
                          Egresos: {formatUSD(point.egresos)}
                        </p>
                        <p className="text-xs" style={{ color: chartTheme.colors.success }}>
                          Margen: {formatUSD(point.margen)}
                        </p>
                        <p className="text-xs" style={{ color: chartTheme.colors.graphite }}>
                          Clientes activos: {point.clientes_activos.toLocaleString("en-US")}
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                yAxisId="right"
                dataKey="clientes_activos"
                name="Clientes activos"
                fill={chartTheme.colors.muted}
                radius={chartTheme.bar.radius}
                barSize={10}
              />
              <Area
                yAxisId="left"
                dataKey="ingresos"
                name="Ingresos"
                stroke={chartTheme.colors.signal}
                strokeWidth={2.8}
                fill={chartTheme.colors.signal}
                fillOpacity={0.08}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: chartTheme.colors.signal, strokeWidth: 2.5 }}
                type="monotone"
              />
              <Area
                yAxisId="left"
                dataKey="margen"
                name="Margen"
                stroke={chartTheme.colors.success}
                strokeWidth={2.4}
                fill={chartTheme.colors.success}
                fillOpacity={0.06}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: chartTheme.colors.success, strokeWidth: 2.5 }}
                type="monotone"
              />
              <Area
                yAxisId="left"
                dataKey="egresos"
                name="Egresos"
                stroke={chartTheme.colors.danger}
                strokeWidth={2.4}
                fill={chartTheme.colors.danger}
                fillOpacity={0.05}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: chartTheme.colors.danger, strokeWidth: 2.5 }}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
