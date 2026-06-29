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
import type { DashboardPipelineStage } from "@/types/dashboard";

type PipelineChartProps = {
  data: DashboardPipelineStage[];
};

export function PipelineChart({ data }: PipelineChartProps) {
  return (
    <Card padding="md" className="space-y-4">
      <div>
        <h3 className="text-base font-title text-carbon">Pipeline ponderado</h3>
        <p className="text-sm text-graphite">Valor estimado por etapa con peso de cierre aplicado.</p>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#EAECF0" strokeDasharray="4 4" />
            <XAxis dataKey="etapa" tick={{ fill: "#5A6373", fontSize: 11 }} />
            <YAxis tick={{ fill: "#5A6373", fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="ponderado" name="Valor ponderado" fill="#1F44FF" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

