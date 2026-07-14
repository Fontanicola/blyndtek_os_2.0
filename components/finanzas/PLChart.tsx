"use client";

import { useId, useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { MonthlyFinancialPoint } from "@/lib/finanzas";

type PLChartProps = {
  data: MonthlyFinancialPoint[];
};

const SIGNAL = "#1F44FF";
const DANGER = "#E53E3E";
const SUCCESS = "#38A169";
const INK = "#111827";
const GRAPHITE = "#5A6373";

function formatMoneyTick(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1000) {
    return `${sign}$${(absolute / 1000).toFixed(absolute >= 100000 ? 0 : 1)}k`;
  }

  return `${sign}$${absolute.toLocaleString("en-US")}`;
}

function formatTooltipValue(
  dataKey: string | undefined,
  value: string | number | ReadonlyArray<string | number> | undefined
) {
  const numericValue = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);

  if (dataKey === "clientes_activos") {
    return `${numericValue.toLocaleString("en-US")} clientes`;
  }

  return formatUSD(numericValue);
}

export function PLChart({ data }: PLChartProps) {
  const chartId = useId().replace(/:/g, "");
  const ingresosGradient = `pl-ingresos-${chartId}`;
  const egresosGradient = `pl-egresos-${chartId}`;
  const margenGradient = `pl-margen-${chartId}`;
  const shadowFilter = `pl-shadow-${chartId}`;

  const averageMargin = useMemo(() => {
    const totalIngresos = data.reduce((total, point) => total + point.ingresos, 0);
    const totalEgresos = data.reduce((total, point) => total + point.egresos, 0);

    if (totalIngresos <= 0) {
      return null;
    }

    return ((totalIngresos - totalEgresos) / totalIngresos) * 100;
  }, [data]);

  return (
    <Card padding="md" className="overflow-hidden bg-white">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">P&amp;L mensual</h3>
            <p className="text-sm text-graphite">Ingresos vs egresos de los ultimos 12 meses.</p>
            <p className="mt-1 text-xs text-graphite">
              Margen promedio (12 meses): {averageMargin == null ? "Sin datos" : `${averageMargin.toFixed(1)}%`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Ingresos", color: SIGNAL },
              { label: "Egresos", color: DANGER },
              { label: "Margen", color: SUCCESS },
              { label: "Clientes", color: GRAPHITE }
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
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart data={data} margin={{ top: 24, right: 28, left: 14, bottom: 14 }}>
              <defs>
                <linearGradient id={ingresosGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5D78FF" stopOpacity="1" />
                  <stop offset="52%" stopColor={SIGNAL} stopOpacity="0.96" />
                  <stop offset="100%" stopColor="#1732C8" stopOpacity="1" />
                </linearGradient>
                <linearGradient id={egresosGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF7B72" stopOpacity="1" />
                  <stop offset="55%" stopColor={DANGER} stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#B91C1C" stopOpacity="1" />
                </linearGradient>
                <linearGradient id={margenGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#65D69A" stopOpacity="1" />
                  <stop offset="52%" stopColor={SUCCESS} stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#1F7A4C" stopOpacity="1" />
                </linearGradient>
                <filter id={shadowFilter} x="-30%" y="-30%" width="160%" height="180%">
                  <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#0B0E14" floodOpacity="0.16" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="4 8" stroke="#E6EAF2" vertical={false} />
              <XAxis
                dataKey="label"
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
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
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

                  return (
                    <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                      <p className="mb-2 font-label text-carbon">{label}</p>
                      {payload.map((entry) => (
                        <p key={`${entry.dataKey}`} className="text-xs" style={{ color: entry.color }}>
                          {entry.name}: {formatTooltipValue(entry.dataKey as string | undefined, entry.value)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="ingresos"
                name="Ingresos"
                fill={`url(#${ingresosGradient})`}
                radius={[4, 4, 0, 0]}
                barSize={18}
                filter={`url(#${shadowFilter})`}
              />
              <Bar
                yAxisId="left"
                dataKey="egresos"
                name="Egresos"
                fill={`url(#${egresosGradient})`}
                radius={[4, 4, 0, 0]}
                barSize={18}
                filter={`url(#${shadowFilter})`}
              />
              <Bar
                yAxisId="left"
                dataKey="margen"
                name="Margen"
                fill={`url(#${margenGradient})`}
                radius={[4, 4, 0, 0]}
                barSize={18}
                filter={`url(#${shadowFilter})`}
              />
              <Line
                yAxisId="right"
                dataKey="clientes_activos"
                name="Clientes activos"
                stroke={INK}
                strokeWidth={1.35}
                strokeDasharray="5 6"
                dot={{ r: 2.5, fill: INK, stroke: "#FFFFFF", strokeWidth: 1.5 }}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
