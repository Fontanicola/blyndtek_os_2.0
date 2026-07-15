"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DashboardIcon, FinanzasIcon } from "@/components/icons";
import { Badge, Button, Card, Modal } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  addMonths,
  formatMonthKey,
  startOfMonth,
  type RunwayPoint
} from "@/lib/finanzas";
import { calculateRunwayProjection } from "@/lib/finanzas/runwayProjection";
import { buildRunwayScenarioSeries } from "@/lib/finanzas/runwayProjection";
import { formatUSD } from "@/lib/utils/formatters";
import type { Cobro } from "@/types/cobros";
import type { CategoriaEgreso, Egreso } from "@/types/egresos";
import type { Suscripcion } from "@/types/suscripciones";
import type { BadgeVariant } from "@/types/ui";
import { MetricaCard } from "./MetricaCard";

export type RunwayHypothesis = {
  id: string;
  nombre: string;
  monto: number;
  categoria: CategoriaEgreso;
  meses: string[];
  activa: boolean;
};

type RunwayLabProps = {
  cajaActual: number;
  cobros: Cobro[];
  egresos: Egreso[];
  suscripciones: Suscripcion[];
  loading?: boolean;
  onApprove?: (hypotheses: Array<Omit<RunwayHypothesis, "activa">>) => Promise<void> | void;
};

const categoriaOptions: Array<{ value: CategoriaEgreso; label: string }> = [
  { value: "dominios", label: "Dominios" },
  { value: "hosting_infraestructura", label: "Hosting/Infraestructura" },
  { value: "herramientas_software", label: "Herramientas/Software" },
  { value: "marketing_ads", label: "Marketing/Ads" },
  { value: "impuestos_contable", label: "Impuestos/Contable" },
  { value: "sueldos_honorarios", label: "Sueldos/Honorarios" },
  { value: "comisiones", label: "Comisiones" },
  { value: "otro", label: "Otro" }
];

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  year: "2-digit"
});

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `runway-${Date.now()}-${Math.random()}`;
}

function formatMonthChip(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return monthFormatter.format(new Date(Number(year), Number(month) - 1, 1)).replace(".", "");
}

function getMonthOptions() {
  const base = startOfMonth(new Date());
  return Array.from({ length: 12 }, (_value, index) => {
    const date = addMonths(base, index + 1);
    const monthKey = formatMonthKey(date);
    return {
      value: monthKey,
      label: formatMonthChip(monthKey)
    };
  });
}

function getRunwayMonths(series: RunwayPoint[]) {
  const exhaustedIndex = series.findIndex((point) => point.caja <= 0);
  return exhaustedIndex === -1 ? null : exhaustedIndex;
}

function formatRunwayLabel(runwayMeses: number | null, quemaNeta: number | null) {
  if (quemaNeta == null || quemaNeta <= 0) {
    return "Estable";
  }

  if (runwayMeses == null) {
    return "> 12 meses";
  }

  return `${runwayMeses.toFixed(1)} ${runwayMeses === 1 ? "mes" : "meses"}`;
}

function formatScenarioLabel(
  currentLabel: string,
  currentRunwayMonths: number | null,
  scenarioRunwayMonths: number | null,
  activeHypothesesCount: number
) {
  if (activeHypothesesCount === 0) {
    return currentLabel;
  }

  if (scenarioRunwayMonths == null) {
    return currentRunwayMonths == null ? currentLabel : "> 12 meses";
  }

  if (scenarioRunwayMonths === 0) {
    return "Caja agotada";
  }

  return `${scenarioRunwayMonths.toFixed(1)} ${scenarioRunwayMonths === 1 ? "mes" : "meses"}`;
}

function formatMoneyTick(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1000) {
    const compact = absolute / 1000;
    return `${sign}$${compact.toFixed(compact >= 100 ? 0 : 1)}k`;
  }

  return `${sign}$${Math.round(absolute).toLocaleString("en-US")}`;
}

