"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, PageSkeleton, Toolbar } from "@/components/ui";
import { AlertTriangleIcon, BotIcon, CheckCircleIcon, ClockIcon, RefreshIcon, ServerIcon, UploadIcon, WrenchIcon } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { formatearFechaDisplay } from "@/lib/utils/fechas";
import type { SistemaDeploy, SistemaHealthCheck, SistemaIncidente } from "@/types/sistemas";
import type { TechAction, TechGuard, TechIntegration } from "@/types/techOps";

type FleetKpis = {
  sistemas_totales: number; sistemas_saludables: number; sistemas_degradados: number; sistemas_caidos: number; sistemas_sin_datos: number;
  errores_24h: number; incidentes_abiertos: number; p0_p1_abiertos: number; deploys_24h: number; change_failure_rate_30d: number | null;
  mttr_minutos_30d: number | null; latencia_p95_ms: number | null; integraciones_conectadas: number; integraciones_totales: number;
  ultima_guardia_estado: string | null; ultima_guardia_at: string | null;
};
type SystemSummary = {
  id: string; nombre: string; url_produccion: string | null; repositorio_github: string | null; estado_operativo: "ok" | "degradado" | "caido" | "sin_datos";
  ultimo_check: SistemaHealthCheck | null; ultimo_evento_at: string | null; errores_24h: number; incidentes_abiertos: number; p0_p1_abiertos: number;
  latencia_p95_ms: number | null; disponibilidad_30d: number | null; ultimo_deploy: SistemaDeploy | null; deploys_30d: number; deploys_fallidos_30d: number;
  integraciones_conectadas: number; integraciones_totales: number; ultima_accion: TechAction | null; ultima_guardia: TechGuard | null;
};
type OpsIncident = SistemaIncidente & { sistema_nombre: string };
type ProviderSummary = { proveedor: string; total: number; conectadas: number; con_error: number };
type OpsAction = TechAction & { sistema_nombre: string };
type TimelineItem = { id: string; clase: "evento" | "accion" | "deploy" | "guardia"; sistema_id: string | null; sistema_nombre: string; estado: string; titulo: string; detalle: string; fecha: string; url: string | null };
type OpsData = { generated_at: string; kpis: FleetKpis; sistemas: SystemSummary[]; incidentes: OpsIncident[]; integraciones: ProviderSummary[]; integraciones_detalle: TechIntegration[]; guardias: TechGuard[]; acciones: OpsAction[]; timeline: TimelineItem[] };
type TimelineFilter = "todo" | TimelineItem["clase"];

function statusMeta(status: SystemSummary["estado_operativo"]) {
  if (status === "ok") return { label: "Operativo", variant: "success" as const, dot: "bg-success" };
  if (status === "degradado") return { label: "Degradado", variant: "warning" as const, dot: "bg-warning" };
  if (status === "caido") return { label: "Caído", variant: "danger" as const, dot: "bg-danger" };
  return { label: "Sin datos", variant: "default" as const, dot: "bg-slate-400" };
}

function relativeTime(value: string | null | undefined) {
  if (!value) return "Sin registro";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 1440) return `Hace ${Math.round(minutes / 60)} h`;
  return `Hace ${Math.round(minutes / 1440)} d`;
}

function stateVariant(value: string) {
  if (["ok", "saludable", "verificada", "desplegada", "READY", "info"].includes(value)) return "success" as const;
  if (["error", "fatal", "fallida", "caido", "ERROR", "bloqueada"].includes(value)) return "danger" as const;
  if (["warning", "hallazgos", "degradado", "diagnosticando", "ejecutando"].includes(value)) return "warning" as const;
  return "default" as const;
}

function timelineIcon(item: TimelineItem) {
  if (item.clase === "guardia") return BotIcon;
  if (item.clase === "accion") return WrenchIcon;
  if (item.clase === "deploy") return UploadIcon;
  return item.estado === "error" || item.estado === "fatal" ? AlertTriangleIcon : CheckCircleIcon;
}

