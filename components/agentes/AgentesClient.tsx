"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Spinner, Toast } from "@/components/ui";
import { AgentesIcon } from "@/components/icons";
import { formatUSD } from "@/lib/utils/formatters";
import type { Agente, AgenteAnalisis, AgenteConfig } from "@/types/agentes";

export type AgenteConDetalle = Agente & {
  config: AgenteConfig;
  analyses: AgenteAnalisis[];
};

type AnalisisDatos = {
  config?: {
    runway_objetivo_meses?: number;
  };
  metricas?: {
    mrr_actual_usd?: number;
  };
};

type AgentesClientProps = {
  agentes: AgenteConDetalle[];
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function analysisPreview(value: string) {
  return value
    .trim()
    .split(/\n\s*\n/)
    .find(Boolean)
    ?.trim()
    .slice(0, 180);
}

export function AgentesClient({ agentes }: AgentesClientProps) {
  const [selectedSlug, setSelectedSlug] = useState(agentes[0]?.slug ?? "");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const selectedAgent = useMemo(
    () => agentes.find((agente) => agente.slug === selectedSlug) ?? agentes[0] ?? null,
    [agentes, selectedSlug]
  );

  const [form, setForm] = useState<AgenteConfig>({
    runway_objetivo_meses: 6,
    resumen_automatico_activo: false,
    frecuencia_resumen: "mensual"
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  });

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

  function toggleDescription(id: string) {
    setExpandedDescriptions((current) => ({
      ...current,
      [id]: !current[id]
    }));
  }

  async function handleSave() {
    if (!selectedAgent) {
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
      <Card padding="lg" className="flex items-center gap-3">
        <Spinner />
        <p className="text-sm text-graphite">No hay agentes cargados.</p>
      </Card>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-6">
      <div className="flex w-80 flex-shrink-0 flex-col gap-3">
        {agentes.map((agente) => {
          const isSelected = agente.slug === selectedAgent?.slug;
          const isExpanded = expandedDescriptions[agente.id] ?? false;

          return (
            <Card
              key={agente.id}
              padding="md"
              onClick={() => setSelectedSlug(agente.slug)}
              className={
                isSelected
                  ? "border border-signal/20 bg-signal-light shadow-soft"
                  : "border border-transparent shadow-soft hover:border-line"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-paper text-signal">
                      <AgentesIcon />
                    </span>
                    <p className="truncate font-title text-base text-carbon">{agente.nombre}</p>
                  </div>
                  {isExpanded ? <p className="text-sm leading-6 text-graphite">{agente.descripcion ?? "Agente disponible"}</p> : null}
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <Badge variant={agente.activo ? "success" : "ghost"}>{agente.activo ? "Activo" : "Inactivo"}</Badge>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleDescription(agente.id);
                    }}
                    className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-pill text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
                    aria-label={isExpanded ? "Ocultar descripción" : "Ver descripción"}
                    title={isExpanded ? "Ocultar descripción" : "Ver descripción"}
                  >
                    <svg
                      viewBox="0 0 18 18"
                      fill="none"
                      aria-hidden="true"
                      className={["h-4 w-4 transition-transform duration-fast ease-fast", isExpanded ? "rotate-180" : "rotate-0"].join(" ")}
                    >
                      <path
                        d="M4.5 6.75L9 11.25L13.5 6.75"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {selectedAgent ? (
          <>
            <Card padding="lg" className="space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="font-title text-2xl text-carbon">{selectedAgent.nombre}</h1>
                    <p className="text-sm text-graphite">{selectedAgent.descripcion ?? "Configuración del agente"}</p>
                  </div>
                  <Badge variant="signal">{selectedAgent.slug}</Badge>
                </div>
              </div>

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
                <div className="rounded-card border border-dashed border-line bg-paper/40 p-6 text-sm text-graphite">
                  Todavía no hay análisis guardados para este agente.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedAgent.analyses.map((analisis) => {
                    const preview = analysisPreview(analisis.analisis_texto) ?? analisis.analisis_texto.slice(0, 180);
                    const datos = analisis.datos_calculados as AnalisisDatos;

                    return (
                      <details
                        key={analisis.id}
                        className="rounded-card border border-line bg-white p-4 shadow-soft"
                      >
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
                          <p className="whitespace-pre-line text-sm leading-6 text-carbon">{analisis.analisis_texto}</p>
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

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
