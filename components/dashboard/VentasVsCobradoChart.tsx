"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { Card } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { DashboardVentasVsCobradoPoint } from "@/types/dashboard";

type VentasVsCobradoChartProps = {
  data: DashboardVentasVsCobradoPoint[];
};

const SIGNAL = "#1F44FF";
const SUCCESS = "#38A169";
const GRAPHITE = "#5A6373";

function formatMoneyTick(value: number | string) {
  const numericValue = Number(value);

  if (Math.abs(numericValue) >= 1000) {
    return `$${(numericValue / 1000).toFixed(numericValue >= 100000 ? 0 : 1)}k`;
  }

  return `$${Math.round(numericValue).toLocaleString("en-US")}`;
}

export function VentasVsCobradoChart({ data }: VentasVsCobradoChartProps) {
  const hasData = data.some((point) => point.ventas > 0 || point.cobrado > 0);

  return (
    <Card padding="md" className="space-y-5 overflow-hidden bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Ventas vs cobrado</h3>
          <p className="text-sm text-graphite">Contratos creados versus caja efectivamente cobrada en los últimos 6 meses.</p>
        </div>
        <span className="rounded-pill bg-success-light px-3 py-1 text-xs font-label text-success">6 meses</span>
      </div>

      {!hasData ? (
        <div className="rounded-card border border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
          Todavía no hay ventas ni cobros en el período seleccionado.
        </div>
      ) : (
        <>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 16, right: 20, bottom: 8, left: 8 }} barCategoryGap="30%">
                <CartesianGrid stroke="#E8ECF3" strokeDasharray="2 10" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: GRAPHITE, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: GRAPHITE, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatMoneyTick}
                />
                <Tooltip
                  content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                    if (!active || !payload?.length) {
                      return null;
                    }

                    const point = payload[0]?.payload;
                    if (!point) {
                      return null;
                    }

                    return (
                      <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                        <p className="mb-2 font-label text-carbon">{label}</p>
                        <div className="space-y-1.5">
                          <p className="text-xs" style={{ color: SIGNAL }}>
                            Ventas: {formatUSD(point.ventas)}
                          </p>
                          <p className="text-xs" style={{ color: SUCCESS }}>
                            Cobrado: {formatUSD(point.cobrado)}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="ventas" name="Ventas" fill={SIGNAL} radius={[8, 8, 2, 2]} barSize={18} />
                <Bar dataKey="cobrado" name="Cobrado" fill={SUCCESS} radius={[8, 8, 2, 2]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-signal-light ring-1 ring-signal/30" />
              Ventas
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success-light ring-1 ring-success/30" />
              Cobrado
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
