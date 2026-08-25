"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SystemIdentity, SystemLogo } from "@/components/software/SystemIdentity";
import { Badge, Button, Card, EmptyState, PageSkeleton, Toolbar } from "@/components/ui";
import {
  BotIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  GlobeIcon,
  LayersIcon,
  RefreshIcon,
  ServerIcon,
  WrenchIcon
} from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { formatearFechaDisplay } from "@/lib/utils/fechas";
import type { SistemaDeploy, SistemaHealthCheck, SistemaIncidente } from "@/types/sistemas";
import type { TechAction, TechGuard, TechIntegration } from "@/types/techOps";

type FleetKpis = {
  sistemas_totales: number;
  sistemas_saludables: number;
  sistemas_degradados: number;
  sistemas_caidos: number;
  sistemas_sin_datos: number;
  errores_24h: number;
  incidentes_abiertos: number;
  p0_p1_abiertos: number;
  deploys_24h: number;
  change_failure_rate_30d: number | null;
  mttr_minutos_30d: number | null;
  latencia_p95_ms: number | null;
  integraciones_conectadas: number;
  integraciones_totales: number;
  ultima_guardia_estado: string | null;
  ultima_guardia_at: string | null;
};

type SystemSummary = {
  id: string;
  nombre: string;
  url_produccion: string | null;
  repositorio_github: string | null;
  vercel_project_id: string | null;
  estado_operativo: "ok" | "degradado" | "caido" | "sin_datos";
  ultimo_check: SistemaHealthCheck | null;
  ultimo_evento_at: string | null;
  errores_24h: number;
  incidentes_abiertos: number;
  p0_p1_abiertos: number;
  latencia_p95_ms: number | null;
  disponibilidad_30d: number | null;
  ultimo_deploy: SistemaDeploy | null;
  deploys_30d: number;
  deploys_fallidos_30d: number;
  integraciones_conectadas: number;
  integraciones_totales: number;
  ultima_accion: TechAction | null;
  ultima_guardia: TechGuard | null;
};

type OpsIncident = SistemaIncidente & { sistema_nombre: string };
type ProviderSummary = { proveedor: string; total: number; conectadas: number; con_error: number };
type OpsAction = TechAction & { sistema_nombre: string };
type TimelineItem = {
  id: string;
  clase: "evento" | "accion" | "deploy" | "guardia";
  sistema_id: string | null;
  sistema_nombre: string;
  estado: string;
  titulo: string;
  detalle: string;
  fecha: string;
  url: string | null;
};
type OpsData = {
  generated_at: string;
  kpis: FleetKpis;
  sistemas: SystemSummary[];
  incidentes: OpsIncident[];
  incidentes_recientes: OpsIncident[];
  integraciones: ProviderSummary[];
  integraciones_detalle: TechIntegration[];
  guardias: TechGuard[];
  acciones: OpsAction[];
  timeline: TimelineItem[];
};

type View = "radar" | "incidentes" | "guardias" | "cobertura";
type ResolutionStage = "detectado" | "diagnostico" | "preparado" | "verificado" | "resuelto" | "bloqueado";
type WorkItem = {
  id: string;
  systemId: string | null;
  systemName: string;
  stage: ResolutionStage;
  title: string;
  detail: string | null;
  severity: string | null;
  date: string;
  occurrences: number | null;
  url: string | null;
  kind: "incidente" | "accion";
};

const VIEWS: Array<{ id: View; label: string }> = [
  { id: "radar", label: "Radar" },
  { id: "incidentes", label: "Errores" },
  { id: "guardias", label: "Codex" },
  { id: "cobertura", label: "Cobertura" }
];

const KANBAN_STAGES: Array<{ id: ResolutionStage; label: string; hint: string; accent: string }> = [
  { id: "detectado", label: "Detectados", hint: "Esperan diagnóstico", accent: "bg-danger" },
  { id: "diagnostico", label: "En diagnóstico", hint: "Causa en análisis", accent: "bg-warning" },
  { id: "preparado", label: "Fix preparado", hint: "Cambio listo", accent: "bg-signal" },
  { id: "verificado", label: "Verificados", hint: "Pruebas correctas", accent: "bg-sky-500" },
  { id: "resuelto", label: "Resueltos", hint: "Producción estable", accent: "bg-success" },
  { id: "bloqueado", label: "Bloqueados", hint: "Requieren decisión", accent: "bg-carbon" }
];