function formatRunwayDifference(current: number | null, next: number | null) {
  if (current == null && next == null) {
    return "Sin cambios";
  }

  if (current == null && next != null) {
    return "Pierde estabilidad";
  }

  if (current != null && next == null) {
    return "Gana estabilidad";
  }

  if (current == null || next == null) {
    return "Sin cambios";
  }

  const delta = next - current;

  if (Math.abs(delta) < 0.01) {
    return "Sin cambios";
  }

  const formatted = `${Math.abs(delta).toFixed(1)} meses`;
  return delta > 0 ? `+${formatted}` : `-${formatted}`;
}

function getScenarioTone(current: number | null, next: number | null) {
  if (current == null && next == null) {
    return "signal";
  }

  if (current == null && next != null) {
    return "danger";
  }

  if (current != null && next == null) {
    return "success";
  }

  if (current == null || next == null) {
    return "warning";
  }

  if (next > current) {
    return "success";
  }

  if (next < current) {
    return "danger";
  }

  return "warning";
}

type ChartDatum = {
  month: string;
  label: string;
  actual: number;
  escenario: number | null;
};

export function RunwayLab({
  cajaActual,
  cobros,
  egresos,
  suscripciones,
  loading = false,
  onApprove
}: RunwayLabProps) {
  const chartId = useId().replace(/:/g, "");
  const actualGradient = `runway-lab-actual-${chartId}`;
  const [hypotheses, setHypotheses] = useState<RunwayHypothesis[]>([]);
  const [nombre, setNombre] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEgreso>("marketing_ads");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [includePendientes, setIncludePendientes] = useState(false);

  const menuRootRef = useRef<HTMLDivElement | null>(null);

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const actualProjection = useMemo(
    () => calculateRunwayProjection(cajaActual, cobros, egresos, suscripciones, new Date(), 12, { incluirPendientes: includePendientes }),
    [cajaActual, cobros, egresos, suscripciones, includePendientes]
  );
  const activeHypotheses = useMemo(() => hypotheses.filter((hypothesis) => hypothesis.activa), [hypotheses]);
  const currentSeries = useMemo(() => actualProjection.series, [actualProjection.series]);
  const scenarioSeries = useMemo(
    () =>
      activeHypotheses.length > 0
        ? buildRunwayScenarioSeries(actualProjection.series, activeHypotheses, 12)
        : null,
    [activeHypotheses, actualProjection.series]
  );

  const chartData: ChartDatum[] = useMemo(
    () =>
      currentSeries.map((point, index) => ({
        month: point.month,
        label: point.label,
        actual: point.caja,
        escenario: scenarioSeries?.[index]?.caja ?? null
      })),
    [currentSeries, scenarioSeries]
  );

  const currentRunwayMonths = actualProjection.runwayMonths;
  const scenarioRunwayMonths = useMemo(() => {
    if (!scenarioSeries) {
      return currentRunwayMonths;
    }

    return getRunwayMonths(scenarioSeries);
  }, [currentRunwayMonths, scenarioSeries]);

  const scenarioTone = getScenarioTone(currentRunwayMonths, scenarioRunwayMonths);
  const scenarioTextClass = scenarioTone === "success" ? "text-success" : scenarioTone === "danger" ? "text-danger" : "text-warning";
  const currentLabel = formatRunwayLabel(currentRunwayMonths, actualProjection.monthlyBurn);
  const scenarioLabel = formatScenarioLabel(currentLabel, currentRunwayMonths, scenarioRunwayMonths, activeHypotheses.length);
  const currentStatus =
    actualProjection.monthlyBurn <= 0
      ? { label: "Estable", variant: "success" as const }
      : currentRunwayMonths == null
        ? { label: "> 12 meses", variant: "warning" as const }
        : currentRunwayMonths === 0
          ? { label: "Caja agotada", variant: "danger" as const }
          : undefined;

  const differenceLabel = useMemo(() => {
    if (activeHypotheses.length === 0) {
      return "Sin cambios";
    }

    return formatRunwayDifference(currentRunwayMonths, scenarioRunwayMonths);
  }, [activeHypotheses.length, currentRunwayMonths, scenarioRunwayMonths]);

  const differenceMonths = useMemo(() => {
    if (activeHypotheses.length === 0 || currentRunwayMonths == null || scenarioRunwayMonths == null) {
      return null;
    }

    return scenarioRunwayMonths - currentRunwayMonths;
  }, [activeHypotheses.length, currentRunwayMonths, scenarioRunwayMonths]);

  const impactById = useMemo(() => {
    return hypotheses.reduce<Record<string, string>>((accumulator, hypothesis) => {
      const singleScenario = buildRunwayScenarioSeries(actualProjection.series, [hypothesis], 12);
      const singleRunwayMonths = getRunwayMonths(singleScenario);
      accumulator[hypothesis.id] = formatRunwayDifference(currentRunwayMonths, singleRunwayMonths);
      return accumulator;
    }, {});
  }, [actualProjection.series, currentRunwayMonths, hypotheses]);

  useEffect(() => {
    if (openMenuId && !hypotheses.some((hypothesis) => hypothesis.id === openMenuId)) {
      setOpenMenuId(null);
    }
  }, [hypotheses, openMenuId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRootRef.current) {
        return;
      }

      if (!menuRootRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function resetDraft() {
    setNombre("");
    setMonto("");
    setCategoria("marketing_ads");
    setSelectedMonths([]);
    setEditingId(null);
  }

  function populateDraft(hypothesis: RunwayHypothesis) {
    setNombre(hypothesis.nombre);
    setMonto(String(hypothesis.monto));
    setCategoria(hypothesis.categoria);
    setSelectedMonths(hypothesis.meses);
    setEditingId(hypothesis.id);
  }

  function handleToggleMonth(monthKey: string) {
    setSelectedMonths((current) =>
      current.includes(monthKey) ? current.filter((item) => item !== monthKey) : [...current, monthKey].sort()
    );
  }

  function handleAddOrUpdate() {
    const cleanNombre = nombre.trim();
    const cleanMonto = Number(monto);

    if (!cleanNombre || !Number.isFinite(cleanMonto) || cleanMonto <= 0 || selectedMonths.length === 0) {
      return;
    }

    const nextHypothesis: RunwayHypothesis = {
      id: editingId ?? createId(),
      nombre: cleanNombre,
      monto: cleanMonto,
      categoria,
      meses: [...selectedMonths].sort(),
      activa: true
    };

    setHypotheses((current) =>
      editingId ? current.map((item) => (item.id === editingId ? nextHypothesis : item)) : [...current, nextHypothesis]
    );
    resetDraft();
  }

  function handleDiscardAll() {
    if (hypotheses.some((hypothesis) => hypothesis.activa)) {
      const confirmed = window.confirm("¿Descartar todas las hipótesis del escenario?");
      if (!confirmed) {
        return;
      }
    }

    setHypotheses([]);
    resetDraft();
    setConfirmOpen(false);
    setActionError(null);
  }

  async function handleApprove() {
    if (activeHypotheses.length === 0) {
      return;
    }

    setApproving(true);
    setActionError(null);

    try {
      if (!onApprove) {
        return;
      }

      await onApprove(
        activeHypotheses.map((hypothesis) => ({
          id: hypothesis.id,
          nombre: hypothesis.nombre,
          monto: hypothesis.monto,
          categoria: hypothesis.categoria,
          meses: hypothesis.meses
        }))
      );
      setHypotheses([]);
      resetDraft();
      setConfirmOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudieron aprobar los cambios.");
    } finally {
      setApproving(false);
    }
  }

  function toggleHypothesis(id: string) {
    setHypotheses((current) => current.map((item) => (item.id === id ? { ...item, activa: !item.activa } : item)));
  }

  function deleteHypothesis(id: string) {
    const confirmed = window.confirm("¿Eliminar esta hipótesis?");
    if (!confirmed) {
      return;
    }

    setHypotheses((current) => current.filter((item) => item.id !== id));
    if (editingId === id) {
      resetDraft();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-component bg-paper" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-component bg-paper" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_value, index) => (
            <Card key={index} padding="md" className="space-y-3">
              <div className="h-3 w-24 animate-pulse rounded-component bg-paper" />
              <div className="h-8 w-32 animate-pulse rounded-component bg-paper" />
              <div className="h-3 w-40 animate-pulse rounded-component bg-paper" />
            </Card>
          ))}
        </div>
        <Card padding="md" className="space-y-4">
          <div className="h-4 w-48 animate-pulse rounded-component bg-paper" />
          <div className="h-[380px] animate-pulse rounded-card bg-paper" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-title text-carbon">Runway Lab</h2>
        <p className="text-sm text-graphite">
          Simulá decisiones antes de tomarlas — probá costos hipotéticos y mirá cómo afectan tu runway antes de
          comprometerte.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricaCard
          label="Runway actual"
          value={currentLabel}
          icono={<DashboardIcon />}
          colorIcono={
            actualProjection.monthlyBurn <= 0
              ? "success"
              : currentRunwayMonths === 0
                ? "danger"
                : "warning"
          }
          status={currentStatus}
        />
        <MetricaCard
          label="Runway con escenario"
          value={scenarioLabel}
          icono={<DashboardIcon />}
          colorIcono={scenarioTone === "success" ? "success" : scenarioTone === "danger" ? "danger" : "warning"}
          status={
            activeHypotheses.length === 0
              ? { label: "Sin escenario", variant: "ghost" }
              : {
                  label: scenarioTone === "success" ? "Mejora" : scenarioTone === "danger" ? "Empeora" : "Neutro",
                  variant: (scenarioTone === "success"
                    ? "success"
                    : scenarioTone === "danger"
                      ? "danger"
                      : "warning") as BadgeVariant
                }
          }
        />
        <MetricaCard
          label="Diferencia"
          value={differenceLabel}
          icono={<FinanzasIcon />}
          colorIcono={
            activeHypotheses.length === 0 ? "graphite" : differenceMonths != null && differenceMonths >= 0 ? "success" : "danger"
          }
          status={activeHypotheses.length === 0 ? { label: "Sin cambios", variant: "ghost" } : undefined}
        />
      </div>

      <Card padding="md" className="space-y-3 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-label text-carbon">Incluir cobros y suscripciones pendientes</p>
            <p className="text-xs text-graphite">
              Proyecta el runway asumiendo que los cobros pendientes y las suscripciones activadas se cobran en la fecha esperada.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={includePendientes}
            aria-label="Incluir cobros y suscripciones pendientes"
            onClick={() => setIncludePendientes((current) => !current)}
            className={cn(
              "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-fast ease-fast",
              includePendientes ? "border-signal bg-signal" : "border-line-soft bg-paper"
            )}
          >
            <span
              className={cn(
                "inline-block h-6 w-6 transform rounded-full bg-white shadow-soft transition-transform duration-fast ease-fast",
                includePendientes ? "translate-x-7" : "translate-x-1"
              )}
            />
          </button>
        </div>

        <p className="text-xs text-graphite">
          {includePendientes
            ? "La base ya suma los ingresos esperados de cobros y suscripciones pendientes."
            : "Modo conservador: solo caja real, MRR activo y costos ya pagados."}
        </p>

        {actualProjection.cobros_sin_fecha_usd > 0 || actualProjection.suscripciones_sin_fecha_usd > 0 ? (
          <p className="rounded-component border border-warning/20 bg-warning-light px-3 py-2 text-xs text-warning">
            Hay {formatUSD(actualProjection.cobros_sin_fecha_usd)} en cobros y {formatUSD(actualProjection.suscripciones_sin_fecha_usd)} en suscripciones pendientes sin fecha esperada — no están incluidos en esta proyección. Cargales una fecha para que se sumen.
          </p>
        ) : null}
      </Card>

      <Card padding="md" className="space-y-5 overflow-hidden bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-title text-carbon">Proyección comparativa</h3>
            <p className="text-sm text-graphite">La línea sólida es el runway actual y la punteada refleja el escenario activo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-graphite">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-signal" />
              Actual
            </span>
            {activeHypotheses.length > 0 ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                Escenario
              </span>
            ) : null}
          </div>
        </div>

        <div className="h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 28, bottom: 12, left: 4 }}>
              <defs>
                <linearGradient id={actualGradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F44FF" stopOpacity="0.28" />
                  <stop offset="68%" stopColor="#1F44FF" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#1F44FF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8ECF3" strokeDasharray="2 10" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5A6373" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#5A6373" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number | string) => formatMoneyTick(Number(value))}
                domain={[(dataMin: number) => Math.min(0, Math.floor(dataMin * 1.1)), (dataMax: number) => Math.max(1, Math.ceil(dataMax * 1.1))]}
              />
              <Tooltip
                content={({ active, payload, label }: TooltipContentProps<number, string>) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const actual = payload.find((entry) => entry.dataKey === "actual")?.value;
                  const scenario = payload.find((entry) => entry.dataKey === "escenario")?.value;

                  return (
                    <div className="rounded-card border border-white/80 bg-white/95 p-3 text-sm shadow-modal backdrop-blur">
                      <p className="mb-2 font-label text-carbon">{label}</p>
                      <p className="text-xs text-signal">Actual: {formatUSD(Number(actual ?? 0))}</p>
                      {activeHypotheses.length > 0 && scenario != null ? (
                        <p className={cn("text-xs", scenarioTextClass)}>
                          Escenario: {formatUSD(Number(scenario))}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Area
                dataKey="actual"
                name="Runway actual"
                type="monotone"
                stroke="#1F44FF"
                strokeWidth={2.8}
                fill={`url(#${actualGradient})`}
                dot={false}
                activeDot={{ r: 4, fill: "#FFFFFF", stroke: "#1F44FF", strokeWidth: 2.5 }}
              />
              {activeHypotheses.length > 0 ? (
                <Line
                  type="monotone"
                  dataKey="escenario"
                  name="Con escenario"
                  stroke={scenarioTone === "success" ? "#38A169" : scenarioTone === "danger" ? "#E53E3E" : "#D97706"}
                  strokeWidth={2.2}
                  strokeDasharray="7 6"
                  dot={false}
                  activeDot={{ r: 4, fill: "#FFFFFF", stroke: scenarioTone === "success" ? "#38A169" : scenarioTone === "danger" ? "#E53E3E" : "#D97706", strokeWidth: 2.5 }}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card padding="md" className="space-y-4">
          <div>
            <h3 className="text-base font-title text-carbon">Agregar hipótesis</h3>
            <p className="text-sm text-graphite">Seleccioná meses específicos para simular costos antes de aprobarlos.</p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-label uppercase tracking-[0.08em] text-graphite">Meses a afectar</p>
              <div className="flex flex-wrap gap-2">
                {monthOptions.map((option) => {
                  const isSelected = selectedMonths.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggleMonth(option.value)}
                      className={cn(
                        "rounded-pill border px-3 py-2 text-xs font-label transition-colors duration-fast ease-fast",
                        isSelected
                          ? "border-signal/30 bg-signal-light text-signal"
                          : "border-[#D8DBE3] bg-paper text-graphite hover:bg-paper/80"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Nombre del costo"
                className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={monto}
                  onChange={(event) => setMonto(event.target.value)}
                  type="number"
                  min={0}
                  placeholder="Monto mensual"
                  className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                />

                <select
                  value={categoria}
                  onChange={(event) => setCategoria(event.target.value as CategoriaEgreso)}
                  className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                >
                  {categoriaOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={handleAddOrUpdate}
              disabled={!nombre.trim() || !monto || selectedMonths.length === 0}
            >
              {editingId ? "Guardar cambios" : "+ Agregar al escenario"}
            </Button>

            {editingId ? (
              <div className="flex items-center justify-between rounded-component bg-paper px-3 py-2 text-xs text-graphite">
                <span>Editando hipótesis existente.</span>
                <button
                  type="button"
                  className="font-label text-signal hover:underline"
                  onClick={resetDraft}
                >
                  Cancelar
                </button>
              </div>
            ) : null}
          </div>
        </Card>

        <Card padding="md" className="space-y-4">
          <div>
            <h3 className="text-base font-title text-carbon">Hipótesis del escenario</h3>
            <p className="text-sm text-graphite">Activá o desactivá cada hipótesis para ver cómo cambia tu runway al instante.</p>
          </div>

          {hypotheses.length === 0 ? (
            <div className="rounded-card border border-dashed border-line-soft bg-paper/40 px-4 py-10 text-center">
              <p className="text-sm text-graphite">Agregá tu primera hipótesis para empezar a simular.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hypotheses.map((hypothesis) => (
                <div
                  key={hypothesis.id}
                  ref={(node) => {
                    if (openMenuId === hypothesis.id) {
                      menuRootRef.current = node;
                    }
                  }}
                  className={cn(
                    "rounded-card border border-line-soft bg-white p-4 shadow-soft transition-opacity duration-fast ease-fast",
                    !hypothesis.activa && "opacity-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <label className="mt-1 inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hypothesis.activa}
                        onChange={() => toggleHypothesis(hypothesis.id)}
                        className="h-4 w-4 rounded border-line text-signal focus:ring-signal"
                      />
                    </label>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-label text-carbon">{hypothesis.nombre}</p>
                            <Badge variant="ghost">{categoriaOptions.find((option) => option.value === hypothesis.categoria)?.label}</Badge>
                          </div>
                          <p className="text-sm text-graphite">{formatUSD(hypothesis.monto)} / mes</p>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            aria-label="Opciones"
                            onClick={() => setOpenMenuId((current) => (current === hypothesis.id ? null : hypothesis.id))}
                            className="flex h-8 w-8 items-center justify-center rounded-component text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
                          >
                            ⋮
                          </button>

                          {openMenuId === hypothesis.id ? (
                            <div className="absolute right-0 top-full z-10 mt-2 w-40 rounded-card border border-line-soft bg-white p-2 shadow-modal">
                              <button
                                type="button"
                                className="w-full rounded-component px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                                onClick={() => {
                                  populateDraft(hypothesis);
                                  setOpenMenuId(null);
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="w-full rounded-component px-3 py-2 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  deleteHypothesis(hypothesis.id);
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {hypothesis.meses.map((month) => (
                          <span key={`${hypothesis.id}-${month}`} className="rounded-pill bg-paper px-2.5 py-1 text-xs font-label text-graphite">
                            {formatMonthChip(month)}
                          </span>
                        ))}
                      </div>

                      <p className={cn("text-xs font-label", hypothesis.activa ? "text-carbon" : "text-graphite")}>
                        Impacto individual: {impactById[hypothesis.id] ?? "Sin cambios"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleDiscardAll}>
              Descartar todo
            </Button>
            <Button variant="primary" onClick={() => setConfirmOpen(true)} disabled={activeHypotheses.length === 0}>
              Aprobar cambios
            </Button>
          </div>
        </Card>
      </div>

      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Aprobar cambios" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-graphite">
            Esto va a crear {activeHypotheses.reduce((total, hypothesis) => total + hypothesis.meses.length, 0)} egresos reales:
          </p>

          <div className="space-y-3">
            {activeHypotheses.map((hypothesis) => (
              <div key={hypothesis.id} className="rounded-card border border-line-soft bg-paper/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-label text-carbon">{hypothesis.nombre}</p>
                  <Badge variant="ghost">{categoriaOptions.find((option) => option.value === hypothesis.categoria)?.label}</Badge>
                </div>
                <p className="text-sm text-graphite">{formatUSD(hypothesis.monto)} / mes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hypothesis.meses.map((month) => (
                    <span key={`${hypothesis.id}-${month}-confirm`} className="rounded-pill bg-white px-2.5 py-1 text-xs font-label text-graphite">
                      {formatMonthChip(month)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-graphite">
            Esta acción no se puede deshacer automáticamente — los egresos quedan como pendientes de pago, editables desde la tab Egresos.
          </p>

          {actionError ? <p className="rounded-component bg-danger-light px-3 py-2 text-sm text-danger">{actionError}</p> : null}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void handleApprove()} loading={approving}>
              Confirmar y crear egresos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
