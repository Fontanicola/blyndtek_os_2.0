"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { AgentesHubCostoHistoricoPoint, AgentesHubCostoHistoricoSerie } from "@/lib/agentes/hub";

type AiHubCostoChartProps = {
  data: AgentesHubCostoHistoricoPoint[];
  series: AgentesHubCostoHistoricoSerie[];
};

function formatMoneyTick(value: number | string) {
  const numericValue = Number(value);

  if (Math.abs(numericValue) >= 1000) {
    return `$${(numericValue / 1000).toFixed(numericValue >= 100000 ? 0 : 1)}k`;
  }

  return `$${Math.round(numericValue).toLocaleString("en-US")}`;
}

export function AiHubCostoChart({ data, series }: AiHubCostoChartProps) {
  const hasData = data.some((point) => point.total_usd > 0);

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Costo de IA por mes</h3>
          <p className="text-sm text-graphite">Distribución del gasto en los últimos 6 meses por agente.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">6 meses</span>
      </div>

      {!hasData || series.length === 0 ? (
        <div className="rounded-card border border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
          Todavía no hay costo de IA en el período seleccionado.
        </div>
      ) : (
        <>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 20, bottom: 8, left: 8 }} barCategoryGap="28%">
                <CartesianGrid stroke="#E8ECF3" strokeDasharray="2 10" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: "#5A6373", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5A6373", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatMoneyTick} />
                <Tooltip
                  content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const point = payload[0]?.payload as AgentesHubCostoHistoricoPoint | undefined;
                    if (!point) {
                      return null;
                    }

                    return (
                      <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                        <p className="mb-2 font-label text-carbon">{label}</p>
                        <div className="space-y-1.5">
                          {series.map((serie) => {
                            const amount = Number(point[serie.slug] ?? 0);
                            return (
                              <p key={serie.slug} className="text-xs" style={{ color: serie.color }}>
                                {serie.label}: {formatUSD(amount)}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                {series.map((serie) => (
                  <Bar key={serie.slug} dataKey={serie.slug} name={serie.label} fill={serie.color} radius={[8, 8, 2, 2]} barSize={16} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
            {series.map((serie) => (
              <span key={serie.slug} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: serie.color }} />
                {serie.label}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
