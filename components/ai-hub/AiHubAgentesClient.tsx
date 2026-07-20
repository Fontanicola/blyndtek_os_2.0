"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, EmptyState, Toast } from "@/components/ui";
import {
  AlertTriangleIcon,
  BellIcon,
  BotIcon,
  CheckCircleIcon,
  InboxIcon,
  SparklesIcon,
  TrendingUpIcon
} from "@/components/ui/icons";
import { ConfiguracionAgenteForm } from "@/components/ai-hub/ConfiguracionAgenteForm";
import { formatAgentesRelativeTime, getAgentesTipoResumen, type AgentesHubFeedItem } from "@/lib/agentes/hub";
import { formatUSD } from "@/lib/utils/formatters";
import type { Agente, AgenteAnalisis, AgenteConfig, AgenteTipo } from "@/types/agentes";

export type AiHubAgenteConDetalle = Agente & {
  config: AgenteConfig;
  analyses: AgenteAnalisis[];
};

type AiHubAgentesClientProps = {
  agentes: AiHubAgenteConDetalle[];
  feed: AgentesHubFeedItem[];
};

function previewText(value: string, maxLength = 120) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function typeLabel(tipo: AgenteTipo) {
  switch (tipo) {
    case "analista":
      return "Analista";
    case "generador":
      return "Generador";
    case "ejecutor":
      return "Ejecutor";
    case "vigilante":
      return "Vigilante";
  }
}

function typeBadgeVariant(tipo: AgenteTipo) {
  switch (tipo) {
    case "analista":
      return "success" as const;
    case "generador":
      return "warning" as const;
    case "ejecutor":
      return "signal" as const;
    case "vigilante":
      return "danger" as const;
  }
}

function typeIcon(tipo: AgenteTipo) {
  switch (tipo) {
    case "analista":
      return <TrendingUpIcon className="h-4 w-4" />;
    case "generador":
      return <CheckCircleIcon className="h-4 w-4" />;
    case "ejecutor":
      return <BotIcon className="h-4 w-4" />;
    case "vigilante":
      return <AlertTriangleIcon className="h-4 w-4" />;
  }
}

