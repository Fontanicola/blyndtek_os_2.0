"use client";

import { useId } from "react";
import {
  Area,
  ComposedChart,
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
                <stop offset="0%" stopColor="#1F44FF" stopOpacity="0.28" />
                <stop offset="68%" stopColor="#1F44FF" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#1F44FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E8ECF3" strokeDasharray="2 10" vertical={false} />
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
            <Area
              dataKey="caja"
              name="Caja"
              stroke="#1F44FF"
              strokeWidth={2.8}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: "#FFFFFF", stroke: "#1F44FF", strokeWidth: 2.5 }}
              type="monotone"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
