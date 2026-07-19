"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Spinner, Toast } from "@/components/ui";
import {
  AlertTriangleIcon,
  BellIcon,
  BotIcon,
  CheckCircleIcon,
  SparklesIcon,
  TrendingUpIcon
} from "@/components/ui/icons";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { formatUSD } from "@/lib/utils/formatters";
import { formatAgentesRelativeTime, getAgentesTipoResumen, type AgentesHubFeedItem } from "@/lib/agentes/hub";
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<AgenteConfig>({
    runway_objetivo_meses: 6,
    resumen_automatico_activo: false,
    frecuencia_resumen: "mensual",
    generacion_automatica_activa: true,
    dia_generacion: "lunes"
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

  const selectedAnalisis = selectedAgent?.analyses ?? [];
  const selectedRecentActivity = feedBySlug.get(selectedAgent?.slug ?? "") ?? [];

  useEffect(() => {
    setAgentsState(agentes);
  }, [agentes]);

  useEffect(() => {
    if (!selectedAgent) {
      return;
    }

    setForm(selectedAgent.config);
  }, [selectedAgent]);

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

  async function handleSaveConfig() {
    if (!selectedAgent || !["asesor-financiero", "generador-contenido"].includes(selectedAgent.slug)) {
      return;
    }

    setSavingConfig(true);
    try {
      const response = await fetch(`/api/agentes/${selectedAgent.slug}/config`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = (await response.json()) as { data?: { config?: AgenteConfig }; error?: string };

      if (!response.ok || !payload.data?.config) {
        throw new Error(payload.error ?? "No se pudo guardar la configuración.");
      }

      const configActualizada = payload.data.config;

      setAgentsState((current) =>
        current.map((item) => (item.slug === selectedAgent.slug ? { ...item, config: configActualizada ?? form } : item))
      );
      setForm(configActualizada);
      showToast("Configuración actualizada.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar la configuración.", "error");
    } finally {
      setSavingConfig(false);
    }
  }

  if (agentsState.length === 0) {
    return (
      <Card padding="lg" className="flex items-center gap-3">
        <Spinner />
        <p className="text-sm text-graphite">No hay agentes cargados.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <Card padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-title text-2xl text-carbon">Agentes</h2>
              <p className="text-sm text-graphite">Una sola grilla para analizar y administrar cada agente del sistema.</p>
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
                    "cursor-pointer border transition-shadow",
                    isSelected ? "border-signal/30 bg-signal-light shadow-soft" : "border-line/40 shadow-soft hover:border-signal/20"
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
                            agente.activo
                              ? "border-success/20 bg-success-light text-success"
                              : "border-line bg-paper text-graphite"
                          ].join(" ")}
                        >
                          <span>{agente.activo ? "Activo" : "Inactivo"}</span>
                          <span
                            className={[
                              "relative h-4 w-7 rounded-full transition-colors duration-fast ease-fast",
                              agente.activo ? "bg-success" : "bg-line"
                            ].join(" ")}
                          >
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
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-paper text-signal">
                        {typeIcon(selectedAgent.tipo)}
                      </span>
                      <div>
                        <h3 className="font-title text-2xl text-carbon">{selectedAgent.nombre}</h3>
                        <p className="text-sm text-graphite">{selectedAgent.descripcion ?? getAgentesTipoResumen(selectedAgent.tipo)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={typeBadgeVariant(selectedAgent.tipo)}>{typeLabel(selectedAgent.tipo)}</Badge>
                      <Badge variant={selectedAgent.activo ? "success" : "ghost"}>{selectedAgent.activo ? "Activo" : "Inactivo"}</Badge>
                      <Badge variant="signal">{selectedAgent.slug}</Badge>
                    </div>
                  </div>

                  {latestActivityBySlug.get(selectedAgent.slug) ? (
                    <div className="rounded-component bg-paper px-3 py-2 text-sm text-graphite">
                      Última actividad: {formatAgentesRelativeTime(latestActivityBySlug.get(selectedAgent.slug)!.fecha)}
                    </div>
                  ) : null}
                </div>
              </div>

              {selectedAgent.slug === "asesor-financiero" ? (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-label text-carbon">Runway objetivo</span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={String(form.runway_objetivo_meses)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            runway_objetivo_meses: Number(event.target.value || 0)
                          }))
                        }
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-label text-carbon">Frecuencia del resumen</span>
                      <select
                        value={form.frecuencia_resumen}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            frecuencia_resumen: event.target.value
                          }))
                        }
                        className="h-12 w-full rounded-component border border-line bg-white px-4 text-sm text-carbon outline-none transition-colors duration-fast ease-fast focus:border-signal focus:ring-2 focus:ring-signal/20"
                      >
                        <option value="mensual">Mensual</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="semanal">Semanal</option>
                      </select>
                    </label>

                    <div className="space-y-2">
                      <span className="text-sm font-label text-carbon">Resumen automático</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            resumen_automatico_activo: !current.resumen_automatico_activo
                          }))
                        }
                        className={`flex h-12 w-full items-center justify-between rounded-component border px-4 text-sm transition-colors duration-fast ease-fast ${
                          form.resumen_automatico_activo
                            ? "border-success bg-success-light text-success"
                            : "border-line bg-white text-graphite"
                        }`}
                      >
                        <span>{form.resumen_automatico_activo ? "Activo" : "Inactivo"}</span>
                        <span
                          className={`flex h-6 w-11 items-center rounded-full px-1 transition-colors duration-fast ease-fast ${
                            form.resumen_automatico_activo ? "bg-success" : "bg-line"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-fast ease-fast ${
                              form.resumen_automatico_activo ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="primary" onClick={() => void handleSaveConfig()} loading={savingConfig}>
                      Guardar configuración
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-card border border-line-soft bg-paper/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-title text-lg text-carbon">Últimos análisis</h4>
                        <p className="text-sm text-graphite">Historial compacto de resultados del asesor.</p>
                      </div>
                      <Badge variant="ghost">{selectedAnalisis.length}</Badge>
                    </div>

                    {selectedAnalisis.length === 0 ? (
                      <div className="rounded-component border border-dashed border-line bg-white p-4 text-sm text-graphite">
                        Todavía no hay análisis guardados para este agente.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedAnalisis.slice(0, 3).map((analisis) => (
                          <div key={analisis.id} className="rounded-component border border-line-soft bg-white p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-label text-carbon">{formatDateTime(analisis.created_at)}</p>
                                <p className="mt-1 text-sm text-graphite">{previewText(analisis.analisis_texto, 180)}</p>
                              </div>
                              <Badge variant={analisis.tipo === "automatico" ? "signal" : "default"}>
                                {analisis.tipo === "automatico" ? "Automático" : "Bajo demanda"}
                              </Badge>
                            </div>
                            <div className="mt-3 rounded-component bg-paper p-3">
                              <MarkdownContent content={analisis.analisis_texto} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedAgent.slug === "generador-contenido" ? (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-sm font-label text-carbon">Generación automática semanal activa</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            generacion_automatica_activa: !current.generacion_automatica_activa
                          }))
                        }
                        className={`flex h-12 w-full items-center justify-between rounded-component border px-4 text-sm transition-colors duration-fast ease-fast ${
                          form.generacion_automatica_activa
                            ? "border-success bg-success-light text-success"
                            : "border-line bg-white text-graphite"
                        }`}
                      >
                        <span>{form.generacion_automatica_activa ? "Activa" : "Pausada"}</span>
                        <span
                          className={`flex h-6 w-11 items-center rounded-full px-1 transition-colors duration-fast ease-fast ${
                            form.generacion_automatica_activa ? "bg-success" : "bg-line"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-fast ease-fast ${
                              form.generacion_automatica_activa ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    <label className="space-y-2">
                      <span className="text-sm font-label text-carbon">Día de generación</span>
                      <select
                        value={form.dia_generacion}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            dia_generacion: event.target.value
                          }))
                        }
                        className="h-12 w-full rounded-component border border-line bg-white px-4 text-sm text-carbon outline-none transition-colors duration-fast ease-fast focus:border-signal focus:ring-2 focus:ring-signal/20"
                      >
                        <option value="lunes">Lunes</option>
                        <option value="martes">Martes</option>
                        <option value="miercoles">Miércoles</option>
                        <option value="jueves">Jueves</option>
                        <option value="viernes">Viernes</option>
                      </select>
                    </label>
                  </div>

                  <div className="rounded-card border border-line-soft bg-paper/40 p-4">
                    <p className="text-sm leading-6 text-graphite">
                      El cron real sigue fijo los lunes por la mañana. Este campo queda guardado para poder volverlo configurable sin tocar
                      esquema ni rediseñar el panel cuando decidamos mover el día desde UI.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="primary" onClick={() => void handleSaveConfig()} loading={savingConfig}>
                      Guardar configuración
                    </Button>
                  </div>

                  <div className="space-y-3 rounded-card border border-line-soft bg-paper/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-title text-lg text-carbon">Planes recientes</h4>
                        <p className="text-sm text-graphite">Últimas ejecuciones automáticas y generaciones visuales del agente.</p>
                      </div>
                      <Badge variant="ghost">{selectedRecentActivity.length}</Badge>
                    </div>

                    {selectedRecentActivity.length === 0 ? (
                      <div className="rounded-component border border-dashed border-line bg-white p-4 text-sm text-graphite">
                        No hay actividad registrada todavía.
                      </div>
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

                              {item.costo_usd != null ? <Badge variant="ghost">{formatUSD(item.costo_usd)}</Badge> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-card border border-line-soft bg-paper/40 p-4">
                    <p className="text-sm leading-6 text-graphite">{selectedAgent.descripcion ?? getAgentesTipoResumen(selectedAgent.tipo)}</p>
                  </div>

                  <div className="space-y-3 rounded-card border border-line-soft bg-paper/40 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-title text-lg text-carbon">Actividad reciente</h4>
                        <p className="text-sm text-graphite">Últimos eventos asociados a este agente.</p>
                      </div>
                      <Badge variant="ghost">{selectedRecentActivity.length}</Badge>
                    </div>

                    {selectedRecentActivity.length === 0 ? (
                      <div className="rounded-component border border-dashed border-line bg-white p-4 text-sm text-graphite">
                        No hay actividad registrada todavía.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedRecentActivity.slice(0, 5).map((item) => (
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
                </div>
              )}
            </>
          ) : null}
        </Card>
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
