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
import type { DashboardWinRateChannel } from "@/types/dashboard";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";

type WinRateChartProps = {
  outbound: DashboardWinRateChannel;
  inbound: DashboardWinRateChannel;
};

const HEX_SIGNAL = "#1F44FF";
const HEX_SUCCESS = "#38A169";

function formatPercent(value: number | string) {
  return `${Number(value).toFixed(1)}%`;
}

export function WinRateChart({ outbound, inbound }: WinRateChartProps) {
  const data = useMemo(
    () => [
      {
        canal: "Outbound",
        porcentaje: outbound.porcentaje ?? 0,
        leads: outbound.leads,
        clientes: outbound.clientes
      },
      {
        canal: "Inbound",
        porcentaje: inbound.porcentaje ?? 0,
        leads: inbound.leads,
        clientes: inbound.clientes
      }
    ],
    [inbound, outbound]
  );

  const hasData = data.some((item) => item.leads > 0);

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Win rate por canal</h3>
          <p className="text-sm text-graphite">Conversión de leads a cliente por origen.</p>
        </div>
        <span className="rounded-pill bg-success-light px-3 py-1 text-xs font-label text-success">Conversión</span>
      </div>

      {!hasData ? (
        <div className="rounded-card border border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
          Sin datos suficientes para calcular conversión por canal.
        </div>
      ) : (
        <>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 12, right: 20, bottom: 8, left: 0 }} barCategoryGap="32%">
                <CartesianGrid stroke="#E8ECF3" strokeDasharray="2 10" vertical={false} />
                <XAxis
                  dataKey="canal"
                  tick={{ fontSize: 11, fill: "#5A6373" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#5A6373" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={formatPercent}
                />
                <Tooltip
                  content={({ active, payload }: TooltipContentProps<number, string>) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const d = payload[0]?.payload as (typeof data)[number] | undefined;
                    if (!d) {
                      return null;
                    }

                    return (
                      <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                        <p className="mb-1 font-label text-carbon">{d.canal}</p>
                        <p className="text-xs text-signal">Conversión: {formatPercent(d.porcentaje)}</p>
                        <p className="text-xs text-graphite">
                          {d.clientes} clientes de {d.leads} leads
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="porcentaje"
                  name="Conversión"
                  radius={[8, 8, 2, 2]}
                  barSize={22}
                  shape={(props: {
                    x?: number;
                    y?: number;
                    width?: number;
                    height?: number;
                    payload?: { canal?: string };
                  }) => (
                    <rect
                      x={props.x ?? 0}
                      y={props.y ?? 0}
                      width={props.width ?? 0}
                      height={props.height ?? 0}
                      rx={8}
                      ry={8}
                      fill={props.payload?.canal === "Outbound" ? HEX_SIGNAL : HEX_SUCCESS}
                    />
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-signal-light ring-1 ring-signal/30" />
              Outbound
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success-light ring-1 ring-success/30" />
              Inbound
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
