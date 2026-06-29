"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card } from "@/components/ui";
import type { DashboardRunwayPoint } from "@/types/dashboard";

type RunwayProyectadoProps = {
  data: DashboardRunwayPoint[];
};

export function RunwayProyectado({ data }: RunwayProyectadoProps) {
  return (
    <Card padding="md" className="space-y-4">
      <div>
        <h3 className="text-base font-title text-carbon">Runway proyectado</h3>
        <p className="text-sm text-graphite">Proyección de caja usando el burn rate actual.</p>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#EAECF0" strokeDasharray="4 4" />
            <XAxis dataKey="label" tick={{ fill: "#5A6373", fontSize: 11 }} />
            <YAxis tick={{ fill: "#5A6373", fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line dataKey="caja" name="Caja" stroke="#1F44FF" strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

