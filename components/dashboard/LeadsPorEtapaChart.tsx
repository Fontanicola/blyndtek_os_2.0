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
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card, EmptyState } from "@/components/ui";
import { InboxIcon } from "@/components/ui/icons";
import { chartTheme } from "@/lib/charts/chartTheme";

type LeadStageCount = {
  etapa: string;
  cantidad: number;
};

type LeadsPorEtapaChartProps = {
  data: LeadStageCount[];
};

const STAGE_LABELS: Record<string, string> = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  seguimiento: "Seguimiento",
  calificado: "Calificado",
  diagnostico_ofrecido: "Diagnóstico ofrecido",
  diagnostico_pagado: "Diagnóstico pagado",
  cotizacion: "Cotización",
  ganado: "Ganado",
  descartado: "Descartado"
};

const STAGE_COLORS: Record<string, string> = {
  por_contactar: "#DDE4FF",
  contactado: "#C2CFFF",
  seguimiento: "#9FB2FF",
  calificado: "#718DFF",
  diagnostico_ofrecido: chartTheme.colors.warning,
  diagnostico_pagado: "#6B7CFF",
  cotizacion: chartTheme.colors.signal,
  ganado: chartTheme.colors.success,
  descartado: "#F0A6A6"
};

export function LeadsPorEtapaChart({ data }: LeadsPorEtapaChartProps) {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        etiqueta: STAGE_LABELS[item.etapa] ?? item.etapa
      })),
    [data]
  );

  const hasData = chartData.some((item) => item.cantidad > 0);
  const maxValue = Math.max(1, ...chartData.map((item) => item.cantidad));

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Leads por etapa</h3>
          <p className="text-sm text-graphite">Distribución de oportunidades por momento del pipeline.</p>
        </div>
        <span className="rounded-pill bg-signal-light px-3 py-1 text-xs font-label text-signal">Pipeline</span>
      </div>

      {!hasData ? (
        <EmptyState
          icon={InboxIcon}
          titulo="Todavía no hay leads cargados"
          descripcion="El embudo se va a completar automáticamente cuando ingresen oportunidades."
        />
      ) : (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
              barCategoryGap="28%"
            >
              <CartesianGrid
                stroke={chartTheme.grid.stroke}
                strokeDasharray={chartTheme.grid.strokeDasharray}
                vertical={chartTheme.grid.vertical}
              />
              <XAxis
                type="number"
                tick={chartTheme.axis.tick}
                axisLine={chartTheme.axis.axisLine}
                tickLine={chartTheme.axis.tickLine}
                tickMargin={chartTheme.axis.tickMargin}
                allowDecimals={false}
                domain={[0, Math.max(1, Math.ceil(maxValue * 1.1))]}
              />
              <YAxis
                type="category"
                dataKey="etiqueta"
                tick={{ ...chartTheme.axis.tick, fill: chartTheme.colors.carbon }}
                axisLine={chartTheme.axis.axisLine}
                tickLine={chartTheme.axis.tickLine}
                width={132}
              />
              <Tooltip
                cursor={{ fill: "rgba(31, 68, 255, 0.05)" }}
                content={({ active, payload }: TooltipContentProps<number, string>) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const item = payload[0]?.payload as (typeof chartData)[number] | undefined;
                  if (!item) {
                    return null;
                  }

                  return (
                    <div className={chartTheme.tooltip.className}>
                      <p className={chartTheme.tooltip.titleClassName}>{item.etiqueta}</p>
                      <div className={chartTheme.tooltip.bodyClassName}>
                        <div className={chartTheme.tooltip.rowClassName}>
                          <span className={chartTheme.tooltip.labelClassName} style={{ color: chartTheme.colors.signal }}>
                            Leads
                          </span>
                          <span className={chartTheme.tooltip.valueClassName}>{item.cantidad}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="cantidad"
                name="Leads"
                radius={chartTheme.bar.horizontalRadius}
                barSize={chartTheme.bar.barSize}
                shape={(props: {
                  x?: number;
                  y?: number;
                  width?: number;
                  height?: number;
                  payload?: { etapa?: string };
                }) => (
                  <rect
                    x={props.x ?? 0}
                    y={props.y ?? 0}
                    width={props.width ?? 0}
                    height={props.height ?? 0}
                    rx={4}
                    ry={4}
                    fill={STAGE_COLORS[props.payload?.etapa ?? ""] ?? "#DDE4FF"}
                  />
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