function statusMeta(status: SystemSummary["estado_operativo"]) {
  if (status === "ok") return { label: "Operativo", variant: "success" as const, dot: "bg-success" };
  if (status === "degradado") return { label: "Degradado", variant: "warning" as const, dot: "bg-warning" };
  if (status === "caido") return { label: "Caído", variant: "danger" as const, dot: "bg-danger" };
  return { label: "Sin datos", variant: "default" as const, dot: "bg-slate-400" };
}

function stateVariant(value: string) {
  if (["ok", "saludable", "verificada", "desplegada", "READY", "info", "resuelto"].includes(value)) return "success" as const;
  if (["error", "fatal", "fallida", "caido", "ERROR", "bloqueada", "revertida"].includes(value)) return "danger" as const;
  if (["warning", "hallazgos", "degradado", "diagnosticando", "ejecutando", "preparada"].includes(value)) return "warning" as const;
  return "default" as const;
}

function stageForAction(status: TechAction["estado"]): ResolutionStage {
  if (status === "diagnosticando") return "diagnostico";
  if (status === "preparada") return "preparado";
  if (status === "verificada") return "verificado";
  if (status === "desplegada") return "resuelto";
  if (status === "bloqueada" || status === "fallida" || status === "revertida") return "bloqueado";
  return "detectado";
}

function relativeTime(value: string | null | undefined) {
  if (!value) return "Sin registro";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 1440) return `Hace ${Math.round(minutes / 60)} h`;
  return `Hace ${Math.round(minutes / 1440)} d`;
}