export function SoftwarePage() {
  const [ops, setOps] = useState<OpsData | null>(null);
  const [search, setSearch] = useState("");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("todo");
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
      setLoading(false); setRefreshing(false);
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
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { window.clearInterval(interval); void client.removeChannel(channel); };
  }, [load]);

  const filteredSystems = useMemo(() => (ops?.sistemas ?? []).filter((system) => `${system.nombre} ${system.repositorio_github ?? ""}`.toLowerCase().includes(search.toLowerCase())), [ops, search]);
  const filteredTimeline = useMemo(() => (ops?.timeline ?? []).filter((item) => timelineFilter === "todo" || item.clase === timelineFilter), [ops, timelineFilter]);

  if (loading) return <PageSkeleton rows={7} kpis={6} />;
  if (error && !ops) return <EmptyState icon={ServerIcon} titulo="No se pudo cargar el control técnico" descripcion={error} accion={{ label: "Reintentar", onClick: () => void load(true) }} />;
  if (!ops) return null;

  const { kpis } = ops;
  const coverage = kpis.integraciones_totales ? Math.round((kpis.integraciones_conectadas / kpis.integraciones_totales) * 100) : 0;
  const needsAttention = kpis.sistemas_caidos > 0 || kpis.p0_p1_abiertos > 0;
  const cards = [
    { label: "Salud de flota", value: `${kpis.sistemas_saludables}/${kpis.sistemas_totales}`, hint: `${kpis.sistemas_degradados} degradados · ${kpis.sistemas_caidos} caídos`, tone: kpis.sistemas_caidos ? "text-danger" : "text-carbon" },
    { label: "Incidentes abiertos", value: kpis.incidentes_abiertos, hint: `${kpis.p0_p1_abiertos} P0/P1`, tone: kpis.p0_p1_abiertos ? "text-danger" : "text-carbon" },
    { label: "Errores últimas 24 h", value: kpis.errores_24h, hint: "Eventos correlacionados", tone: kpis.errores_24h ? "text-warning" : "text-carbon" },
    { label: "Latencia p95", value: kpis.latencia_p95_ms === null ? "—" : `${kpis.latencia_p95_ms} ms`, hint: "Flota monitoreada", tone: "text-carbon" },
    { label: "Change failure rate", value: kpis.change_failure_rate_30d === null ? "—" : `${kpis.change_failure_rate_30d}%`, hint: `${kpis.deploys_24h} deploys en 24 h`, tone: "text-carbon" },
    { label: "Cobertura técnica", value: `${coverage}%`, hint: `${kpis.integraciones_conectadas}/${kpis.integraciones_totales} conexiones`, tone: "text-carbon" }
  ];

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line-soft bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`relative flex h-3 w-3 shrink-0 rounded-full ${live ? "bg-success" : "bg-warning"}`}>{live ? <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-40" /> : null}</span>
        <div className="min-w-0"><p className="text-sm font-label text-carbon">{live ? "Control en tiempo real conectado" : "Actualización automática cada 30 segundos"}</p><p className="truncate text-xs text-graphite">Última consolidación: {formatearFechaDisplay(ops.generated_at)}</p></div>
      </div>
      <Button variant="secondary" size="sm" disabled={refreshing} onClick={() => void load()}><RefreshIcon className={refreshing ? "animate-spin" : ""} size={16} />Actualizar</Button>
    </div>

    <div className={`rounded-card border px-4 py-3 ${needsAttention ? "border-danger/20 bg-danger-light" : "border-success/20 bg-success-light"}`}>
      <div className="flex items-start gap-3">{needsAttention ? <AlertTriangleIcon className="mt-0.5 shrink-0 text-danger" size={19} /> : <CheckCircleIcon className="mt-0.5 shrink-0 text-success" size={19} />}<div><p className="text-sm font-label text-carbon">{needsAttention ? "La flota requiere atención" : "Operación estable"}</p><p className="mt-0.5 text-xs text-graphite">{needsAttention ? `${kpis.sistemas_caidos} sistemas caídos y ${kpis.p0_p1_abiertos} incidentes prioritarios abiertos.` : "No hay sistemas caídos ni incidentes P0/P1 abiertos."}</p></div></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map((item) => <Card key={item.label} padding="sm"><p className="text-xs text-graphite">{item.label}</p><p className={`mt-1 text-2xl font-title ${item.tone}`}>{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.hint}</p></Card>)}</div>

    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-label text-carbon">Sistemas monitoreados</p><p className="mt-0.5 text-xs text-graphite">Salud, entregas, errores y cobertura por producto.</p></div><div className="w-full sm:w-72"><Toolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar sistema o repositorio" /></div></div>
      {filteredSystems.length === 0 ? <EmptyState icon={ServerIcon} titulo="Sin sistemas para mostrar" descripcion="No encontramos sistemas con ese criterio." /> : <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{filteredSystems.map((system) => <SystemCard key={system.id} system={system} />)}</div>}
    </section>

    <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
      <Card padding="none"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3"><div><p className="font-label text-carbon">Actividad operativa</p><p className="text-xs text-graphite">Eventos, deploys, guardias y acciones de Codex.</p></div><div className="flex flex-wrap gap-1">{(["todo", "evento", "deploy", "guardia", "accion"] as TimelineFilter[]).map((filter) => <button key={filter} type="button" onClick={() => setTimelineFilter(filter)} className={`rounded-pill px-2.5 py-1 text-xs font-label capitalize ${timelineFilter === filter ? "bg-carbon text-white" : "bg-paper text-graphite hover:text-carbon"}`}>{filter}</button>)}</div></div><Timeline items={filteredTimeline.slice(0, 24)} /></Card>
      <div className="space-y-4">
        <GuardPanel guards={ops.guardias} />
        <Card padding="sm"><div className="flex items-center justify-between"><p className="font-label text-carbon">Conectores</p><Badge variant={coverage >= 80 ? "success" : coverage >= 50 ? "warning" : "default"}>{coverage}%</Badge></div><div className="mt-3 space-y-2">{ops.integraciones.map((item) => <div key={item.proveedor} className="flex items-center justify-between gap-3"><span className="text-sm capitalize text-carbon">{item.proveedor}</span><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-pill bg-slate-100"><div className={`h-full rounded-pill ${item.con_error ? "bg-danger" : "bg-success"}`} style={{ width: `${item.total ? (item.conectadas / item.total) * 100 : 0}%` }} /></div><span className="w-8 text-right text-xs text-graphite">{item.conectadas}/{item.total}</span></div></div>)}</div></Card>
      </div>
    </div>

    <div className="grid gap-4 xl:grid-cols-2"><IncidentPanel incidents={ops.incidentes} /><ActionPanel actions={ops.acciones} /></div>
  </div>;
}

function SystemCard({ system }: { system: SystemSummary }) {
  const status = statusMeta(system.estado_operativo);
  const integrationCoverage = system.integraciones_totales ? Math.round((system.integraciones_conectadas / system.integraciones_totales) * 100) : 0;
  return <Link href={`/software/${system.id}`} className="group block rounded-md border border-line-soft bg-white p-4 transition-colors hover:border-line hover:bg-paper/30">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-pill ${status.dot}`} /><p className="truncate font-label text-carbon group-hover:text-signal">{system.nombre}</p></div><p className="mt-1 truncate text-xs text-graphite">{system.repositorio_github ?? system.url_produccion ?? "Sin repositorio vinculado"}</p></div><Badge variant={status.variant}>{status.label}</Badge></div>
    <div className="mt-4 grid grid-cols-4 gap-2"><MiniMetric label="Errores 24 h" value={String(system.errores_24h)} danger={system.errores_24h > 0} /><MiniMetric label="Incidentes" value={String(system.incidentes_abiertos)} danger={system.p0_p1_abiertos > 0} /><MiniMetric label="p95" value={system.latencia_p95_ms === null ? "—" : `${system.latencia_p95_ms}ms`} /><MiniMetric label="Cobertura" value={`${integrationCoverage}%`} /></div>
    <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 text-xs text-graphite"><span>{system.ultimo_deploy ? `Deploy ${system.ultimo_deploy.estado ?? "—"}` : "Sin deploy registrado"}</span><span>{relativeTime(system.ultimo_evento_at ?? system.ultimo_check?.checked_at)}</span></div>
  </Link>;
}

function MiniMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) { return <div><p className={`text-sm font-label ${danger ? "text-danger" : "text-carbon"}`}>{value}</p><p className="mt-0.5 truncate text-[10px] text-graphite">{label}</p></div>; }

function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) return <EmptyState icon={ClockIcon} titulo="Sin actividad registrada" descripcion="Las próximas señales y guardias aparecerán acá." />;
  return <div className="max-h-[640px] divide-y divide-line-soft overflow-y-auto">{items.map((item) => { const Icon = timelineIcon(item); return <div key={item.id} className="flex gap-3 px-4 py-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper"><Icon size={16} className={stateVariant(item.estado) === "danger" ? "text-danger" : item.clase === "guardia" || item.clase === "accion" ? "text-signal" : "text-graphite"} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant={stateVariant(item.estado)}>{item.estado}</Badge><span className="text-xs font-label text-graphite">{item.sistema_nombre}</span><span className="ml-auto text-xs text-slate-400">{relativeTime(item.fecha)}</span></div><p className="mt-1 line-clamp-2 text-sm text-carbon">{item.titulo}</p><p className="mt-0.5 truncate text-xs text-graphite">{item.detalle}</p></div></div>; })}</div>;
}

function GuardPanel({ guards }: { guards: TechGuard[] }) {
  const latest = guards[0];
  return <Card padding="sm"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><BotIcon className="text-signal" size={18} /><p className="font-label text-carbon">Guardia Codex</p></div>{latest ? <Badge variant={stateVariant(latest.estado)}>{latest.estado}</Badge> : <Badge>Sin ejecuciones</Badge>}</div>{latest ? <><p className="mt-3 line-clamp-3 text-sm text-carbon">{latest.resumen ?? "Ejecución registrada sin resumen."}</p><div className="mt-3 grid grid-cols-3 gap-2 rounded-component bg-paper p-3"><MiniMetric label="Sistemas" value={String(latest.sistemas_revisados)} /><MiniMetric label="Hallazgos" value={String(latest.incidentes_detectados)} danger={latest.incidentes_detectados > 0} /><MiniMetric label="Acciones" value={String(latest.acciones_ejecutadas)} /></div><p className="mt-3 text-xs text-graphite">{formatearFechaDisplay(latest.iniciada_at)}</p></> : <p className="mt-3 text-sm text-graphite">La próxima guardia quedará registrada con su ventana, hallazgos y acciones.</p>}</Card>;
}

function IncidentPanel({ incidents }: { incidents: OpsIncident[] }) {
  return <Card padding="sm"><div className="flex items-center justify-between"><p className="font-label text-carbon">Incidentes activos</p><Badge variant={incidents.length ? "warning" : "success"}>{incidents.length}</Badge></div>{incidents.length ? <div className="mt-3 divide-y divide-line-soft">{incidents.slice(0, 8).map((incident) => <div key={incident.id} className="py-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={incident.severidad === "critica" || incident.severidad === "alta" ? "danger" : "warning"}>{incident.severidad}</Badge><Link href={`/software/${incident.sistema_id}`} className="text-xs font-label text-signal underline underline-offset-2">{incident.sistema_nombre}</Link><span className="text-xs text-graphite">{incident.ocurrencias ?? 1}×</span></div><p className="mt-1 line-clamp-2 text-sm text-carbon">{incident.titulo}</p></div>)}</div> : <div className="mt-3"><EmptyState icon={CheckCircleIcon} titulo="Sin incidentes abiertos" descripcion="No hay causas raíz activas en la flota." /></div>}</Card>;
}

function ActionPanel({ actions }: { actions: OpsAction[] }) {
  return <Card padding="sm"><div className="flex items-center justify-between"><div><p className="font-label text-carbon">Registro de acciones</p><p className="text-xs text-graphite">Diagnósticos y correcciones de Codex.</p></div><Badge variant="signal">{actions.length}</Badge></div>{actions.length ? <div className="mt-3 divide-y divide-line-soft">{actions.slice(0, 8).map((action) => <div key={action.id} className="py-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={stateVariant(action.estado)}>{action.estado}</Badge><span className="text-xs font-label text-graphite">{action.sistema_nombre}</span><span className="ml-auto text-xs text-slate-400">{relativeTime(action.created_at)}</span></div><p className="mt-1 text-sm text-carbon">{action.titulo}</p>{action.commit_sha || action.branch ? <p className="mt-1 truncate font-mono text-xs text-graphite">{action.branch ?? ""}{action.branch && action.commit_sha ? " · " : ""}{action.commit_sha?.slice(0, 8) ?? ""}</p> : null}</div>)}</div> : <div className="mt-3"><EmptyState icon={WrenchIcon} titulo="Sin acciones registradas" descripcion="Las intervenciones de la guardia quedarán auditadas acá." /></div>}</Card>;
}
