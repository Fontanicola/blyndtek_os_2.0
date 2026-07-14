"use client";

import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";

type VentasChartPoint = {
  mes: string;
  cantidad_ventas: number;
  monto_total_usd: number;
};

type VentasChartProps = {
  data: VentasChartPoint[];
};

const SIGNAL = "#1F44FF";
const GRAPHITE = "#5A6373";

function formatMoneyTick(value: number) {
  const absolute = Math.abs(value);

  if (absolute >= 1000) {
    return `$${(absolute / 1000).toFixed(absolute >= 100000 ? 0 : 1)}k`;
  }

  return `$${absolute.toLocaleString("en-US")}`;
}

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
                <CartesianGrid strokeDasharray="4 8" stroke="#E6EAF2" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: GRAPHITE }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value: number | string) => formatMoneyTick(Number(value))}
                  tick={{ fontSize: 11, fill: GRAPHITE }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: GRAPHITE }}
                  axisLine={false}
                  tickLine={false}
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
                      <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                        <p className="mb-2 font-label text-carbon">{label}</p>
                        <p className="text-xs text-signal">Monto: {formatUSD(point.monto_total_usd)}</p>
                        <p className="text-xs text-graphite">Ventas: {point.cantidad_ventas}</p>
                      </div>
                    );
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="monto_total_usd"
                  name="Monto"
                  fill={SIGNAL}
                  radius={[4, 4, 0, 0]}
                  barSize={16}
                />
                <Line
                  yAxisId="right"
                  dataKey="cantidad_ventas"
                  name="Ventas"
                  stroke={GRAPHITE}
                  strokeWidth={1.35}
                  strokeDasharray="5 6"
                  dot={{ r: 2.5, fill: GRAPHITE, stroke: "#FFFFFF", strokeWidth: 1.5 }}
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
