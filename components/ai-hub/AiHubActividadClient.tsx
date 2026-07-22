"use client";

import { useMemo, useState } from "react";
import { Badge, Card, EmptyState, Input } from "@/components/ui";
import {
  BellIcon,
  BotIcon,
  CheckCircleIcon,
  InboxIcon,
  SparklesIcon,
  FilterIcon
} from "@/components/ui/icons";
import { formatUSD } from "@/lib/utils/formatters";
import { formatAgentesRelativeTime, type AgentesHubFeedItem } from "@/lib/agentes/hub";
import type { AgenteTipo } from "@/types/agentes";

type AiHubActividadClientProps = {
  feed: AgentesHubFeedItem[];
  agentes: Array<{ slug: string; nombre: string; tipo: AgenteTipo }>;
  title?: string;
  description?: string;
};

const tipoOptions: Array<{ value: AgenteTipo; label: string }> = [
  { value: "analista", label: "Analista" },
  { value: "generador", label: "Generador" },
  { value: "ejecutor", label: "Ejecutor" },
  { value: "vigilante", label: "Vigilante" }
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
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

export function AiHubActividadClient({
  feed,
  agentes,
  title = "Actividad",
  description = "Cronología unificada de análisis, checklists y ejecuciones AI Dev."
}: AiHubActividadClientProps) {
  const [agentSlug, setAgentSlug] = useState("all");
  const [types, setTypes] = useState<AgenteTipo[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredFeed = useMemo(() => {
    return feed.filter((item) => {
      if (agentSlug !== "all" && item.agente_slug !== agentSlug) {
        return false;
      }

      if (types.length > 0 && !types.includes(item.tipo)) {
        return false;
      }

      const itemDate = new Date(item.fecha);
      if (fromDate) {
        const start = new Date(`${fromDate}T00:00:00`);
        if (itemDate < start) {
          return false;
        }
      }

      if (toDate) {
        const end = new Date(`${toDate}T23:59:59`);
        if (itemDate > end) {
          return false;
        }
      }

      return true;
    });
  }, [agentSlug, feed, fromDate, toDate, types]);

  function toggleType(tipo: AgenteTipo) {
    setTypes((current) => (current.includes(tipo) ? current.filter((item) => item !== tipo) : [...current, tipo]));
  }

  return (
    <div className="space-y-6">
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-title text-2xl text-carbon">{title}</h2>
            <p className="text-sm text-graphite">{description}</p>
          </div>
          <Badge variant="signal">{filteredFeed.length} eventos</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto_auto]">
          <label className="space-y-2">
            <span className="text-xs font-label text-graphite">Agente</span>
            <select
              value={agentSlug}
              onChange={(event) => setAgentSlug(event.target.value)}
              className="h-12 w-full rounded-component border border-line bg-white px-4 text-sm text-carbon outline-none transition-colors duration-fast ease-fast focus:border-signal focus:ring-2 focus:ring-signal/20"
            >
              <option value="all">Todos</option>
              {agentes.map((agente) => (
                <option key={agente.slug} value={agente.slug}>
                  {agente.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-xs font-label text-graphite">Tipo</span>
            <div className="flex flex-wrap gap-2">
              {tipoOptions.map((option) => {
                const active = types.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleType(option.value)}
                    className={[
                      "inline-flex h-12 items-center gap-2 rounded-pill border px-4 text-sm transition-colors duration-fast ease-fast",
                      active ? "border-signal bg-signal-light text-signal" : "border-line bg-paper text-graphite"
                    ].join(" ")}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-label text-graphite">Desde</span>
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-label text-graphite">Hasta</span>
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
        </div>
      </Card>

      {filteredFeed.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          titulo="No hay actividad para los filtros seleccionados"
          descripcion="Probá ajustar el agente, el tipo o el rango de fechas para ampliar la búsqueda."
        />
      ) : (
        <div className="space-y-3">
          {filteredFeed.map((item) => (
            <Card key={item.id} padding="md" className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-paper text-signal">
                    {feedIcon(item.tipo)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-label text-carbon">{item.agente}</p>
                    <p className="mt-1 text-sm text-graphite">{item.resumen}</p>
                    <p className="mt-2 text-xs text-graphite">
                      {formatAgentesRelativeTime(item.fecha)} · {formatDateTime(item.fecha)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-card border border-line-soft bg-white p-4 text-xs text-graphite">
        <div className="mb-2 flex items-center gap-2 text-carbon">
          <FilterIcon className="h-4 w-4" />
          Filtros activos
        </div>
        <p>
          {agentSlug === "all" ? "Todos los agentes" : agentes.find((agente) => agente.slug === agentSlug)?.nombre ?? "Agente"}
          {types.length > 0 ? ` · ${types.map((type) => tipoOptions.find((option) => option.value === type)?.label).filter(Boolean).join(", ")}` : ""}
          {fromDate ? ` · desde ${fromDate}` : ""}
          {toDate ? ` · hasta ${toDate}` : ""}
        </p>
      </div>
    </div>
  );
}
