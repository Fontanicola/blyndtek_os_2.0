"use client";

import { useMemo } from "react";
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

export function EmbudoLeads({ data }: EmbudoLeadsProps) {
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
              <CartesianGrid stroke="#E8ECF3" strokeDasharray="2 10" horizontal={false} />
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
              <Bar dataKey="cantidad" name="Leads" fill="#1F44FF" radius={[0, 9, 9, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
