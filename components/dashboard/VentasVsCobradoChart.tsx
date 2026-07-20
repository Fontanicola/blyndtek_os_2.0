"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card, EmptyState } from "@/components/ui";
import { BarChartIcon } from "@/components/ui/icons";
import { chartTheme, formatCompactCurrencyTick } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";
import type { DashboardVentasVsCobradoPoint } from "@/types/dashboard";

type VentasVsCobradoChartProps = {
  data: DashboardVentasVsCobradoPoint[];
};

export function VentasVsCobradoChart({ data }: VentasVsCobradoChartProps) {
  const hasData = data.some((point) => point.ventas > 0 || point.cobrado > 0);

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Ventas vs cobrado</h3>
          <p className="text-sm text-graphite">Contratos creados versus caja efectivamente cobrada en los últimos 6 meses.</p>
        </div>
        <span className="rounded-pill bg-success-light px-3 py-1 text-xs font-label text-success">6 meses</span>
      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChartIcon}
          titulo="Todavía no hay ventas ni cobros en el período"
          descripcion="Cuando haya contratos creados o cobros registrados, este gráfico los va a comparar."
        />
      ) : (
        <>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 20, bottom: 8, left: 8 }} barCategoryGap="30%">
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

                    const point = payload[0]?.payload;
                    if (!point) {
                      return null;
                    }

                    return (
                      <div className={chartTheme.tooltip.className}>
                        <p className="mb-2 font-label text-carbon">{label}</p>
                        <div className="space-y-1.5">
                          <p className="text-xs" style={{ color: chartTheme.colors.signal }}>
                            Ventas: {formatUSD(point.ventas)}
                          </p>
                          <p className="text-xs" style={{ color: chartTheme.colors.success }}>
                            Cobrado: {formatUSD(point.cobrado)}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="ventas"
                  name="Ventas"
                  fill={chartTheme.colors.signal}
                  radius={chartTheme.bar.radius}
                  barSize={chartTheme.bar.barSize}
                />
                <Bar
                  dataKey="cobrado"
                  name="Cobrado"
                  fill={chartTheme.colors.success}
                  radius={chartTheme.bar.radius}
                  barSize={chartTheme.bar.barSize}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-signal-light ring-1 ring-signal/30" />
              Ventas
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success-light ring-1 ring-success/30" />
              Cobrado
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
