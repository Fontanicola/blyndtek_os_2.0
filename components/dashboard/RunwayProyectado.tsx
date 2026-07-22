"use client";

import {
  Area,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui";
import { chartTheme, formatCompactCurrencyTick, getChartActiveDot, getConservativeCurveType } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { DashboardRunwayPoint } from "@/types/dashboard";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

type RunwayProyectadoProps = {
  data: DashboardRunwayPoint[];
};

export function RunwayProyectado({ data }: RunwayProyectadoProps) {
  const curveType = getConservativeCurveType(data.map((point) => point.caja));

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Runway proyectado</h3>
          <p className="text-sm text-graphite">Proyección de caja usando el burn rate actual.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Caja</span>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 18, bottom: 8, left: 8 }}>
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
              tickMargin={chartTheme.axis.tickMargin}
            />
            <YAxis
              tick={chartTheme.axis.tick}
              axisLine={chartTheme.axis.axisLine}
              tickLine={chartTheme.axis.tickLine}
              tickMargin={chartTheme.axis.tickMargin}
              tickFormatter={formatCompactCurrencyTick}
            />
            <Tooltip
              content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                if (!active || !payload?.length) {
                  return null;
                }

                return (
                  <div className={chartTheme.tooltip.className}>
                    <p className={chartTheme.tooltip.titleClassName}>{label}</p>
                    <div className={chartTheme.tooltip.bodyClassName}>
                      <div className={chartTheme.tooltip.rowClassName}>
                        <span className={chartTheme.tooltip.labelClassName} style={{ color: chartTheme.colors.signal }}>
                          Caja
                        </span>
                        <span className={chartTheme.tooltip.valueClassName}>
                          {formatUSD(Number(payload[0]?.value ?? 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="caja"
              name="Caja"
              stroke={chartTheme.colors.signal}
              strokeWidth={chartTheme.area.strokeWidth}
              fill={chartTheme.colors.signal}
              fillOpacity={chartTheme.area.fillOpacity}
              dot={false}
              activeDot={getChartActiveDot(chartTheme.colors.signal)}
              type={curveType}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
