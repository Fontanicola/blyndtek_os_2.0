"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { BarChartIcon, InboxIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { MarketingAtribucionPeriod, MarketingAtribucionRow } from "@/types/marketing";

type AtribucionResponse = {
  data?: MarketingAtribucionRow[];
  error?: string;
};

const periodOptions: Array<{ value: MarketingAtribucionPeriod; label: string }> = [
  { value: "month", label: "Este mes" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Este año" },
  { value: "todo", label: "Todo" }
];

const futureTabs = ["Campañas Meta", "Contenido"];

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function MarketingPage() {
  const [period, setPeriod] = useState<MarketingAtribucionPeriod>("month");
  const [rows, setRows] = useState<MarketingAtribucionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchAtribucion() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/marketing/atribucion?period=${period}`);
        const payload = (await response.json()) as AtribucionResponse;

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudo cargar la atribución.");
        }

        if (mounted) {
          setRows(payload.data);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar la atribución.");
          setRows([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void fetchAtribucion();

    return () => {
      mounted = false;
    };
  }, [period]);

  const attributionRows = useMemo(
    () => rows.filter((row) => row.canal_origen !== "organico"),
    [rows]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="signal" className="h-10 px-5 text-sm">
            Atribución
          </Badge>
          {futureTabs.map((tab) => (
            <Badge key={tab} variant="ghost" className="h-10 px-5 text-sm text-graphite/70">
              {tab}
            </Badge>
          ))}
        </div>

        <div className="flex rounded-pill border border-line bg-white p-1 shadow-soft">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={cn(
                "rounded-pill px-4 py-2 text-sm font-label transition-all duration-fast ease-fast",
                period === option.value
                  ? "bg-signal text-white shadow-soft"
                  : "text-graphite hover:bg-paper hover:text-carbon"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Card padding="none" className="overflow-hidden border border-line-soft shadow-soft">
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 py-5">
          <div>
            <h2 className="font-title text-xl text-carbon">Atribución comercial</h2>
            <p className="mt-1 text-sm text-graphite">
              Origen del lead cruzado con cliente, contrato y comisión pagada.
            </p>
          </div>
          <BarChartIcon className="mt-1 text-signal" size={22} />
        </div>

        {error ? (
          <div className="m-6 rounded-component border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {!error && loading ? (
          <div className="px-6 py-10 text-sm text-graphite">Cargando atribución...</div>
        ) : null}

        {!error && !loading && attributionRows.length === 0 ? (
          <div className="px-6 py-12">
            <EmptyState
              icon={InboxIcon}
              titulo="Todavía no hay leads con origen atribuible"
              descripcion="Cuando cargues leads con canal o campaña, la atribución va a mostrar su retorno real."
            />
          </div>
        ) : null}

        {!error && !loading && attributionRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left">
              <thead className="bg-paper text-xs font-label text-graphite">
                <tr>
                  <th className="px-6 py-4">Canal</th>
                  <th className="px-6 py-4">Campaña</th>
                  <th className="px-6 py-4 text-right">Leads</th>
                  <th className="px-6 py-4 text-right">Clientes</th>
                  <th className="px-6 py-4 text-right">Conversión</th>
                  <th className="px-6 py-4 text-right">Ingreso generado</th>
                  <th className="px-6 py-4 text-right">Comisión pagada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft text-sm">
                {attributionRows.map((row) => (
                  <tr key={`${row.canal_origen}-${row.campana_origen ?? "sin-campana"}`}>
                    <td className="px-6 py-4">
                      <Badge variant="signal" className="h-7 px-3 text-xs">
                        {row.canal_label}
                      </Badge>
                    </td>
                    <td className="max-w-[320px] px-6 py-4 text-carbon">
                      {row.campana_origen ?? <span className="text-graphite">Sin campaña</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-label text-carbon">
                      {row.leads_generados}
                    </td>
                    <td className="px-6 py-4 text-right font-label text-carbon">
                      {row.clientes_convertidos}
                    </td>
                    <td className="px-6 py-4 text-right text-graphite">
                      {formatPct(row.tasa_conversion_pct)}
                    </td>
                    <td className="px-6 py-4 text-right font-label text-carbon">
                      {formatUSD(row.ingreso_generado_usd)}
                    </td>
                    <td className="px-6 py-4 text-right text-graphite">
                      {formatUSD(row.comision_pagada_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
