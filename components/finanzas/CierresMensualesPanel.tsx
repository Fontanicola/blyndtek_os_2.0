"use client";

import { useMemo, useState } from "react";
import { Button, Card, EmptyState } from "@/components/ui";
import { BarChartIcon, ChevronRightIcon, SparklesIcon } from "@/components/ui/icons";
import { formatUSD } from "@/lib/utils/formatters";
import { formatMonthLabel } from "@/lib/finanzas";
import type { CierreMensual } from "@/types/cierres";
import { MetricaCard } from "./MetricaCard";

type CierresMensualesPanelProps = {
  initialCierres: CierreMensual[];
};

type GenerateResponse = {
  data?: {
    cierre?: CierreMensual;
  };
  error?: string;
};

function monthLabel(dateString: string) {
  return formatMonthLabel(new Date(`${dateString.slice(0, 7)}-01T00:00:00`));
}

export function CierresMensualesPanel({ initialCierres }: CierresMensualesPanelProps) {
  const [cierres, setCierres] = useState<CierreMensual[]>(initialCierres);
  const [selectedId, setSelectedId] = useState<string | null>(initialCierres[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => cierres.find((cierre) => cierre.id === selectedId) ?? cierres[0] ?? null,
    [cierres, selectedId]
  );

  async function handleGenerateNow() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cierres-mensuales/generar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      const payload = (await response.json()) as GenerateResponse;

      if (!response.ok || !payload.data?.cierre) {
        throw new Error(payload.error ?? "No se pudo generar el cierre mensual.");
      }

      setCierres((current) => {
        const withoutSameMonth = current.filter((item) => item.mes !== payload.data!.cierre!.mes);
        return [payload.data!.cierre!, ...withoutSameMonth].sort(
          (left, right) => new Date(right.generado_at).getTime() - new Date(left.generado_at).getTime()
        );
      });
      setSelectedId(payload.data.cierre.id);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "No se pudo generar el cierre mensual.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="md" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-title text-carbon">Cierre mensual de caja</h3>
          <p className="text-sm text-graphite">
            Resumen automático del mes cerrado, con números reales y síntesis breve para seguimiento financiero.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void handleGenerateNow()} loading={loading}>
          <SparklesIcon size={16} />
          Generar cierre ahora
        </Button>
      </div>

      {error ? (
        <div className="rounded-component border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {!selected ? (
        <EmptyState
          icon={BarChartIcon}
          titulo="Todavía no hay cierres generados"
          descripcion="Generá el primero para dejar trazado cómo cerró el mes en caja, ingresos y egresos."
          accion={{ label: "Generar cierre", onClick: () => void handleGenerateNow() }}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <MetricaCard
              label="Ingresos del mes"
              value={formatUSD(selected.ingresos_totales_usd ?? 0)}
              colorIcono="success"
            />
            <MetricaCard
              label="Egresos del mes"
              value={formatUSD(selected.egresos_totales_usd ?? 0)}
              colorIcono="danger"
            />
            <MetricaCard
              label="Margen del mes"
              value={formatUSD(selected.margen_usd ?? 0)}
              colorIcono={(selected.margen_usd ?? 0) >= 0 ? "success" : "warning"}
              description={
                selected.desvio_pct_vs_anterior == null
                  ? "Sin base comparativa anterior"
                  : `${selected.desvio_pct_vs_anterior >= 0 ? "+" : ""}${selected.desvio_pct_vs_anterior.toFixed(1)}% vs. mes anterior`
              }
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-component border border-line-soft bg-paper/40 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="font-label text-carbon">Resumen de {monthLabel(selected.mes)}</h4>
                <span className="text-xs text-graphite">
                  Generado {new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(selected.generado_at))}
                </span>
              </div>
              <div className="space-y-3 text-sm leading-7 text-graphite whitespace-pre-line">
                {selected.resumen_texto ?? "Sin resumen disponible."}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-label text-carbon">Historial de cierres</h4>
              <div className="space-y-2">
                {cierres.map((cierre) => {
                  const active = cierre.id === selected.id;
                  return (
                    <button
                      key={cierre.id}
                      type="button"
                      onClick={() => setSelectedId(cierre.id)}
                      className={`flex w-full items-center justify-between rounded-component border px-3 py-3 text-left transition-colors duration-fast ease-fast ${
                        active
                          ? "border-signal bg-signal-light text-signal"
                          : "border-line-soft bg-white text-carbon hover:bg-paper/50"
                      }`}
                    >
                      <div>
                        <p className="font-label">{monthLabel(cierre.mes)}</p>
                        <p className="text-xs text-graphite">Margen {formatUSD(cierre.margen_usd ?? 0)}</p>
                      </div>
                      <ChevronRightIcon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
