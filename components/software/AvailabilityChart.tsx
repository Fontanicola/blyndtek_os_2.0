"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { chartTheme } from "@/lib/charts/chartTheme";
import type { SistemaHealthCheck } from "@/types/sistemas";

function dayLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export function AvailabilityChart({ checks }: { checks: SistemaHealthCheck[] }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const current = checks.filter((check) => check.checked_at.slice(0, 10) === key);
    return { fecha: key, dia: dayLabel(key), disponibilidad: current.length ? Math.round((current.filter((check) => check.estado === "ok").length / current.length) * 100) : null };
  });

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={days} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid {...chartTheme.grid} />
          <XAxis dataKey="dia" {...chartTheme.axis} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} {...chartTheme.axis} tickFormatter={(value) => `${value}%`} />
          <Tooltip formatter={(value: number | null) => value === null ? "Sin datos" : `${value}%`} labelFormatter={(label: string | number) => `Día ${label}`} contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 12px 28px rgba(15,23,42,.12)" }} />
          <Line type="monotone" dataKey="disponibilidad" stroke={chartTheme.colors.success} strokeWidth={2} dot={{ r: 3, fill: chartTheme.colors.success, strokeWidth: 2, stroke: "#fff" }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
