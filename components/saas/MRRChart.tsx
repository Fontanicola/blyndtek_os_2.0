"use client";

import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { ProductoHistoricoMRRPoint } from "@/types/productos";

type MRRChartProps = {
  data: ProductoHistoricoMRRPoint[];
  loading?: boolean;
};

const HEX_SIGNAL = "#1F44FF";

function formatMoneyTick(value: string | number) {
  const numericValue = Number(value);
  const absolute = Math.abs(numericValue);
  const sign = numericValue < 0 ? "-" : "";

  if (absolute >= 1000) {
    const compact = absolute / 1000;
    return `${sign}$${compact.toFixed(compact >= 100 ? 0 : 1)}k`;
  }

  return `${sign}$${Math.round(absolute).toLocaleString("en-US")}`;
}

function ChartSkeleton() {
  return (
    <Card padding="md" className="space-y-4">
      <div>
        <div className="h-4 w-40 rounded-pill bg-paper animate-pulse" />
        <div className="mt-2 h-3 w-64 rounded-pill bg-paper animate-pulse" />
      </div>
      <div className="h-[320px] rounded-card bg-paper animate-pulse" />
    </Card>
  );
}

export function MRRChart({ data, loading = false }: MRRChartProps) {
  const chartId = useId().replace(/:/g, "");
  const mrrGradient = `mrr-area-${chartId}`;
  const hasData = data.some((point) => point.mrr > 0);

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        label: point.label
      })),
    [data]
  );

  if (loading && !data.length) {
    return <ChartSkeleton />;
  }

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">MRR mensual</h3>
          <p className="text-sm text-graphite">Evolución de ingresos recurrentes de los últimos seis meses.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Recurrencia</span>
      </div>

      {!hasData ? (
        <div className="rounded-card border border-line-soft bg-paper px-4 py-10 text-sm text-graphite">
          Sin datos suficientes para dibujar el histórico de MRR.
        </div>
      ) : (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id={mrrGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={HEX_SIGNAL} stopOpacity="0.28" />
                  <stop offset="68%" stopColor={HEX_SIGNAL} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={HEX_SIGNAL} stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8ECF3" strokeDasharray="2 10" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#5A6373" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#5A6373" }}
                axisLine={false}
                tickLine={false}
                domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax * 1.1), 1)]}
                tickFormatter={formatMoneyTick}
              />
              <Tooltip
                content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const d = payload[0]?.payload as (typeof chartData)[number] | undefined;
                  if (!d) {
                    return null;
                  }

                  return (
                    <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                      <p className="mb-1 font-label text-carbon">{label}</p>
                      <p className="text-xs text-signal">MRR: {formatUSD(d.mrr)}</p>
                    </div>
                  );
                }}
              />
              <Area
                dataKey="mrr"
                name="MRR"
                type="monotone"
                stroke={HEX_SIGNAL}
                strokeWidth={2.8}
                fill={`url(#${mrrGradient})`}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: HEX_SIGNAL, strokeWidth: 2.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
