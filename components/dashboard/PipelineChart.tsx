"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { DashboardPipelineStage } from "@/types/dashboard";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

type PipelineChartProps = {
  data: DashboardPipelineStage[];
};

function formatMoneyTick(value: string | number) {
  const numericValue = Number(value);

  if (Math.abs(numericValue) >= 1000) {
    return `$${(numericValue / 1000).toFixed(1)}k`;
  }

  return `$${Math.round(numericValue).toLocaleString("en-US")}`;
}

export function PipelineChart({ data }: PipelineChartProps) {
  const chartId = useId().replace(/:/g, "");
  const gradientId = `pipeline-bars-${chartId}`;
  const shadowId = `pipeline-shadow-${chartId}`;

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Pipeline ponderado</h3>
          <p className="text-sm text-graphite">Valor estimado por etapa con peso de cierre aplicado.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Comercial</span>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 18, bottom: 8, left: 8 }} barCategoryGap="30%">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6881FF" stopOpacity="1" />
                <stop offset="52%" stopColor="#1F44FF" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#172FBE" stopOpacity="1" />
              </linearGradient>
              <filter id={shadowId} x="-30%" y="-30%" width="160%" height="180%">
                <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#0B0E14" floodOpacity="0.13" />
              </filter>
            </defs>
            <CartesianGrid stroke="#E6EAF2" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="etapa" tick={{ fill: "#5A6373", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#5A6373", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatMoneyTick} />
            <Tooltip
              content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                if (!active || !payload?.length) {
                  return null;
                }

                return (
                  <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                    <p className="mb-1 font-label text-carbon">{label}</p>
                    <p className="text-xs text-signal">Valor ponderado: {formatUSD(Number(payload[0]?.value ?? 0))}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="ponderado" name="Valor ponderado" fill={`url(#${gradientId})`} barSize={22} filter={`url(#${shadowId})`} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
