"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { RunwayPoint } from "@/lib/finanzas";

type RunwayChartProps = {
  data: RunwayPoint[];
  comparisonData?: RunwayPoint[];
  comparisonLabel?: string;
};

type ChartPoint = RunwayPoint & {
  comparativa?: number | null;
};

const SIGNAL = "#1F44FF";
const SUCCESS = "#38A169";
const DANGER = "#E53E3E";

function formatAxisUSD(value: string | number, maxValue: number) {
  const numericValue = Number(value);
  const absolute = Math.abs(numericValue);
  const sign = numericValue < 0 ? "-" : "";

  if (maxValue >= 1000) {
    const compact = absolute / 1000;
    const digits = compact >= 100 ? 0 : 1;
    return `${sign}$${compact.toFixed(digits)}k`;
  }

  return `${sign}$${Math.round(absolute).toLocaleString("en-US")}`;
}

export function RunwayChart({ data, comparisonData, comparisonLabel = "Comparativa" }: RunwayChartProps) {
  const chartId = useId().replace(/:/g, "");
  const cajaGradient = `runway-caja-${chartId}`;

  const chartData = useMemo<ChartPoint[]>(
    () =>
      data.map((point, index) => {
        const comparisonPoint = comparisonData?.[index] ?? null;

        return {
          ...point,
          comparativa: comparisonPoint?.caja ?? null
        };
      }),
    [comparisonData, data]
  );

  const maxAxisValue = useMemo(
    () =>
      Math.max(
        0,
        ...chartData.flatMap((point) => [Math.abs(point.caja), Math.abs(point.comparativa ?? 0)])
      ),
    [chartData]
  );

  const comparisonStroke =
    comparisonData == null
      ? SUCCESS
      : ((comparisonData[comparisonData.length - 1]?.caja ?? 0) >= (data[data.length - 1]?.caja ?? 0))
        ? SUCCESS
        : DANGER;

  return (
    <Card padding="md" className="overflow-hidden bg-white">
      <div className="flex h-[420px] flex-col">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-title text-carbon">Runway proyectado</h3>
            <p className="text-sm text-graphite">Proyeccion simple de caja a partir del burn rate actual.</p>
          </div>
          <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Caja futura</span>
        </div>

        <div className="relative min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 24, bottom: 10, left: 0 }}>
              <defs>
                <linearGradient id={cajaGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SIGNAL} stopOpacity="0.26" />
                  <stop offset="68%" stopColor={SIGNAL} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={SIGNAL} stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8ECF3" strokeDasharray="2 10" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#5A6373", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatAxisUSD(value, maxAxisValue)}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const current = payload.find((entry) => entry.dataKey === "caja");
                  const comparison = payload.find((entry) => entry.dataKey === "comparativa");

                  return (
                    <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                      <p className="mb-2 font-label text-carbon">{label}</p>
                      {current ? (
                        <p className="text-xs" style={{ color: current.color ?? SIGNAL }}>
                          Actual: {formatUSD(Number(current.value ?? 0))}
                        </p>
                      ) : null}
                      {comparison ? (
                        <p className="text-xs" style={{ color: comparisonStroke }}>
                          {comparisonLabel}: {formatUSD(Number(comparison.value ?? 0))}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Area
                dataKey="caja"
                name="Caja actual"
                type="monotone"
                stroke={SIGNAL}
                strokeWidth={2.8}
                fill={`url(#${cajaGradient})`}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: SIGNAL, strokeWidth: 2.5 }}
              />
              {comparisonData ? (
                <Line
                  dataKey="comparativa"
                  name={comparisonLabel}
                  stroke={comparisonStroke}
                  strokeWidth={2.2}
                  strokeDasharray="7 6"
                  dot={false}
                  activeDot={{ r: 4, fill: "#FFFFFF", stroke: comparisonStroke, strokeWidth: 2.5 }}
                  type="monotone"
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex shrink-0 items-center gap-4 text-sm text-graphite">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-signal" />
            Caja
          </span>
          {comparisonData ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: comparisonStroke }} />
              {comparisonLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
