"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import type { MonthlyFinancialPoint } from "@/lib/finanzas";

type PLChartProps = {
  data: MonthlyFinancialPoint[];
};

export function PLChart({ data }: PLChartProps) {
  return (
    <Card padding="md" className="overflow-hidden">
      <div className="flex h-[420px] flex-col">
        <div className="mb-4">
          <h3 className="text-base font-title text-carbon">P&amp;L mensual</h3>
          <p className="text-sm text-graphite">Ingresos vs egresos de los ultimos 6 meses.</p>
        </div>

        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#EAECF0" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fill: "#5A6373", fontSize: 11 }} />
              <YAxis tick={{ fill: "#5A6373", fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="ingresos" fill="#1F44FF" />
              <Bar dataKey="egresos" fill="#5A6373" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex shrink-0 items-center gap-5 text-sm text-graphite">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-signal" />
            Ingresos
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-graphite" />
            Egresos
          </span>
        </div>
      </div>
    </Card>
  );
}
