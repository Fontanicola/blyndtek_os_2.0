"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui";
import type { DashboardWinRateChannel } from "@/types/dashboard";

type WinRateChartProps = {
  outbound: DashboardWinRateChannel;
  inbound: DashboardWinRateChannel;
};

export function WinRateChart({ outbound, inbound }: WinRateChartProps) {
  const data = [
    { canal: "Outbound", porcentaje: outbound.porcentaje ?? 0 },
    { canal: "Inbound", porcentaje: inbound.porcentaje ?? 0 }
  ];

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <h3 className="text-base font-title text-carbon">Win rate por canal</h3>
        <p className="text-sm text-graphite">Porcentaje de leads que llegaron a cliente.</p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#EAECF0" strokeDasharray="4 4" />
            <XAxis dataKey="canal" tick={{ fill: "#5A6373", fontSize: 11 }} />
            <YAxis tick={{ fill: "#5A6373", fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="porcentaje" name="% conversión" fill="#38A169" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

