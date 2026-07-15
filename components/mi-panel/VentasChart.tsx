"use client";

import { useId, useMemo } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  const chartId = useId().replace(/:/g, "");
  const amountGradient = `ventas-area-${chartId}`;
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
                <defs>
                  <linearGradient id={amountGradient} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SIGNAL} stopOpacity="0.28" />
                    <stop offset="68%" stopColor={SIGNAL} stopOpacity="0.06" />
                    <stop offset="100%" stopColor={SIGNAL} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 10" stroke="#E8ECF3" vertical={false} />
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
                  yAxisId="right"
                  dataKey="cantidad_ventas"
                  name="Ventas"
                  fill="#CBD3E1"
                  radius={[6, 6, 0, 0]}
                  barSize={12}
                />
                <Area
                  yAxisId="left"
                  dataKey="monto_total_usd"
                  name="Monto"
                  stroke={SIGNAL}
                  strokeWidth={2.8}
                  fill={`url(#${amountGradient})`}
                  dot={false}
                  activeDot={{ r: 4, fill: "#FFFFFF", stroke: SIGNAL, strokeWidth: 2.5 }}
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
