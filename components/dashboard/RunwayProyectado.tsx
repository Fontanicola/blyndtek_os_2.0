"use client";

import { useId } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { DashboardRunwayPoint } from "@/types/dashboard";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

type RunwayProyectadoProps = {
  data: DashboardRunwayPoint[];
};

function formatMoneyTick(value: string | number) {
  const numericValue = Number(value);

  if (Math.abs(numericValue) >= 1000) {
    return `$${(numericValue / 1000).toFixed(1)}k`;
  }

  return `$${Math.round(numericValue).toLocaleString("en-US")}`;
}

export function RunwayProyectado({ data }: RunwayProyectadoProps) {
  const chartId = useId().replace(/:/g, "");
  const gradientId = `dashboard-runway-${chartId}`;
  const shadowId = `dashboard-runway-shadow-${chartId}`;

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Runway proyectado</h3>
          <p className="text-sm text-graphite">Proyección de caja usando el burn rate actual.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Caja</span>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 16, right: 18, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6881FF" stopOpacity="1" />
                <stop offset="50%" stopColor="#1F44FF" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#172FBE" stopOpacity="1" />
              </linearGradient>
              <filter id={shadowId} x="-30%" y="-30%" width="160%" height="180%">
                <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#0B0E14" floodOpacity="0.13" />
              </filter>
            </defs>
            <CartesianGrid stroke="#E6EAF2" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#5A6373", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#5A6373", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatMoneyTick} />
            <Tooltip
              content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                if (!active || !payload?.length) {
                  return null;
                }

                return (
                  <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                    <p className="mb-1 font-label text-carbon">{label}</p>
                    <p className="text-xs text-signal">Caja: {formatUSD(Number(payload[0]?.value ?? 0))}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="caja" name="Caja" fill={`url(#${gradientId})`} barSize={20} filter={`url(#${shadowId})`} />
            <Line
              dataKey="caja"
              name="Tendencia"
              stroke="#111827"
              strokeWidth={1.25}
              strokeDasharray="5 6"
              dot={{ r: 2.5, fill: "#111827", stroke: "#FFFFFF", strokeWidth: 1 }}
              type="monotone"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
