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
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";

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
  cotizacion: "Cotización",
  ganado: "Ganado",
  descartado: "Descartado"
};

const STAGE_GRADIENTS: Record<string, [string, string]> = {
  por_contactar: ["#E8EEFF", "#A7B9FF"],
  contactado: ["#DCE5FF", "#7E9AFF"],
  seguimiento: ["#C9D6FF", "#5F82FF"],
  calificado: ["#B2C4FF", "#365DFF"],
  cotizacion: ["#93ADFF", "#1F44FF"],
  ganado: ["#E3FFEE", "#38A169"],
  descartado: ["#FFF5F5", "#E53E3E"]
};

export function LeadsPorEtapaChart({ data }: LeadsPorEtapaChartProps) {
  const uid = useId().replace(/:/g, "");
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

  const gradientIds = useMemo(
    () =>
      chartData.reduce<Record<string, string>>((acc, item) => {
        acc[item.etapa] = `commercial-stage-${item.etapa}-${uid}`;
        return acc;
      }, {}),
    [chartData, uid]
  );

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
        <div className="rounded-card border border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
          Todavía no hay leads cargados.
        </div>
      ) : (
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
              barCategoryGap="28%"
            >
              <defs>
                {chartData.map((item) => {
                  const [startColor, endColor] = STAGE_GRADIENTS[item.etapa] ?? ["#E8EEFF", "#1F44FF"];
                  const id = gradientIds[item.etapa];

                  return (
                    <linearGradient key={item.etapa} id={id} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={startColor} stopOpacity="1" />
                      <stop offset="100%" stopColor={endColor} stopOpacity="1" />
                    </linearGradient>
                  );
                })}
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
                    <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                      <p className="mb-1 font-label text-carbon">{item.etiqueta}</p>
                      <p className="text-xs text-signal">Leads: {item.cantidad}</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="cantidad"
                name="Leads"
                radius={[0, 12, 12, 0]}
                barSize={16}
                shape={(props) => {
                  const item = props.payload as (typeof chartData)[number] | undefined;
                  const id = item ? gradientIds[item.etapa] : undefined;

                  return (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      rx={12}
                      ry={12}
                      fill={id ? `url(#${id})` : "#E8EEFF"}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
