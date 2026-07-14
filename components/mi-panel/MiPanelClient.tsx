"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { ClientesIcon, DashboardIcon, FinanzasIcon, OutboundIcon } from "@/components/icons";
import { MetricaCard } from "@/components/finanzas/MetricaCard";
import { cn } from "@/lib/cn";
import { ETAPA_LABELS, OUTBOUND_ETAPAS } from "@/lib/leads";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { ComisionListado } from "@/types/comisiones";
import type { EtapaLead } from "@/types/leads";

type MiPanelMetricas = {
  leads_totales: number;
  leads_por_etapa: Array<{ etapa: EtapaLead; cantidad: number }>;
  clientes_convertidos: number;
  ventas_cerradas_mes: { count: number; monto: number };
  comision_pendiente_usd: number;
  comision_pagada_usd: number;
  bono: {
    disponible: boolean;
    monto_usd: number;
    umbral_ventas_usd: number;
    ventas_mes_usd: number;
  } | null;
};

type MiPanelState = {
  metrics: MiPanelMetricas | null;
  comisiones: ComisionListado[];
  loading: boolean;
  error: string | null;
};

function LeadsIcon() {
  return <OutboundIcon />;
}

function SalesIcon() {
  return <FinanzasIcon />;
}

function CommissionsIcon() {
  return <DashboardIcon />;
}

function ClientsIcon() {
  return <ClientesIcon />;
}

function stageTone(etapa: EtapaLead) {
  if (etapa === "por_contactar" || etapa === "contactado") {
    return "bg-signal/85";
  }

  if (etapa === "seguimiento" || etapa === "calificado") {
    return "bg-warning/85";
  }

  if (etapa === "cotizacion") {
    return "bg-success/85";
  }

  return "bg-danger/80";
}

