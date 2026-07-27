"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Toast } from "@/components/ui";
import {
  AlertTriangleIcon,
  BellIcon,
  BotIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ClockIcon,
  LinkIcon,
  SparklesIcon,
  TrendingUpIcon,
  FileTextIcon
} from "@/components/ui/icons";
import { MetricaCard } from "@/components/finanzas/MetricaCard";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { formatUSD } from "@/lib/utils/formatters";
import {
  formatAgentesRelativeTime,
  getAgentesTipoBadgeVariant,
  getAgentesTipoSectionLabel,
  getAgentesTipoResumen,
  type AgentesHubCostoTotal,
  type AgentesHubFeedItem
} from "@/lib/agentes/hub";
import type { Agente, AgenteAnalisis, AgenteConfig, AgenteTipo } from "@/types/agentes";

export type AgenteConDetalle = Agente & {
  config: AgenteConfig;
  analyses: AgenteAnalisis[];
};

type AgentesClientProps = {
  agentes: AgenteConDetalle[];
  feed: AgentesHubFeedItem[];
  costoActualMes: AgentesHubCostoTotal;
};

type AnalisisDatos = {
  config?: {
    runway_objetivo_meses?: number;
  };
  metricas?: {
    mrr_actual_usd?: number;
  };
};

const tipoOrden: AgenteTipo[] = ["analista", "generador", "ejecutor", "vigilante"];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function previewText(value: string, maxLength = 140) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function relativeWeek(dateString: string, referenceDate = new Date()) {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) {
    return false;
  }

  const diff = referenceDate.getTime() - value.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
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

