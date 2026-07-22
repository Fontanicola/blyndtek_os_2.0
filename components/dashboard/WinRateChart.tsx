"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, EmptyState } from "@/components/ui";
import { TrendingUpIcon } from "@/components/ui/icons";
import { chartTheme } from "@/lib/charts/chartTheme";
import type { DashboardWinRateChannel } from "@/types/dashboard";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

type WinRateChartProps = {
  outbound: DashboardWinRateChannel;
  inbound: DashboardWinRateChannel;
};

function formatPercent(value: number | string) {
  return `${Number(value).toFixed(1)}%`;
}

export function WinRateChart({ outbound, inbound }: WinRateChartProps) {
  const data = useMemo(
    () => [
      {
        canal: "Outbound",
        porcentaje: outbound.porcentaje ?? 0,
        leads: outbound.leads,
        clientes: outbound.clientes
      },
      {
        canal: "Inbound",
        porcentaje: inbound.porcentaje ?? 0,
        leads: inbound.leads,
        clientes: inbound.clientes
      }
    ],
    [inbound, outbound]
  );

  const hasData = data.some((item) => item.leads > 0);

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Win rate por canal</h3>
          <p className="text-sm text-graphite">Conversión de leads a cliente por origen.</p>
        </div>
        <span className="rounded-pill bg-success-light px-3 py-1 text-xs font-label text-success">Conversión</span>
      </div>

      {!hasData ? (
        <EmptyState
          icon={TrendingUpIcon}
          titulo="Sin datos suficientes para calcular conversión"
          descripcion="El win rate por canal se activa cuando haya leads convertidos."
        />
      ) : (
        <>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 12, right: 20, bottom: 8, left: 0 }} barCategoryGap="32%">
                <CartesianGrid
                  stroke={chartTheme.grid.stroke}
                  strokeDasharray={chartTheme.grid.strokeDasharray}
                  vertical={chartTheme.grid.vertical}
                />
                <XAxis
                  dataKey="canal"
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
                  domain={[0, 100]}
                  tickFormatter={formatPercent}
                />
                <Tooltip
                  content={({ active, payload }: TooltipContentProps<number, string>) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const d = payload[0]?.payload as (typeof data)[number] | undefined;
                    if (!d) {
                      return null;
                    }

                    return (
                      <div className={chartTheme.tooltip.className}>
                        <p className={chartTheme.tooltip.titleClassName}>{d.canal}</p>
                        <div className={chartTheme.tooltip.bodyClassName}>
                          <div className={chartTheme.tooltip.rowClassName}>
                            <span className={chartTheme.tooltip.labelClassName} style={{ color: chartTheme.colors.signal }}>
                              Conversión
                            </span>
                            <span className={chartTheme.tooltip.valueClassName}>{formatPercent(d.porcentaje)}</span>
                          </div>
                          <p className={chartTheme.tooltip.metaClassName}>
                            {d.clientes} clientes de {d.leads} leads
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="porcentaje"
                  name="Conversión"
                  radius={chartTheme.bar.radius}
                  barSize={chartTheme.bar.barSize}
                  shape={(props: {
                    x?: number;
                    y?: number;
                    width?: number;
                    height?: number;
                    payload?: { canal?: string };
                  }) => (
                    <rect
                      x={props.x ?? 0}
                      y={props.y ?? 0}
                      width={props.width ?? 0}
                      height={props.height ?? 0}
                      rx={4}
                      ry={4}
                      fill={props.payload?.canal === "Outbound" ? chartTheme.colors.signal : chartTheme.colors.success}
                    />
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-signal-light ring-1 ring-signal/30" />
              Outbound
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success-light ring-1 ring-success/30" />
              Inbound
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
