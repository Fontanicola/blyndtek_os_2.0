"use client";

import { useId, useMemo } from "react";
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
import type { DashboardLeadStageCount } from "@/types/dashboard";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

type EmbudoLeadsProps = {
  data: DashboardLeadStageCount[];
};

const LABELS: Record<string, string> = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  seguimiento: "Seguimiento",
  calificado: "Calificado",
  cotizacion: "Cotización",
  descartado: "Descartado"
};

const HEX_SIGNAL = "#1F44FF";

export function EmbudoLeads({ data }: EmbudoLeadsProps) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `dash-funnel-${uid}`;
  const shadowId = `dash-funnel-shadow-${uid}`;

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        etiqueta: LABELS[item.etapa] ?? item.etapa
      })),
    [data]
  );

  const hasData = chartData.some((item) => item.cantidad > 0);
  const maxValue = Math.max(1, ...chartData.map((item) => item.cantidad));

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Embudo de leads</h3>
          <p className="text-sm text-graphite">Cantidad de oportunidades por etapa.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Pipeline</span>
      </div>

      {!hasData ? (
        <div className="rounded-card border border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
          Sin datos suficientes para construir el embudo.
        </div>
      ) : (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 12, right: 28, bottom: 8, left: 8 }}
              barCategoryGap="28%"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#172FBE" stopOpacity="1" />
                  <stop offset="45%" stopColor={HEX_SIGNAL} stopOpacity="0.96" />
                  <stop offset="100%" stopColor="#7C92FF" stopOpacity="0.55" />
                </linearGradient>
                <filter id={shadowId} x="-30%" y="-30%" width="160%" height="180%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B0E14" floodOpacity="0.12" />
                </filter>
              </defs>
              <CartesianGrid stroke="#E6EAF2" strokeDasharray="4 8" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#5A6373" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={[0, Math.max(1, Math.ceil(maxValue * 1.1))]}
              />
              <YAxis
                type="category"
                dataKey="etiqueta"
                tick={{ fontSize: 11, fill: "#0B0E14" }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                content={({ active, payload }: TooltipContentProps<number, string>) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const d = payload[0]?.payload as (typeof chartData)[number] | undefined;
                  if (!d) {
                    return null;
                  }

                  return (
                    <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                      <p className="mb-1 font-label text-carbon">{d.etiqueta}</p>
                      <p className="text-xs text-signal">Leads: {d.cantidad}</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="cantidad"
                name="Leads"
                fill={`url(#${gradientId})`}
                radius={[0, 12, 12, 0]}
                barSize={18}
                filter={`url(#${shadowId})`}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
