"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";

export type ClienteRentabilidadPoint = {
  mes: string;
  ingresos: number;
  costos: number;
  margen: number;
};

type ClienteRentabilidadChartProps = {
  data: ClienteRentabilidadPoint[];
};

const SIGNAL = "#1F44FF";
const DANGER = "#E53E3E";
const SUCCESS = "#38A169";
const GRAPHITE = "#5A6373";

function formatMoneyTick(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1000) {
    return `${sign}$${(absolute / 1000).toFixed(absolute >= 100000 ? 0 : 1)}k`;
  }

  return `${sign}$${absolute.toLocaleString("en-US")}`;
}

export function ClienteRentabilidadChart({ data }: ClienteRentabilidadChartProps) {
  const maxAbsValue = useMemo(
    () => Math.max(1, ...data.map((point) => Math.max(Math.abs(point.ingresos), Math.abs(point.costos), Math.abs(point.margen)))),
    [data]
  );

  return (
    <Card padding="md" className="overflow-hidden bg-white">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">Rentabilidad mensual</h3>
            <p className="text-sm text-graphite">Ingresos, costos y margen de los ultimos 6 meses.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Ingresos", color: SIGNAL },
              { label: "Costos", color: DANGER },
              { label: "Margen", color: SUCCESS }
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
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: GRAPHITE }} axisLine={false} tickLine={false} interval={0} />
              <YAxis
                tickFormatter={(value: number | string) => formatMoneyTick(Number(value))}
                tick={{ fontSize: 11, fill: GRAPHITE }}
                axisLine={false}
                tickLine={false}
                domain={[Math.min(0, -maxAbsValue * 1.15), Math.max(0, maxAbsValue * 1.15)]}
              />
              <Tooltip
                content={({
                  active,
                  payload,
                  label
                }: {
                  active?: boolean;
                  payload?: Array<{ payload?: ClienteRentabilidadPoint }>;
                  label?: string | number;
                }) => {
                  const point = payload?.[0]?.payload;

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
                          Costos: {formatUSD(point.costos)}
                        </p>
                        <p className="text-xs" style={{ color: SUCCESS }}>
                          Margen: {formatUSD(point.margen)}
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="ingresos" name="Ingresos" fill={SIGNAL} radius={[6, 6, 0, 0]} barSize={16} />
              <Bar dataKey="costos" name="Costos" fill={DANGER} radius={[6, 6, 0, 0]} barSize={16} />
              <Line
                type="monotone"
                dataKey="margen"
                name="Margen"
                stroke={SUCCESS}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: "#FFFFFF", stroke: SUCCESS, strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#FFFFFF", stroke: SUCCESS, strokeWidth: 2.5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
