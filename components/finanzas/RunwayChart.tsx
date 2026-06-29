"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import type { RunwayPoint } from "@/lib/finanzas";

type RunwayChartProps = {
  data: RunwayPoint[];
};

export function RunwayChart({ data }: RunwayChartProps) {
  return (
    <Card padding="md" className="overflow-hidden">
      <div className="flex h-[420px] flex-col">
        <div className="mb-4">
          <h3 className="text-base font-title text-carbon">Runway proyectado</h3>
          <p className="text-sm text-graphite">Proyeccion simple de caja a partir del burn rate actual.</p>
        </div>

        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#EAECF0" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fill: "#5A6373", fontSize: 11 }} />
              <YAxis tick={{ fill: "#5A6373", fontSize: 11 }} />
              <Tooltip />
              <Line dataKey="caja" stroke="#1F44FF" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex shrink-0 items-center gap-2 text-sm text-graphite">
          <span className="h-3 w-3 rounded-full bg-signal" />
          Caja
        </div>
      </div>
    </Card>
  );
}