export function SoftwarePage() {
  const [ops, setOps] = useState<OpsData | null>(null);
  const [view, setView] = useState<View>("radar");
  const [selectedSystemId, setSelectedSystemId] = useState<string>("todo");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/sistemas/operaciones", { cache: "no-store" });
      const payload = await response.json() as { data?: OpsData; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo cargar la operación técnica.");
      setOps(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el control técnico.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const interval = window.setInterval(() => void load(), 30_000);
    const client = createClient();
    const channel = client.channel("control-tecnico-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sistemas_guardias" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sistemas_acciones_tecnicas" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sistemas_eventos_tecnicos" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sistemas_incidentes" }, () => void load())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { window.clearInterval(interval); void client.removeChannel(channel); };
  }, [load]);

  const scopedSystemIds = useMemo(() => new Set(selectedSystemId === "todo" ? (ops?.sistemas ?? []).map((system) => system.id) : [selectedSystemId]), [ops, selectedSystemId]);
  const scopedSystems = useMemo(() => (ops?.sistemas ?? []).filter((system) => scopedSystemIds.has(system.id)), [ops, scopedSystemIds]);
  const scopedActions = useMemo(() => (ops?.acciones ?? []).filter((action) => !action.sistema_id || scopedSystemIds.has(action.sistema_id)), [ops, scopedSystemIds]);
  const scopedIncidents = useMemo(() => (ops?.incidentes_recientes ?? ops?.incidentes ?? []).filter((incident) => scopedSystemIds.has(incident.sistema_id)), [ops, scopedSystemIds]);
  const scopedTimeline = useMemo(() => (ops?.timeline ?? []).filter((item) => !item.sistema_id || scopedSystemIds.has(item.sistema_id)), [ops, scopedSystemIds]);

  const workItems = useMemo<WorkItem[]>(() => {
    const linkedActions = new Map<string, OpsAction[]>();
    for (const action of scopedActions) {
      if (!action.incidente_id) continue;
      linkedActions.set(action.incidente_id, [...(linkedActions.get(action.incidente_id) ?? []), action]);
    }
    const incidentItems = scopedIncidents.map((incident) => {
      const latestAction = (linkedActions.get(incident.id) ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      return {
        id: `incident-${incident.id}`,
        systemId: incident.sistema_id,
        systemName: incident.sistema_nombre,
        stage: incident.resuelto ? "resuelto" as const : latestAction ? stageForAction(latestAction.estado) : "detectado" as const,
        title: incident.titulo,
        detail: incident.detalle,
        severity: incident.severidad,
        date: incident.ultima_ocurrencia_at ?? incident.created_at,
        occurrences: incident.ocurrencias ?? 1,
        url: incident.external_url ?? null,
        kind: "incidente" as const
      };
    });
    const actionItems = scopedActions.filter((action) => !action.incidente_id).map((action) => ({
      id: `action-${action.id}`,
      systemId: action.sistema_id,
      systemName: action.sistema_nombre,
      stage: stageForAction(action.estado),
      title: action.titulo,
      detail: action.detalle,
      severity: null,
      date: action.created_at,
      occurrences: null,
      url: action.external_url,
      kind: "accion" as const
    }));
    return [...incidentItems, ...actionItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [scopedActions, scopedIncidents]);

  const stageCounts = useMemo(() => workItems.reduce<Record<ResolutionStage, number>>((counts, item) => {
    counts[item.stage] += 1;
    return counts;
  }, { detectado: 0, diagnostico: 0, preparado: 0, verificado: 0, resuelto: 0, bloqueado: 0 }), [workItems]);

  if (loading) return <PageSkeleton rows={7} kpis={5} />;
  if (error && !ops) return <EmptyState icon={ServerIcon} titulo="No se pudo cargar el control técnico" descripcion={error} accion={{ label: "Reintentar", onClick: () => void load(true) }} />;
  if (!ops) return null;

  const healthy = scopedSystems.filter((system) => system.estado_operativo === "ok").length;
  const down = scopedSystems.filter((system) => system.estado_operativo === "caido").length;
  const degraded = scopedSystems.filter((system) => system.estado_operativo === "degradado").length;
  const errors24h = scopedSystems.reduce((sum, system) => sum + system.errores_24h, 0);
  const openIncidents = scopedIncidents.filter((incident) => !incident.resuelto);
  const urgentCount = openIncidents.filter((incident) => incident.severidad === "alta" || incident.severidad === "critica").length;
  const coverageTotal = scopedSystems.reduce((sum, system) => sum + system.integraciones_totales, 0);
  const coverageConnected = scopedSystems.reduce((sum, system) => sum + system.integraciones_conectadas, 0);
  const coverage = coverageTotal ? Math.round((coverageConnected / coverageTotal) * 100) : 0;
  const needsAttention = down > 0 || urgentCount > 0 || stageCounts.bloqueado > 0;

  function openErrorBoard() {
    setView("incidentes");
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-card border border-line-soft bg-carbon text-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`relative flex h-2.5 w-2.5 shrink-0 rounded-full ${live ? "bg-emerald-400" : "bg-amber-400"}`}>{live ? <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300 opacity-50" /> : null}</span>
            <div className="min-w-0">
              <p className="text-sm font-label">{needsAttention ? "Guardia activa · requiere atención" : "Guardia activa · operación estable"}</p>
              <p className="truncate text-xs text-white/55">Actualizado {relativeTime(ops.generated_at)} · refresco automático cada 30 s</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex">{ops.sistemas.map((system) => <SystemLogo key={system.id} name={system.nombre} size="xs" />)}</div>
            <Button variant="secondary" size="sm" disabled={refreshing} onClick={() => void load()}><RefreshIcon className={refreshing ? "animate-spin" : ""} size={15} />Actualizar</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4">
          <HeroMetric label="Sistemas operativos" value={`${healthy}/${scopedSystems.length}`} hint={`${degraded} degradados · ${down} caídos`} />
          <HeroMetric label="Errores 24 h" value={String(errors24h)} hint="Agrupados por causa" danger={errors24h > 0} />
          <HeroMetric label="P0 / P1 abiertos" value={String(urgentCount)} hint={`${openIncidents.length} incidentes activos`} danger={urgentCount > 0} />
          <HeroMetric label="Cobertura" value={`${coverage}%`} hint={`${coverageConnected}/${coverageTotal} conectores`} />
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-card border border-line-soft bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-1 overflow-x-auto pb-1 lg:pb-0">
          <button type="button" onClick={() => setSelectedSystemId("todo")} className={`flex h-9 shrink-0 items-center gap-2 rounded-pill border px-3 text-xs font-label transition-colors ${selectedSystemId === "todo" ? "border-carbon bg-carbon text-white" : "border-line-soft bg-paper text-graphite hover:border-line"}`}><LayersIcon size={14} />Toda la flota</button>
          {ops.sistemas.map((system) => <button key={system.id} type="button" onClick={() => setSelectedSystemId(system.id)} className={`flex h-9 shrink-0 items-center gap-2 rounded-pill border px-2.5 pr-3 text-xs font-label transition-colors ${selectedSystemId === system.id ? "border-signal bg-signal-light text-signal" : "border-line-soft bg-white text-graphite hover:border-line"}`}><SystemLogo name={system.nombre} size="xs" /><span>{system.nombre}</span><span className={`h-1.5 w-1.5 rounded-full ${statusMeta(system.estado_operativo).dot}`} /></button>)}
        </div>
        <nav className="grid shrink-0 grid-cols-4 rounded-component bg-paper p-1" aria-label="Vistas de control técnico">
          {VIEWS.map((item) => <button key={item.id} type="button" onClick={() => setView(item.id)} className={`rounded-component px-3 py-1.5 text-xs font-label transition-colors ${view === item.id ? "bg-white text-carbon shadow-sm" : "text-graphite hover:text-carbon"}`}>{item.label}</button>)}
        </nav>
      </div>

      {view === "radar" ? <RadarView ops={ops} systems={scopedSystems} incidents={openIncidents} actions={scopedActions} timeline={scopedTimeline} items={workItems} counts={stageCounts} onOpenIncidents={openErrorBoard} onOpenGuards={() => setView("guardias")} /> : null}
      {view === "incidentes" ? <ErrorsView items={workItems} counts={stageCounts} /> : null}
      {view === "guardias" ? <CodexView guards={ops.guardias} actions={scopedActions} /> : null}
      {view === "cobertura" ? <CoverageView systems={scopedSystems} integrations={ops.integraciones_detalle.filter((integration) => scopedSystemIds.has(integration.sistema_id))} search={search} onSearch={setSearch} /> : null}
    </div>
  );
}

function HeroMetric({ label, value, hint, danger = false }: { label: string; value: string; hint: string; danger?: boolean }) {
  return <div className="border-r border-t border-white/10 px-4 py-3.5 last:border-r-0 sm:border-t-0 sm:px-5"><p className="text-[11px] text-white/55">{label}</p><p className={`mt-1 text-2xl font-title ${danger ? "text-amber-300" : "text-white"}`}>{value}</p><p className="mt-0.5 text-[11px] text-white/45">{hint}</p></div>;
}

function RadarView({ ops, systems, incidents, actions, timeline, items, counts, onOpenIncidents, onOpenGuards }: { ops: OpsData; systems: SystemSummary[]; incidents: OpsIncident[]; actions: OpsAction[]; timeline: TimelineItem[]; items: WorkItem[]; counts: Record<ResolutionStage, number>; onOpenIncidents: () => void; onOpenGuards: () => void }) {
  const blockers = actions.filter((action) => action.estado === "bloqueada");
  const attention = [
    ...incidents.filter((incident) => incident.severidad === "critica" || incident.severidad === "alta").map((incident) => ({ id: `incident-${incident.id}`, systemName: incident.sistema_nombre, title: incident.titulo, detail: `${incident.ocurrencias ?? 1} ocurrencias`, date: incident.ultima_ocurrencia_at ?? incident.created_at, url: incident.external_url ?? null })),
    ...blockers.map((action) => ({ id: `action-${action.id}`, systemName: action.sistema_nombre, title: action.titulo, detail: action.detalle ?? "Requiere una decisión", date: action.created_at, url: action.external_url }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const latestGuard = ops.guardias[0];

  return <div className="space-y-4">
    <ErrorKanban items={items} counts={counts} compact onOpenBoard={onOpenIncidents} />

    <div className="grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line-soft px-4 py-3"><div><p className="font-label text-carbon">Atención ahora</p><p className="text-xs text-graphite">Sólo bloqueos y prioridades altas.</p></div><button type="button" onClick={onOpenIncidents} className="flex items-center gap-1 text-xs font-label text-signal">Ver todos<ChevronRightIcon size={14} /></button></div>
        {attention.length ? <div className="divide-y divide-line-soft">{attention.map((item) => <AttentionRow key={item.id} {...item} />)}</div> : <div className="p-4"><EmptyState icon={CheckCircleIcon} titulo="Nada urgente" descripcion="No hay bloqueos ni incidentes de prioridad alta." /></div>}
      </Card>
      <Card padding="sm" className="border-signal/15 bg-signal-light/35">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-component bg-signal text-white"><BotIcon size={17} /></span><div><p className="font-label text-carbon">Última guardia Codex</p><p className="text-xs text-graphite">{latestGuard ? relativeTime(latestGuard.iniciada_at) : "Sin ejecuciones"}</p></div></div>{latestGuard ? <Badge variant={stateVariant(latestGuard.estado)}>{latestGuard.estado}</Badge> : null}</div>
        {latestGuard ? <><p className="mt-4 line-clamp-4 text-sm leading-relaxed text-carbon">{latestGuard.resumen ?? "Guardia completada sin resumen."}</p><div className="mt-4 grid grid-cols-3 gap-2"><MiniMetric label="Sistemas" value={String(latestGuard.sistemas_revisados)} /><MiniMetric label="Hallazgos" value={String(latestGuard.incidentes_detectados)} danger={latestGuard.incidentes_detectados > 0} /><MiniMetric label="Acciones" value={String(latestGuard.acciones_ejecutadas)} /></div><button type="button" onClick={onOpenGuards} className="mt-4 flex items-center gap-1 text-xs font-label text-signal">Abrir registro completo<ChevronRightIcon size={14} /></button></> : <p className="mt-4 text-sm text-graphite">La próxima ejecución aparecerá acá.</p>}
      </Card>
    </div>

    <section className="space-y-2.5">
      <div className="flex items-center justify-between"><div><p className="font-label text-carbon">Flota</p><p className="text-xs text-graphite">Una lectura rápida por sistema.</p></div><Badge variant={systems.every((system) => system.estado_operativo === "ok") ? "success" : "warning"}>{systems.length} sistemas</Badge></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{systems.map((system) => <SystemCard key={system.id} system={system} />)}</div>
    </section>

    <ActivityFeed items={timeline.slice(0, 7)} />
  </div>;
}

function ErrorKanban({ items, counts, compact = false, onOpenBoard }: { items: WorkItem[]; counts: Record<ResolutionStage, number>; compact?: boolean; onOpenBoard?: () => void }) {
  return <section className="rounded-card border border-line-soft bg-white p-3 sm:p-4">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="font-label text-carbon">Funnel de errores</p><p className="text-xs text-graphite">Cada caso avanza como una tarjeta hasta quedar estable en producción.</p></div><div className="flex items-center gap-2">{counts.bloqueado ? <Badge variant="danger">{counts.bloqueado} bloqueados</Badge> : <Badge variant="success">Sin bloqueos</Badge>}{compact && onOpenBoard ? <button type="button" onClick={onOpenBoard} className="flex items-center gap-1 text-xs font-label text-signal">Abrir tablero<ChevronRightIcon size={14} /></button> : null}</div></div>
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[1520px] grid-cols-6 gap-3">
        {KANBAN_STAGES.map((stage) => {
          const stageItems = items.filter((item) => item.stage === stage.id);
          const visibleItems = compact ? stageItems.slice(0, 3) : stageItems.slice(0, 40);
          return <div key={stage.id} className={`flex flex-col rounded-card border border-line-soft bg-paper/70 p-3 ${compact ? "min-h-[220px]" : "min-h-[560px]"}`}>
            <div className="mb-3 flex items-start justify-between gap-2"><div className="flex min-w-0 items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${stage.accent}`} /><div className="min-w-0"><p className="truncate text-sm font-label text-carbon">{stage.label}</p><p className="truncate text-[10px] text-graphite">{stage.hint}</p></div></div><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-label text-carbon shadow-sm">{counts[stage.id]}</span></div>
            <div className="flex-1 space-y-2">{visibleItems.length ? visibleItems.map((item) => <KanbanErrorCard key={item.id} item={item} />) : <div className="rounded-md border border-dashed border-line bg-white/50 p-4 text-center text-xs text-graphite">Sin casos</div>}{compact && stageItems.length > visibleItems.length ? <button type="button" onClick={onOpenBoard} className="w-full py-1 text-center text-[11px] font-label text-signal">+{stageItems.length - visibleItems.length} casos más</button> : null}</div>
          </div>;
        })}
      </div>
    </div>
  </section>;
}

function AttentionRow({ systemName, title, detail, date, url }: { systemName: string; title: string; detail: string; date: string; url: string | null }) {
  const content = <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-paper/40"><SystemLogo name={systemName} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-xs font-label text-danger">{systemName}</span><span className="ml-auto shrink-0 text-[10px] text-slate-400">{relativeTime(date)}</span></div><p className="mt-1 line-clamp-1 text-sm font-label text-carbon">{title}</p><p className="mt-0.5 line-clamp-1 text-xs text-graphite">{detail}</p></div>{url ? <ChevronRightIcon className="mt-2 shrink-0 text-slate-400" size={15} /> : null}</div>;
  return url ? <a href={url} target="_blank" rel="noreferrer">{content}</a> : content;
}

function SystemCard({ system }: { system: SystemSummary }) {
  const status = statusMeta(system.estado_operativo);
  const coverage = system.integraciones_totales ? Math.round((system.integraciones_conectadas / system.integraciones_totales) * 100) : 0;
  return <Link href={`/software/${system.id}`} className="group block rounded-md border border-line-soft bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-line hover:shadow-sm">
    <div className="flex items-start justify-between gap-3"><SystemIdentity name={system.nombre} detail={system.repositorio_github ?? system.url_produccion} size="md" /><Badge variant={status.variant}><span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</Badge></div>
    <div className="mt-4 grid grid-cols-4 gap-2 border-t border-line-soft pt-3"><MiniMetric label="Errores" value={String(system.errores_24h)} danger={system.errores_24h > 0} /><MiniMetric label="Incidentes" value={String(system.incidentes_abiertos)} danger={system.p0_p1_abiertos > 0} /><MiniMetric label="p95" value={system.latencia_p95_ms === null ? "—" : `${system.latencia_p95_ms}ms`} /><MiniMetric label="Cobertura" value={`${coverage}%`} /></div>
    <div className="mt-3 flex items-center justify-between text-[11px] text-graphite"><span>{system.ultimo_deploy ? `Deploy ${system.ultimo_deploy.estado ?? "—"}` : "Sin deploy registrado"}</span><span>{relativeTime(system.ultimo_evento_at ?? system.ultimo_check?.checked_at)}</span></div>
  </Link>;
}

function MiniMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div><p className={`text-sm font-label ${danger ? "text-danger" : "text-carbon"}`}>{value}</p><p className="mt-0.5 truncate text-[10px] text-graphite">{label}</p></div>;
}

function ActivityFeed({ items }: { items: TimelineItem[] }) {
  return <Card padding="none" className="overflow-hidden"><div className="flex items-center justify-between border-b border-line-soft px-4 py-3"><div><p className="font-label text-carbon">Pulso operativo</p><p className="text-xs text-graphite">Guardias, deploys y acciones en una sola línea.</p></div><ClockIcon className="text-slate-400" size={17} /></div>{items.length ? <div className="divide-y divide-line-soft">{items.map((item) => <div key={item.id} className="flex items-center gap-3 px-4 py-2.5"><SystemLogo name={item.sistema_nombre} size="xs" /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-xs font-label text-carbon">{item.sistema_nombre}</span><Badge variant={stateVariant(item.estado)} className="h-5">{item.estado}</Badge><span className="ml-auto shrink-0 text-[10px] text-slate-400">{relativeTime(item.fecha)}</span></div><p className="mt-0.5 truncate text-xs text-graphite">{item.titulo}</p></div></div>)}</div> : <EmptyState icon={ClockIcon} titulo="Sin actividad" descripcion="Todavía no hay señales en esta vista." />}</Card>;
}

function ErrorsView({ items, counts }: { items: WorkItem[]; counts: Record<ResolutionStage, number> }) {
  return <div className="space-y-4">
    <Card padding="sm"><div className="flex items-center gap-2"><BotIcon className="text-signal" size={18} /><p className="font-label text-carbon">Autonomía de Codex</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><AutonomyRule tone="success" title="Puedo ejecutar" text="Diagnóstico, fix de código, pruebas, preview, PR y despliegues reversibles de alta confianza." /><AutonomyRule tone="warning" title="Necesito aprobación" text="Secretos, DNS, permisos, autenticación, datos, esquema productivo y facturación." /></div></Card>
    <ErrorKanban items={items} counts={counts} />
  </div>;
}

function KanbanErrorCard({ item }: { item: WorkItem }) {
  const content = <div className="rounded-md border border-line-soft bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-line hover:shadow-md"><div className="flex items-center gap-2"><SystemLogo name={item.systemName} size="xs" /><span className="min-w-0 flex-1 truncate text-[11px] font-label text-graphite">{item.systemName}</span><span className="shrink-0 text-[9px] text-slate-400">{relativeTime(item.date)}</span></div><p className="mt-2 line-clamp-2 text-sm font-label leading-snug text-carbon">{item.title}</p>{item.detail ? <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-graphite">{item.detail}</p> : null}<div className="mt-2 flex items-center gap-2 border-t border-line-soft pt-2 text-[9px] text-slate-500">{item.severity ? <Badge variant={item.severity === "critica" || item.severity === "alta" ? "danger" : "warning"}>{item.severity}</Badge> : <span>{item.kind === "incidente" ? "Incidente" : "Acción técnica"}</span>}{item.occurrences ? <span className="ml-auto">{item.occurrences} ocurrencias</span> : null}{item.url ? <ChevronRightIcon className="ml-auto" size={13} /> : null}</div></div>;
  return item.url ? <a href={item.url} target="_blank" rel="noreferrer">{content}</a> : item.systemId ? <Link href={`/software/${item.systemId}`}>{content}</Link> : content;
}

function AutonomyRule({ tone, title, text }: { tone: "success" | "warning"; title: string; text: string }) {
  return <div className={`rounded-component border p-3 ${tone === "success" ? "border-success/15 bg-success-light" : "border-warning/15 bg-warning-light"}`}><p className={`text-xs font-label ${tone === "success" ? "text-success" : "text-warning"}`}>{title}</p><p className="mt-1 text-xs leading-relaxed text-graphite">{text}</p></div>;
}

function CodexView({ guards, actions }: { guards: TechGuard[]; actions: OpsAction[] }) {
  return <div className="grid gap-4 xl:grid-cols-[.76fr_1.24fr]">
    <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-4 py-3"><div className="flex items-center gap-2"><BotIcon className="text-signal" size={18} /><p className="font-label text-carbon">Guardias</p></div><p className="mt-0.5 text-xs text-graphite">Cada revisión multiproyecto, con ventana y resultado.</p></div>{guards.length ? <div className="divide-y divide-line-soft">{guards.slice(0, 20).map((guard) => <div key={guard.id} className="px-4 py-3"><div className="flex items-center gap-2"><Badge variant={stateVariant(guard.estado)}>{guard.estado}</Badge><span className="ml-auto text-[10px] text-slate-400">{formatearFechaDisplay(guard.iniciada_at)}</span></div><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-carbon">{guard.resumen ?? "Guardia sin resumen"}</p><div className="mt-2 flex gap-3 text-[10px] text-graphite"><span>{guard.sistemas_revisados} sistemas</span><span>{guard.incidentes_detectados} hallazgos</span><span>{guard.acciones_ejecutadas} acciones</span></div></div>)}</div> : <EmptyState icon={BotIcon} titulo="Sin guardias" descripcion="Las ejecuciones aparecerán acá." />}</Card>
    <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-4 py-3"><div className="flex items-center gap-2"><WrenchIcon className="text-signal" size={18} /><p className="font-label text-carbon">Registro de acciones</p></div><p className="mt-0.5 text-xs text-graphite">Diagnóstico, código, validación, despliegue y rollback.</p></div>{actions.length ? <div className="divide-y divide-line-soft">{actions.slice(0, 40).map((action) => <ActionRow key={action.id} action={action} />)}</div> : <EmptyState icon={WrenchIcon} titulo="Sin acciones" descripcion="No hay intervenciones registradas en esta vista." />}</Card>
  </div>;
}

function ActionRow({ action }: { action: OpsAction }) {
  const content = <div className="flex items-start gap-3 px-4 py-3"><SystemLogo name={action.sistema_nombre} size="sm" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant={stateVariant(action.estado)}>{action.estado}</Badge><span className="text-xs font-label text-graphite">{action.sistema_nombre}</span><span className="ml-auto text-[10px] text-slate-400">{relativeTime(action.created_at)}</span></div><p className="mt-1.5 text-sm font-label text-carbon">{action.titulo}</p>{action.detalle ? <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-graphite">{action.detalle}</p> : null}{action.branch || action.commit_sha || action.deployment_id ? <p className="mt-1.5 truncate font-mono text-[10px] text-slate-500">{[action.branch, action.commit_sha?.slice(0, 8), action.deployment_id].filter(Boolean).join(" · ")}</p> : null}</div>{action.external_url ? <ChevronRightIcon className="mt-2 shrink-0 text-slate-400" size={16} /> : null}</div>;
  return action.external_url ? <a href={action.external_url} target="_blank" rel="noreferrer">{content}</a> : content;
}

function CoverageView({ systems, integrations, search, onSearch }: { systems: SystemSummary[]; integrations: TechIntegration[]; search: string; onSearch: (value: string) => void }) {
  const filtered = systems.filter((system) => `${system.nombre} ${system.repositorio_github ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const providers = Array.from(new Set(integrations.map((integration) => integration.proveedor))).sort();
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-label text-carbon">Cobertura por sistema</p><p className="text-xs text-graphite">Qué puedo observar y operar hoy.</p></div><div className="w-full sm:w-72"><Toolbar searchValue={search} onSearchChange={onSearch} searchPlaceholder="Buscar sistema" /></div></div>
    <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{filtered.map((system) => { const systemIntegrations = integrations.filter((integration) => integration.sistema_id === system.id); return <Card key={system.id} padding="sm"><div className="flex items-start justify-between gap-3"><SystemIdentity name={system.nombre} detail={system.repositorio_github ?? system.url_produccion} size="md" /><Badge variant={statusMeta(system.estado_operativo).variant}>{statusMeta(system.estado_operativo).label}</Badge></div><div className="mt-4 grid grid-cols-2 gap-2">{providers.map((provider) => { const integration = systemIntegrations.find((item) => item.proveedor === provider); const connected = integration?.estado === "conectado"; const failed = integration?.estado === "error" || integration?.estado === "degradado"; return <div key={provider} className="flex items-center justify-between rounded-component border border-line-soft px-2.5 py-2"><span className="text-xs capitalize text-carbon">{provider}</span><span className={`h-2 w-2 rounded-full ${connected ? "bg-success" : failed ? "bg-danger" : "bg-slate-300"}`} title={integration?.estado ?? "no configurado"} /></div>; })}</div><div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-xs text-graphite"><span>{system.integraciones_conectadas}/{system.integraciones_totales} conectores</span>{system.url_produccion ? <a href={system.url_produccion} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-label text-signal"><GlobeIcon size={13} />Producción</a> : null}</div></Card>; })}</div>
  </div>;
}