export function MiPanelClient() {
  const [state, setState] = useState<MiPanelState>({
    metrics: null,
    comisiones: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const [metricsResponse, commissionsResponse] = await Promise.all([
          fetch("/api/mi-panel/metricas"),
          fetch("/api/comisiones")
        ]);

        const metricsPayload = (await metricsResponse.json()) as { data?: MiPanelMetricas; error?: string };
        const commissionsPayload = (await commissionsResponse.json()) as {
          data?: ComisionListado[];
          error?: string;
        };

        if (!metricsResponse.ok || !metricsPayload.data) {
          throw new Error(metricsPayload.error ?? "No se pudieron cargar las métricas.");
        }

        if (!commissionsResponse.ok || !commissionsPayload.data) {
          throw new Error(commissionsPayload.error ?? "No se pudieron cargar las comisiones.");
        }

        if (!cancelled) {
          setState({
            metrics: metricsPayload.data,
            comisiones: commissionsPayload.data,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            metrics: null,
            comisiones: [],
            loading: false,
            error: error instanceof Error ? error.message : "No se pudo cargar el panel."
          });
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const funnelMax = useMemo(() => {
    return Math.max(1, ...(state.metrics?.leads_por_etapa.map((item) => item.cantidad) ?? [1]));
  }, [state.metrics?.leads_por_etapa]);

  const bonoDisponible = state.metrics?.bono?.disponible ?? false;

  return (
    <div className="space-y-6">
      {state.error ? (
        <Card className="border border-danger/20 bg-danger-light/20" padding="md">
          <div className="text-sm font-label text-danger">{state.error}</div>
        </Card>
      ) : null}

      {state.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[124px] animate-pulse rounded-card bg-paper" />
          ))}
        </div>
      ) : null}

      {!state.loading && state.metrics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricaCard
              label="Leads Totales"
              value={`${state.metrics.leads_totales}`}
              icono={<LeadsIcon />}
              colorIcono="signal"
            />
            <MetricaCard
              label="Clientes Convertidos"
              value={`${state.metrics.clientes_convertidos}`}
              icono={<ClientsIcon />}
              colorIcono="success"
            />
            <MetricaCard
              label="Ventas del Mes"
              value={`${state.metrics.ventas_cerradas_mes.count} ventas · ${formatUSD(state.metrics.ventas_cerradas_mes.monto)}`}
              icono={<SalesIcon />}
              colorIcono="warning"
            />
            <MetricaCard
              label="Comisión Pendiente"
              value={state.metrics.comision_pendiente_usd}
              icono={<CommissionsIcon />}
              colorIcono="danger"
            />
          </div>

          {state.metrics.bono ? (
            <Card padding="md" className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
                    Bono por ventas
                  </div>
                  <div className="mt-2 text-2xl font-title text-carbon">
                    {bonoDisponible ? formatUSD(state.metrics.bono.monto_usd) : "Aún no disponible"}
                  </div>
                </div>
                <Badge variant={bonoDisponible ? "success" : "warning"}>
                  {bonoDisponible ? "Disponible" : "En progreso"}
                </Badge>
              </div>

              <div className="text-sm text-graphite">
                Meta mensual: {formatUSD(state.metrics.bono.umbral_ventas_usd)} · Acumulado este mes:{" "}
                {formatUSD(state.metrics.bono.ventas_mes_usd)}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-normal ease-normal",
                    bonoDisponible ? "bg-success" : "bg-warning"
                  )}
                  style={{
                    width: `${Math.min(100, (state.metrics.bono.ventas_mes_usd / Math.max(state.metrics.bono.umbral_ventas_usd, 1)) * 100)}%`
                  }}
                />
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card padding="md" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-title text-carbon">Embudo de leads</div>
                  <div className="text-xs text-graphite">Solo tus leads registrados por etapa.</div>
                </div>
                <Badge variant="signal">{state.metrics.leads_totales}</Badge>
              </div>

              <div className="space-y-3">
                {OUTBOUND_ETAPAS.map((etapa) => {
                  const item = state.metrics?.leads_por_etapa.find((entry) => entry.etapa === etapa);
                  const count = item?.cantidad ?? 0;
                  const width = `${(count / funnelMax) * 100}%`;

                  return (
                    <div key={etapa} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-label text-carbon">{ETAPA_LABELS[etapa]}</span>
                        <span className="text-graphite">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-paper">
                        <div className={cn("h-full rounded-full", stageTone(etapa))} style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card padding="md" className="space-y-4">
              <div>
                <div className="text-sm font-title text-carbon">Comisiones propias</div>
                <div className="text-xs text-graphite">Histórico personal con estado de pago.</div>
              </div>

              {state.comisiones.length > 0 ? (
                <div className="overflow-hidden rounded-card border border-line-soft">
                  <table className="min-w-full divide-y divide-line-soft text-sm">
                    <thead className="bg-paper">
                      <tr className="text-left text-xs font-label uppercase tracking-[0.08em] text-graphite">
                        <th className="px-3 py-2">Cliente</th>
                        <th className="px-3 py-2">Venta</th>
                        <th className="px-3 py-2">% aplicado</th>
                        <th className="px-3 py-2">Comisión</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft bg-white">
                      {state.comisiones.slice(0, 10).map((comision) => (
                        <tr key={comision.id} className="align-top">
                          <td className="px-3 py-2 text-carbon">{comision.cliente_nombre ?? "Cliente"}</td>
                          <td className="px-3 py-2 text-graphite">{formatUSD(comision.monto_venta)}</td>
                          <td className="px-3 py-2 text-graphite">{comision.porcentaje}%</td>
                          <td className="px-3 py-2 text-carbon">{formatUSD(comision.monto_comision)}</td>
                          <td className="px-3 py-2">
                            <Badge variant={comision.estado === "pagada" ? "success" : "warning"}>
                              {comision.estado === "pagada" ? "Pagada" : "Pendiente"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-graphite">{formatFecha(comision.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-card border border-line-soft bg-paper px-4 py-3 text-sm text-graphite">
                  Todavía no hay comisiones registradas.
                </div>
              )}
            </Card>
          </div>
        </>
      ) : null}

      {!state.loading && !state.metrics && !state.error ? (
        <Card padding="md">
          <div className="text-sm text-graphite">No hay métricas disponibles para este usuario.</div>
        </Card>
      ) : null}
    </div>
  );
}
