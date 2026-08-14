"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChartIcon, CheckCircleIcon, DollarSignIcon, TrendingUpIcon, UsersIcon, WalletIcon, ZapIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type MetricKey = "ventas_usd" | "ventas_n" | "clientes" | "ticket" | "upsellings" | "facturacion";
type Metric = { key: MetricKey; label: string; unit: "usd" | "number" | "percent"; icon: typeof DollarSignIcon; description: string };
type GoalValues = Record<MetricKey, { objetivo: number; actual: number }>;

const metrics: Metric[] = [
  { key: "ventas_usd", label: "Ventas en $", unit: "usd", icon: DollarSignIcon, description: "Monto vendido en el mes" },
  { key: "ventas_n", label: "Ventas en n", unit: "number", icon: BarChartIcon, description: "Cantidad de ventas cerradas" },
  { key: "clientes", label: "Clientes totales", unit: "number", icon: UsersIcon, description: "Base total de clientes activos" },
  { key: "ticket", label: "Ticket %", unit: "percent", icon: TrendingUpIcon, description: "Ticket promedio o porcentaje definido" },
  { key: "upsellings", label: "Upsellings", unit: "number", icon: ZapIcon, description: "Ventas adicionales a clientes actuales" },
  { key: "facturacion", label: "Facturación total", unit: "usd", icon: WalletIcon, description: "Facturación total del período" }
];

