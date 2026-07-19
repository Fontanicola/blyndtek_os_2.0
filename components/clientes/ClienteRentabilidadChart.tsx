"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui";
import { chartTheme, formatCompactCurrencyTick } from "@/lib/charts/chartTheme";
import { formatUSD } from "@/lib/utils/formatters";

export type ClienteRentabilidadPoint = {
  mes: string;
  ingresos: number;
  costos: number;
  margen: number;
};

type ClienteRentabilidadChartProps = {
  data: ClienteRentabilidadPoint[];
};

export function ClienteRentabilidadChart({ data }: ClienteRentabilidadChartProps) {
  const maxAbsValue = useMemo(
    () => Math.max(1, ...data.map((point) => Math.max(Math.abs(point.ingresos), Math.abs(point.costos), Math.abs(point.margen)))),
    [data]
  );

  return (
    <Card padding="md" className="overflow-hidden bg-white">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">Rentabilidad mensual</h3>
            <p className="text-sm text-graphite">Ingresos, costos y margen de los ultimos 6 meses.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Ingresos", color: chartTheme.colors.signal },
              { label: "Costos", color: chartTheme.colors.danger },
              { label: "Margen", color: chartTheme.colors.success }
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
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
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
                tickFormatter={formatCompactCurrencyTick}
                tick={chartTheme.axis.tick}
                axisLine={chartTheme.axis.axisLine}
                tickLine={chartTheme.axis.tickLine}
                domain={[Math.min(0, -maxAbsValue * 1.15), Math.max(0, maxAbsValue * 1.15)]}
              />
              <Tooltip
                content={({
                  active,
                  payload,
                  label
                }: {
                  active?: boolean;
                  payload?: Array<{ payload?: ClienteRentabilidadPoint }>;
                  label?: string | number;
                }) => {
                  const point = payload?.[0]?.payload;

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
                          Costos: {formatUSD(point.costos)}
                        </p>
                        <p className="text-xs" style={{ color: chartTheme.colors.success }}>
                          Margen: {formatUSD(point.margen)}
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="ingresos"
                name="Ingresos"
                fill={chartTheme.colors.signal}
                radius={chartTheme.bar.radius}
                barSize={chartTheme.bar.barSize}
              />
              <Bar
                dataKey="costos"
                name="Costos"
                fill={chartTheme.colors.danger}
                radius={chartTheme.bar.radius}
                barSize={chartTheme.bar.barSize}
              />
              <Line
                type="monotone"
                dataKey="margen"
                name="Margen"
                stroke={chartTheme.colors.success}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#FFFFFF", stroke: chartTheme.colors.success, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#FFFFFF", stroke: chartTheme.colors.success, strokeWidth: 2.5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
