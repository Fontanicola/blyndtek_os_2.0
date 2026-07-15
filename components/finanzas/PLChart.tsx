"use client";

import { useId, useMemo } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
const GRAPHITE = "#5A6373";
const CLIENTS = "#CBD3E1";

function formatMoneyTick(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1000) {
    return `${sign}$${(absolute / 1000).toFixed(absolute >= 100000 ? 0 : 1)}k`;
  }

  return `${sign}$${absolute.toLocaleString("en-US")}`;
}

export function PLChart({ data }: PLChartProps) {
  const chartId = useId().replace(/:/g, "");
  const ingresosGradient = `pl-ingresos-${chartId}`;
  const egresosGradient = `pl-egresos-${chartId}`;
  const margenGradient = `pl-margen-${chartId}`;

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
                  <stop offset="0%" stopColor={SIGNAL} stopOpacity="0.24" />
                  <stop offset="65%" stopColor={SIGNAL} stopOpacity="0.07" />
                  <stop offset="100%" stopColor={SIGNAL} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={egresosGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DANGER} stopOpacity="0.18" />
                  <stop offset="65%" stopColor={DANGER} stopOpacity="0.05" />
                  <stop offset="100%" stopColor={DANGER} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={margenGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SUCCESS} stopOpacity="0.2" />
                  <stop offset="65%" stopColor={SUCCESS} stopOpacity="0.05" />
                  <stop offset="100%" stopColor={SUCCESS} stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 10" stroke="#E8ECF3" vertical={false} />
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
                  const point = payload?.[0]?.payload as MonthlyFinancialPoint | undefined;

                  if (!active || !point) {
                    return null;
                  }

                  return (
                    <div className="rounded-card border border-white/80 bg-white/95 p-4 text-sm shadow-modal backdrop-blur">
                      <p className="mb-2 font-label text-carbon">{label}</p>
                      <div className="space-y-1.5">
                        <p className="text-xs" style={{ color: SIGNAL }}>
                          Ingresos: {formatUSD(point.ingresos)}
                        </p>
                        <p className="text-xs" style={{ color: DANGER }}>
                          Egresos: {formatUSD(point.egresos)}
                        </p>
                        <p className="text-xs" style={{ color: SUCCESS }}>
                          Margen: {formatUSD(point.margen)}
                        </p>
                        <p className="text-xs" style={{ color: GRAPHITE }}>
                          Clientes activos: {point.clientes_activos.toLocaleString("en-US")}
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                yAxisId="right"
                dataKey="clientes_activos"
                name="Clientes activos"
                fill={CLIENTS}
                radius={[6, 6, 0, 0]}
                barSize={10}
              />
              <Area
                yAxisId="left"
                dataKey="ingresos"
                name="Ingresos"
                stroke={SIGNAL}
                strokeWidth={2.8}
                fill={`url(#${ingresosGradient})`}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: SIGNAL, strokeWidth: 2.5 }}
                type="monotone"
              />
              <Area
                yAxisId="left"
                dataKey="margen"
                name="Margen"
                stroke={SUCCESS}
                strokeWidth={2.4}
                fill={`url(#${margenGradient})`}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: SUCCESS, strokeWidth: 2.5 }}
                type="monotone"
              />
              <Area
                yAxisId="left"
                dataKey="egresos"
                name="Egresos"
                stroke={DANGER}
                strokeWidth={2.4}
                fill={`url(#${egresosGradient})`}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: DANGER, strokeWidth: 2.5 }}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