const emptyGoals: GoalValues = {
  ventas_usd: { objetivo: 0, actual: 0 },
  ventas_n: { objetivo: 0, actual: 0 },
  clientes: { objetivo: 0, actual: 0 },
  ticket: { objetivo: 0, actual: 0 },
  upsellings: { objetivo: 0, actual: 0 },
  facturacion: { objetivo: 0, actual: 0 }
};

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
const shortMonthFormatter = new Intl.DateTimeFormat("es-AR", { month: "short" });

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatValue(value: number, unit: Metric["unit"]) {
  if (unit === "usd") return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  if (unit === "percent") return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value)}%`;
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);
}

function getInitialMonths() {
  const today = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - 2 + index, 1);
    return { key: monthKey(date), date };
  });
}

export function ObjetivosClient() {
  const months = useMemo(getInitialMonths, []);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [goals, setGoals] = useState<GoalValues>(emptyGoals);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(`blyndtek-objetivos-${selectedMonth}`);
    if (!raw) {
      setGoals(emptyGoals);
      return;
    }

    try {
      setGoals({ ...emptyGoals, ...(JSON.parse(raw) as Partial<GoalValues>) });
    } catch {
      setGoals(emptyGoals);
    }
  }, [selectedMonth]);

  const selectedDate = months.find((month) => month.key === selectedMonth)?.date ?? new Date();
  const completedCount = metrics.filter((metric) => goals[metric.key].objetivo > 0 && goals[metric.key].actual >= goals[metric.key].objetivo).length;
  const progressAverage = Math.round(metrics.reduce((total, metric) => {
    const values = goals[metric.key];
    return total + (values.objetivo > 0 ? Math.min(100, (values.actual / values.objetivo) * 100) : 0);
  }, 0) / metrics.length);

  function updateValue(key: MetricKey, field: "objetivo" | "actual", value: string) {
    const numericValue = Number(value.replace(",", "."));
    setGoals((current) => ({
      ...current,
      [key]: { ...current[key], [field]: Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0 }
    }));
    setSaved(false);
  }

  function saveGoals() {
    window.localStorage.setItem(`blyndtek-objetivos-${selectedMonth}`, JSON.stringify(goals));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-label uppercase tracking-[0.14em] text-graphite">Control</p>
          <h1 className="mt-1 text-2xl font-title text-carbon">Objetivos</h1>
          <p className="mt-1 text-sm text-graphite">Planteá el objetivo del mes y comparalo contra el resultado actual.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-label text-graphite" htmlFor="objetivos-mes">Período</label>
          <select id="objetivos-mes" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-component border border-line bg-white px-3 py-2 text-sm font-label capitalize text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20">
            {months.map((month) => <option key={month.key} value={month.key}>{monthFormatter.format(month.date)}</option>)}
          </select>
          <button type="button" onClick={saveGoals} className="rounded-component bg-signal px-4 py-2 text-sm font-label text-white transition-colors hover:bg-signal-hover">{saved ? "Guardado" : "Guardar objetivos"}</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-card border border-line-soft bg-white p-4 shadow-card"><div className="flex items-center gap-2 text-xs font-label text-graphite"><BarChartIcon size={16} className="text-signal" />Progreso general</div><div className="mt-2 text-2xl font-title text-carbon">{progressAverage}%</div><div className="mt-3 h-2 overflow-hidden rounded-pill bg-paper"><div className="h-full rounded-pill bg-signal transition-all" style={{ width: `${progressAverage}%` }} /></div></div>
        <div className="rounded-card border border-line-soft bg-white p-4 shadow-card"><div className="flex items-center gap-2 text-xs font-label text-graphite"><CheckCircleIcon size={16} className="text-success" />Objetivos cumplidos</div><div className="mt-2 text-2xl font-title text-carbon">{completedCount}<span className="ml-1 text-base font-body text-graphite">/ {metrics.length}</span></div><p className="mt-2 text-xs text-graphite">{shortMonthFormatter.format(selectedDate)} · actualización manual</p></div>
        <div className="rounded-card border border-line-soft bg-signal p-4 text-white shadow-card"><div className="flex items-center gap-2 text-xs font-label text-white/70"><TrendingUpIcon size={16} />Foco del mes</div><div className="mt-2 text-base font-title">Convertir intención en resultados</div><p className="mt-2 text-xs text-white/70">Completá primero las metas clave y luego agregamos responsables e iniciativas.</p></div>
      </div>

      <div className="overflow-hidden rounded-card border border-line-soft bg-white shadow-card">
        <div className="border-b border-line-soft px-5 py-4"><h2 className="text-base font-title text-carbon">Tablero mensual</h2><p className="mt-1 text-sm text-graphite">{monthFormatter.format(selectedDate)} · cada indicador se compara de forma independiente.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full divide-y divide-line-soft">
            <thead className="bg-paper"><tr className="text-left text-xs font-label uppercase tracking-wide text-graphite"><th className="px-5 py-3">Indicador</th><th className="w-52 px-5 py-3">Objetivo</th><th className="w-52 px-5 py-3">Actual</th><th className="w-60 px-5 py-3">Avance</th></tr></thead>
            <tbody className="divide-y divide-line-soft">
              {metrics.map((metric) => {
                const values = goals[metric.key];
                const percent = values.objetivo > 0 ? Math.min(100, Math.round((values.actual / values.objetivo) * 100)) : 0;
                const Icon = metric.icon;
                return <tr key={metric.key} className="group hover:bg-paper/70">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-component bg-signal-light text-signal"><Icon size={17} /></span><span><span className="block text-sm font-label text-carbon">{metric.label}</span><span className="mt-0.5 block text-xs text-graphite">{metric.description}</span></span></div></td>
                  <td className="px-5 py-4"><div className="relative"><input aria-label={`Objetivo de ${metric.label}`} type="number" min="0" value={values.objetivo || ""} onChange={(event) => updateValue(metric.key, "objetivo", event.target.value)} placeholder="0" className="w-full rounded-component border border-line bg-white px-3 py-2 pr-14 text-sm font-label text-carbon outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20" /><span className="pointer-events-none absolute right-3 top-2.5 text-xs text-graphite">{metric.unit === "usd" ? "USD" : metric.unit === "percent" ? "%" : "un"}</span></div></td>
                  <td className="px-5 py-4"><div className="relative"><input aria-label={`Actual de ${metric.label}`} type="number" min="0" value={values.actual || ""} onChange={(event) => updateValue(metric.key, "actual", event.target.value)} placeholder="0" className="w-full rounded-component border border-line bg-white px-3 py-2 pr-14 text-sm font-label text-carbon outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20" /><span className="pointer-events-none absolute right-3 top-2.5 text-xs text-graphite">{metric.unit === "usd" ? "USD" : metric.unit === "percent" ? "%" : "un"}</span></div><span className="mt-1 block text-xs text-graphite">{formatValue(values.actual, metric.unit)}</span></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="min-w-[96px] flex-1"><div className="h-2 overflow-hidden rounded-pill bg-paper"><div className={cn("h-full rounded-pill transition-all", percent >= 100 ? "bg-success" : percent >= 70 ? "bg-warning" : "bg-signal")} style={{ width: `${percent}%` }} /></div></div><span className="w-12 text-right text-sm font-label text-carbon">{percent}%</span></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line-soft bg-paper/60 px-5 py-3 text-xs text-graphite"><span>Los cambios quedan guardados por período.</span><span>Objetivo vs. Actual</span></div>
      </div>
    </div>
  );
}
