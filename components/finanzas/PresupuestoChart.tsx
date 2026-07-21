"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { chartTheme, formatCompactCurrencyTick } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";

type PresupuestoChartProps = {
  label: string;
  ingresos: number;
  egresos: number;
};

type PresupuestoChartPoint = {
  label: string;
  ingresos: number;
  egresos: number;
};

export function PresupuestoChart({ label, ingresos, egresos }: PresupuestoChartProps) {
  const data: PresupuestoChartPoint[] = [
    {
      label,
      ingresos,
      egresos
    }
  ];

  return (
    <Card padding="md" className="overflow-hidden">
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-title text-carbon">Resumen visual del mes</h3>
          <p className="text-sm text-graphite">Comparativo rápido entre ingresos y egresos planificados.</p>
        </div>

        <div className="w-full">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
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
              />
              <YAxis
                tick={chartTheme.axis.tick}
                axisLine={chartTheme.axis.axisLine}
                tickLine={chartTheme.axis.tickLine}
                tickFormatter={formatCompactCurrencyTick}
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15 || 1000)]}
              />
              <Tooltip
                cursor={{ fill: "rgba(31, 68, 255, 0.04)" }}
                content={({ active, payload }: TooltipContentProps<number, string>) => {
                  const point = payload?.[0]?.payload as PresupuestoChartPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className={chartTheme.tooltip.className}>
                      <p className="mb-2 font-label text-carbon">{point.label}</p>
                      <div className="space-y-1.5">
                        <p className="text-xs" style={{ color: chartTheme.colors.success }}>
                          Ingresos: {formatUSD(point.ingresos)}
                        </p>
                        <p className="text-xs" style={{ color: chartTheme.colors.danger }}>
                          Egresos: {formatUSD(point.egresos)}
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="ingresos"
                name="Ingresos"
                fill={chartTheme.colors.success}
                radius={chartTheme.bar.radius}
                barSize={chartTheme.bar.barSize}
              />
              <Bar
                dataKey="egresos"
                name="Egresos"
                fill={chartTheme.colors.danger}
                radius={chartTheme.bar.radius}
                barSize={chartTheme.bar.barSize}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