function feedIcon(tipo: AgenteTipo) {
  switch (tipo) {
    case "analista":
      return <SparklesIcon className="h-4 w-4" />;
    case "generador":
      return <CheckCircleIcon className="h-4 w-4" />;
    case "ejecutor":
      return <BotIcon className="h-4 w-4" />;
    case "vigilante":
      return <BellIcon className="h-4 w-4" />;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function AiHubAgentesClient({ agentes, feed }: AiHubAgentesClientProps) {
  const [agentsState, setAgentsState] = useState(agentes);
  const [selectedSlug, setSelectedSlug] = useState(
    agentes.find((agente) => agente.slug === "asesor-financiero")?.slug ?? agentes[0]?.slug ?? ""
  );
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  });

  const selectedAgent = useMemo(
    () => agentsState.find((agente) => agente.slug === selectedSlug) ?? agentsState[0] ?? null,
    [agentsState, selectedSlug]
  );

  const feedBySlug = useMemo(() => {
    const grouped = new Map<string, AgentesHubFeedItem[]>();

    for (const item of feed) {
      const current = grouped.get(item.agente_slug) ?? [];
      current.push(item);
      grouped.set(item.agente_slug, current);
    }

    return grouped;
  }, [feed]);

  const latestActivityBySlug = useMemo(() => {
    const map = new Map<string, AgentesHubFeedItem>();

    for (const item of feed) {
      if (!map.has(item.agente_slug)) {
        map.set(item.agente_slug, item);
      }
    }

    return map;
  }, [feed]);

  const selectedRecentActivity = feedBySlug.get(selectedAgent?.slug ?? "") ?? [];

  useEffect(() => {
    setAgentsState(agentes);
  }, [agentes]);

  useEffect(() => {
    if (!selectedSlug && agentsState[0]?.slug) {
      setSelectedSlug(agentsState[0].slug);
    }
  }, [agentsState, selectedSlug]);

  function showToast(message: string, type: "success" | "info" | "warning" | "error" = "info") {
    setToast({ message, type, visible: true });
  }

  function hideToast() {
    setToast((current) => ({ ...current, visible: false }));
  }

  async function handleToggleActivo(agent: AiHubAgenteConDetalle) {
    const nextValue = !agent.activo;
    setTogglingSlug(agent.slug);

    try {
      const response = await fetch(`/api/agentes/${agent.slug}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ activo: nextValue })
      });

      const payload = (await response.json()) as { data?: { agente?: Agente }; error?: string };

      if (!response.ok || !payload.data?.agente) {
        throw new Error(payload.error ?? "No se pudo actualizar el estado del agente.");
      }

      const agenteActualizado = payload.data.agente;
      setAgentsState((current) =>
        current.map((item) =>
          item.slug === agent.slug
            ? {
                ...item,
                activo: agenteActualizado.activo ?? nextValue
              }
            : item
        )
      );
      showToast(`${agent.nombre} ${nextValue ? "activado" : "desactivado"}.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo actualizar el agente.", "error");
    } finally {
      setTogglingSlug(null);
    }
  }

  if (agentsState.length === 0) {
    return (
      <EmptyState
        icon={BotIcon}
        titulo="No hay agentes cargados"
        descripcion="Cuando se registre el primer agente, va a aparecer acá con su configuración."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-title text-2xl text-carbon">Agentes</h2>
            <p className="text-sm text-graphite">Una sola grilla para administrar los agentes reales del sistema.</p>
          </div>
          <Badge variant="signal">{agentsState.length} agentes</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {agentsState.map((agente) => {
            const latestActivity = latestActivityBySlug.get(agente.slug);
            const isSelected = agente.slug === selectedAgent?.slug;

            return (
              <Card
                key={agente.id}
                padding="md"
                onClick={() => setSelectedSlug(agente.slug)}
                className={[
                  "cursor-pointer border transition-colors duration-fast ease-fast",
                  isSelected ? "border-signal/30 bg-signal-light" : "border-line-soft bg-white hover:border-signal/25 hover:bg-paper/40"
                ].join(" ")}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-paper text-signal">
                        {typeIcon(agente.tipo)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-title text-lg text-carbon">{agente.nombre}</p>
                        <p className="text-sm text-graphite">
                          Última actividad: {latestActivity ? formatAgentesRelativeTime(latestActivity.fecha) : "sin actividad"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-start gap-2">
                      <Badge variant={typeBadgeVariant(agente.tipo)}>{typeLabel(agente.tipo)}</Badge>
                      <button
                        type="button"
                        disabled={togglingSlug === agente.slug}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleToggleActivo(agente);
                        }}
                        className={[
                          "inline-flex h-8 items-center gap-2 rounded-pill border px-3 text-xs font-label transition-colors duration-fast ease-fast",
                          agente.activo ? "border-success/20 bg-success-light text-success" : "border-line bg-paper text-graphite"
                        ].join(" ")}
                      >
                        <span>{agente.activo ? "Activo" : "Inactivo"}</span>
                        <span className={["relative h-4 w-7 rounded-full", agente.activo ? "bg-success" : "bg-line"].join(" ")}>
                          <span
                            className={[
                              "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-fast ease-fast",
                              agente.activo ? "right-0.5" : "left-0.5"
                            ].join(" ")}
                          />
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-graphite">
                    {previewText(agente.descripcion ?? getAgentesTipoResumen(agente.tipo))}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      <Card padding="lg" className="space-y-5">
        {selectedAgent ? (
          <>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-paper text-signal">
                  {typeIcon(selectedAgent.tipo)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-title text-2xl text-carbon">{selectedAgent.nombre}</h3>
                  <p className="mt-1 text-sm leading-6 text-graphite">
                    {selectedAgent.descripcion ?? getAgentesTipoResumen(selectedAgent.tipo)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant={typeBadgeVariant(selectedAgent.tipo)}>{typeLabel(selectedAgent.tipo)}</Badge>
                    <Badge variant={selectedAgent.activo ? "success" : "ghost"}>{selectedAgent.activo ? "Activo" : "Inactivo"}</Badge>
                    <Badge variant="signal">{selectedAgent.slug}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <ConfiguracionAgenteForm agenteId={selectedAgent.id} />

            <div className="space-y-3 border-t border-line-soft pt-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-title text-lg text-carbon">Actividad reciente</h4>
                  <p className="text-sm text-graphite">Últimos eventos asociados a este agente.</p>
                </div>
                <Badge variant="ghost">{selectedRecentActivity.length}</Badge>
              </div>

              {selectedRecentActivity.length === 0 ? (
                <EmptyState
                  icon={InboxIcon}
                  titulo="No hay actividad registrada todavía"
                  descripcion="Cuando este agente ejecute acciones, vas a verlas en este historial."
                  className="min-h-[140px]"
                />
              ) : (
                <div className="space-y-3">
                  {selectedRecentActivity.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-component border border-line-soft bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-paper text-signal">
                            {feedIcon(item.tipo)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-label text-carbon">{item.resumen}</p>
                            <p className="mt-1 text-xs text-graphite">
                              {formatAgentesRelativeTime(item.fecha)} · {formatDateTime(item.fecha)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {item.costo_usd != null ? <Badge variant="ghost">{formatUSD(item.costo_usd)}</Badge> : null}
                          {item.pr_url ? (
                            <a
                              href={item.pr_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-label text-signal transition-colors duration-fast ease-fast hover:text-carbon"
                            >
                              Ver PR
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </Card>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
