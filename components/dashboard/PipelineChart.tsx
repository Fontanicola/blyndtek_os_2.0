"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui";
import { chartTheme, formatCompactCurrencyTick } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { DashboardPipelineStage } from "@/types/dashboard";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

type PipelineChartProps = {
  data: DashboardPipelineStage[];
};

export function PipelineChart({ data }: PipelineChartProps) {
  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Pipeline ponderado</h3>
          <p className="text-sm text-graphite">Valor estimado por etapa con peso de cierre aplicado.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Comercial</span>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 18, bottom: 8, left: 8 }} barCategoryGap="30%">
            <CartesianGrid
              stroke={chartTheme.grid.stroke}
              strokeDasharray={chartTheme.grid.strokeDasharray}
              vertical={chartTheme.grid.vertical}
            />
            <XAxis
              dataKey="etapa"
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

                return (
                  <div className={chartTheme.tooltip.className}>
                    <p className="mb-1 font-label text-carbon">{label}</p>
                    <p className="text-xs text-signal">Valor ponderado: {formatUSD(Number(payload[0]?.value ?? 0))}</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="ponderado"
              name="Valor ponderado"
              fill={chartTheme.colors.signal}
              radius={chartTheme.bar.radius}
              barSize={chartTheme.bar.barSize}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