function sectionDescription(tipo: AgenteTipo) {
  return getAgentesTipoResumen(tipo);
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

export function AgentesClient({ agentes, feed, costoActualMes }: AgentesClientProps) {
  const [selectedSlug, setSelectedSlug] = useState(
    agentes.find((agente) => agente.slug === "asesor-financiero")?.slug ?? agentes[0]?.slug ?? ""
  );
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  });
  const [form, setForm] = useState<AgenteConfig>({
    runway_objetivo_meses: 6,
    resumen_automatico_activo: false,
    frecuencia_resumen: "mensual",
    generacion_automatica_activa: true,
    dia_generacion: "lunes"
  });

  const selectedAgent = useMemo(
    () => agentes.find((agente) => agente.slug === selectedSlug) ?? agentes[0] ?? null,
    [agentes, selectedSlug]
  );

  const feedByAgentSlug = useMemo(() => {
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

  const agentsByType = useMemo(() => {
    return tipoOrden
      .map((tipo) => ({
        tipo,
        agentes: agentes.filter((agente) => agente.tipo === tipo)
      }))
      .filter((group) => group.agentes.length > 0);
  }, [agentes]);

  const accionesSemana = useMemo(() => feed.filter((item) => relativeWeek(item.fecha)).length, [feed]);
  const feedVisible = feed.slice(0, 30);

  useEffect(() => {
    if (!selectedAgent) {
      return;
    }

    setForm(selectedAgent.config);
  }, [selectedAgent]);

  function showToast(message: string, type: "success" | "info" | "warning" | "error" = "info") {
    setToast({ message, type, visible: true });
  }

  function hideToast() {
    setToast((current) => ({ ...current, visible: false }));
  }

  async function handleSave() {
    if (!selectedAgent || selectedAgent.slug !== "asesor-financiero") {
      return;
    }

    setSaving(true);
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

      setForm(payload.data.config);
      showToast("Configuración actualizada.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar la configuración.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (agentes.length === 0) {
    return (
      <EmptyState icon={BotIcon} titulo="Sin agentes configurados" descripcion="Los agentes disponibles aparecerán aquí cuando estén listos." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-title text-3xl text-carbon">Centro de IA</h1>
        <p className="max-w-4xl text-sm text-graphite">
          Unificamos el trabajo de análisis, generación y automatización en un solo lugar para seguir actividad, costo y configuración.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricaCard
          label="Costo de IA (este mes)"
          value={costoActualMes.total_usd}
          icono={<SparklesIcon className="h-4 w-4" />}
          colorIcono="signal"
          description={
            costoActualMes.desglose.length > 0
              ? costoActualMes.desglose.map((item) => item.agente).join(" · ")
              : "Todavía no hubo consumo de IA este mes."
          }
        />
        <MetricaCard
          label="Acciones esta semana"
          value={`${accionesSemana} acciones`}
          icono={<ClockIcon className="h-4 w-4" />}
          colorIcono="graphite"
          description="Incluye análisis, checklist y ejecuciones AI Dev."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {agentsByType.map((section) => (
            <section key={section.tipo} className="rounded-card bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-title text-xl text-carbon">{getAgentesTipoSectionLabel(section.tipo)}</h2>
                  <p className="mt-1 text-sm text-graphite">{sectionDescription(section.tipo)}</p>
                </div>
                <Badge variant={getAgentesTipoBadgeVariant(section.tipo)}>{typeLabel(section.tipo)}</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {section.agentes.map((agente) => {
                  const isSelected = agente.slug === selectedAgent?.slug;
                  const isExpanded = expandedDescriptions[agente.id] ?? false;
                  const latestActivity = latestActivityBySlug.get(agente.slug);

                  return (
                    <Card
                      key={agente.id}
                      padding="md"
                      onClick={() => setSelectedSlug(agente.slug)}
                      className={[
                        "border transition-shadow",
                        isSelected ? "border-signal/30 bg-signal-light shadow-soft" : "border-line/40 shadow-soft hover:border-signal/20"
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-paper text-signal">
                              {typeIcon(agente.tipo)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-title text-lg text-carbon">{agente.nombre}</p>
                              <p className="text-sm text-graphite">
                                Última actividad: {latestActivity ? formatAgentesRelativeTime(latestActivity.fecha) : "sin actividad"}
                              </p>
                            </div>
                          </div>

                          {isExpanded ? <p className="text-sm leading-6 text-graphite">{agente.descripcion ?? sectionDescription(agente.tipo)}</p> : null}
                        </div>

                        <div className="flex shrink-0 items-start gap-2">
                          <Badge variant={agente.activo ? "success" : "ghost"}>{agente.activo ? "Activo" : "Inactivo"}</Badge>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedDescriptions((current) => ({
                                ...current,
                                [agente.id]: !current[agente.id]
                              }));
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-pill text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
                            aria-label={isExpanded ? "Ocultar descripción" : "Ver descripción"}
                            title={isExpanded ? "Ocultar descripción" : "Ver descripción"}
                          >
                            <ChevronDownIcon
                              className={["h-4 w-4 transition-transform duration-fast ease-fast", isExpanded ? "rotate-180" : "rotate-0"].join(" ")}
                            />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-6">
          {selectedAgent ? (
            <>
              <Card padding="lg" className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-paper text-signal">
                        {typeIcon(selectedAgent.tipo)}
                      </span>
                      <div>
                        <h1 className="font-title text-2xl text-carbon">{selectedAgent.nombre}</h1>
                        <p className="text-sm text-graphite">{selectedAgent.descripcion ?? "Agente disponible"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getAgentesTipoBadgeVariant(selectedAgent.tipo)}>{getAgentesTipoSectionLabel(selectedAgent.tipo)}</Badge>
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

                {selectedAgent.slug === "asesor-financiero" ? (
                  <>
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
                              form.resumen_automatico_activo ? "bg-success" : "bg-paper"
                            }`}
                          >
                            <span
                              className={`h-4 w-4 rounded-full bg-white transition-transform duration-fast ease-fast ${
                                form.resumen_automatico_activo ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
                        Guardar configuración
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-component bg-paper px-4 py-3">
                        <p className="text-xs font-label text-graphite">Tipo</p>
                        <p className="mt-1 font-title text-carbon">{typeLabel(selectedAgent.tipo)}</p>
                      </div>
                      <div className="rounded-component bg-paper px-4 py-3">
                        <p className="text-xs font-label text-graphite">Actividad reciente</p>
                        <p className="mt-1 font-title text-carbon">
                          {latestActivityBySlug.get(selectedAgent.slug)
                            ? formatAgentesRelativeTime(latestActivityBySlug.get(selectedAgent.slug)!.fecha)
                            : "Sin actividad"}
                        </p>
                      </div>
                      <div className="rounded-component bg-paper px-4 py-3">
                        <p className="text-xs font-label text-graphite">Estado</p>
                        <p className="mt-1 font-title text-carbon">{selectedAgent.activo ? "Activo" : "Inactivo"}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="font-title text-xl text-carbon">Actividad reciente</h2>
                        <Badge variant="default">{feedByAgentSlug.get(selectedAgent.slug)?.length ?? 0}</Badge>
                      </div>

                      {(feedByAgentSlug.get(selectedAgent.slug) ?? []).length === 0 ? (
                        <div className="rounded-card border border-dashed border-line bg-paper/40 p-5 text-sm text-graphite">
                          Este agente todavía no generó actividad registrada.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(feedByAgentSlug.get(selectedAgent.slug) ?? []).slice(0, 5).map((item) => (
                            <div key={item.id} className="rounded-card border border-line bg-white p-4 shadow-soft">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="font-label text-sm text-carbon">{formatDateTime(item.fecha)}</p>
                                  <p className="text-sm text-graphite">{item.resumen}</p>
                                </div>
                                <Badge variant={getAgentesTipoBadgeVariant(item.tipo)}>{typeLabel(item.tipo)}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              <Card padding="lg" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-title text-xl text-carbon">Últimos análisis</h2>
                    <p className="text-sm text-graphite">Historial compacto de los resultados generados para este agente.</p>
                  </div>
                  <Badge variant="default">{selectedAgent.analyses.length}</Badge>
                </div>

                {selectedAgent.analyses.length === 0 ? (
                  <EmptyState icon={FileTextIcon} titulo="Sin análisis guardados" descripcion="Los análisis de este agente aparecerán aquí." className="border-0 bg-transparent" />
                ) : (
                  <div className="space-y-3">
                    {selectedAgent.analyses.map((analisis) => {
                      const preview = previewText(analisis.analisis_texto);
                      const datos = analisis.datos_calculados as AnalisisDatos;

                      return (
                        <details key={analisis.id} className="rounded-card border border-line bg-white p-4 shadow-soft">
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-label text-sm text-carbon">{formatDateTime(analisis.created_at)}</p>
                                <p className="text-sm text-graphite">{preview}</p>
                              </div>
                              <Badge variant={analisis.tipo === "automatico" ? "signal" : "default"}>
                                {analisis.tipo === "automatico" ? "Automático" : "Bajo demanda"}
                              </Badge>
                            </div>
                          </summary>

                          <div className="mt-4 space-y-3 border-t border-line pt-4">
                            <MarkdownContent content={analisis.analisis_texto} className="space-y-3" />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-component bg-paper px-3 py-2 text-sm text-graphite">
                                Runway objetivo: {datos.config?.runway_objetivo_meses ?? 0} meses
                              </div>
                              <div className="rounded-component bg-paper px-3 py-2 text-sm text-graphite">
                                MRR: {formatUSD(datos.metricas?.mrr_actual_usd ?? 0)}
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          ) : null}
        </div>
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-title text-xl text-carbon">Actividad reciente</h2>
            <p className="text-sm text-graphite">Timeline unificado con todo lo que la IA produjo en el sistema.</p>
          </div>
          <Badge variant="signal">{feedVisible.length}</Badge>
        </div>

        {feedVisible.length === 0 ? (
          <EmptyState icon={BellIcon} titulo="Sin actividad registrada" descripcion="La actividad del agente aparecerá aquí." className="border-0 bg-transparent" />
        ) : (
          <div className="space-y-3">
            {feedVisible.map((item) => (
              <div key={item.id} className="rounded-card border border-line bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-paper text-signal">
                      {feedIcon(item.tipo)}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-title text-carbon">{item.agente}</p>
                        <Badge variant={getAgentesTipoBadgeVariant(item.tipo)}>{typeLabel(item.tipo)}</Badge>
                      </div>
                      <p className="text-sm text-graphite">{item.resumen}</p>
                      <p className="text-xs text-graphite">{formatAgentesRelativeTime(item.fecha)}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {item.costo_usd !== null ? <Badge variant="default">{formatUSD(item.costo_usd)}</Badge> : null}
                    {item.pr_url ? (
                      <a
                        href={item.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-pill border border-line px-3 py-1 text-xs font-label text-signal transition-colors duration-fast ease-fast hover:bg-paper"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        Ver PR
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
