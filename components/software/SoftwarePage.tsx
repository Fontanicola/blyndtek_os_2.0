"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, DataTable, EmptyState, PageSkeleton, RowActions, Toolbar } from "@/components/ui";
import { AlertTriangleIcon, CheckCircleIcon, RefreshIcon, ServerIcon } from "@/components/ui/icons";
import { formatearFechaDisplay } from "@/lib/utils/fechas";
import type { SistemaIncidente, SistemaLista } from "@/types/sistemas";

type FleetKpis = { sistemas_activos: number; incidentes_abiertos: number; deploys_24h: number };
type OpsKpis = { errores_24h: number; p0_p1_abiertos: number; sistemas_afectados: number; integraciones_conectadas: number; integraciones_totales: number };
type OpsIncident = SistemaIncidente & { sistema_nombre: string };
type ProviderSummary = { proveedor: string; total: number; conectadas: number; con_error: number };
type OpsData = { kpis: OpsKpis; incidentes: OpsIncident[]; integraciones: ProviderSummary[] };

const emptyOps: OpsData = {
  kpis: { errores_24h: 0, p0_p1_abiertos: 0, sistemas_afectados: 0, integraciones_conectadas: 0, integraciones_totales: 0 },
  incidentes: [],
  integraciones: []
};

function statusMeta(sistema: SistemaLista) {
  const estado = sistema.ultimo_check?.estado ?? sistema.estado;
  if (estado === "ok" || estado === "activo") return { label: "Operativo", variant: "success" as const, dot: "bg-success" };
  if (estado === "degradado" || estado === "pausado") return { label: "Degradado", variant: "warning" as const, dot: "bg-warning" };
  return { label: "Caído", variant: "danger" as const, dot: "bg-danger" };
}

function incidentVariant(incident: OpsIncident) {
  if (incident.severidad === "critica" || incident.severidad === "alta") return "danger" as const;
  if (incident.severidad === "media") return "warning" as const;
  return "default" as const;
}

export function SoftwarePage() {
  const [sistemas, setSistemas] = useState<SistemaLista[]>([]);
  const [kpis, setKpis] = useState<FleetKpis>({ sistemas_activos: 0, incidentes_abiertos: 0, deploys_24h: 0 });
  const [ops, setOps] = useState<OpsData>(emptyOps);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [fleetResponse, opsResponse] = await Promise.all([
        fetch("/api/sistemas", { cache: "no-store" }),
        fetch("/api/sistemas/operaciones", { cache: "no-store" })
      ]);
      const fleetPayload = await fleetResponse.json() as { data?: SistemaLista[]; kpis?: FleetKpis; error?: string };
      const opsPayload = await opsResponse.json() as { data?: OpsData; error?: string };
      if (!fleetResponse.ok) throw new Error(fleetPayload.error ?? "No se pudo cargar la flota.");
      if (!opsResponse.ok) throw new Error(opsPayload.error ?? "No se pudo cargar la telemetría técnica.");
      setSistemas(fleetPayload.data ?? []);
      setKpis(fleetPayload.kpis ?? { sistemas_activos: 0, incidentes_abiertos: 0, deploys_24h: 0 });
      setOps(opsPayload.data ?? emptyOps);
      setUpdatedAt(new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el control técnico.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => sistemas.filter((sistema) => `${sistema.nombre} ${sistema.cliente_id ?? ""}`.toLowerCase().includes(search.toLowerCase())), [sistemas, search]);
  const coverage = ops.kpis.integraciones_totales > 0 ? Math.round((ops.kpis.integraciones_conectadas / ops.kpis.integraciones_totales) * 100) : 0;

  if (loading) return <PageSkeleton rows={6} kpis={6} />;
  if (error) return <EmptyState icon={ServerIcon} titulo="No se pudo cargar el control técnico" descripcion={error} accion={{ label: "Reintentar", onClick: () => void load() }} />;

  const cards = [
    { label: "Sistemas activos", value: kpis.sistemas_activos, hint: `${ops.kpis.sistemas_afectados} afectados` },
    { label: "Incidentes abiertos", value: kpis.incidentes_abiertos, hint: `${ops.kpis.p0_p1_abiertos} P0/P1` },
    { label: "Errores últimas 24 h", value: ops.kpis.errores_24h, hint: "Eventos agrupados" },
    { label: "Deploys últimas 24 h", value: kpis.deploys_24h, hint: "Producción y previews" },
    { label: "Cobertura conectada", value: `${coverage}%`, hint: `${ops.kpis.integraciones_conectadas}/${ops.kpis.integraciones_totales} integraciones` },
    { label: "Guardia", value: ops.kpis.p0_p1_abiertos > 0 ? "Atención" : "Estable", hint: updatedAt ? `Actualizado ${formatearFechaDisplay(updatedAt)}` : "Sin lectura" }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line-soft bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-graphite">
          {ops.kpis.p0_p1_abiertos > 0 ? <AlertTriangleIcon className="text-danger" size={18} /> : <CheckCircleIcon className="text-success" size={18} />}
          <span>{ops.kpis.p0_p1_abiertos > 0 ? "La guardia detectó incidentes prioritarios." : "No hay incidentes prioritarios abiertos."}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()}><RefreshIcon size={16} />Actualizar señales</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((item) => <Card key={item.label} padding="sm"><p className="text-xs text-graphite">{item.label}</p><p className="mt-1 text-2xl font-title text-carbon">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.hint}</p></Card>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">
        <Card padding="sm">
          <div className="flex items-center justify-between gap-3"><p className="font-label text-carbon">Incidentes activos</p><Badge variant={ops.incidentes.length ? "warning" : "success"}>{ops.incidentes.length}</Badge></div>
          {ops.incidentes.length === 0 ? <div className="mt-4"><EmptyState icon={CheckCircleIcon} titulo="Operación estable" descripcion="No hay incidentes técnicos abiertos." /></div> : <div className="mt-3 divide-y divide-slate-100">{ops.incidentes.slice(0, 6).map((incident) => <div key={incident.id} className="py-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={incidentVariant(incident)}>{incident.severidad}</Badge><Link href={`/software/${incident.sistema_id}`} className="font-label text-signal underline underline-offset-2">{incident.sistema_nombre}</Link><span className="text-xs text-graphite">{incident.fuente ?? "health_check"} · {incident.ocurrencias ?? 1}×</span></div><p className="mt-1 line-clamp-2 text-sm text-carbon">{incident.titulo}</p><p className="mt-1 text-xs text-graphite">{formatearFechaDisplay(incident.ultima_ocurrencia_at ?? incident.created_at)}{incident.ruta ? ` · ${incident.ruta}` : ""}</p></div>)}</div>}
        </Card>
        <Card padding="sm">
          <p className="font-label text-carbon">Cobertura de señales</p>
          <div className="mt-3 space-y-2">{ops.integraciones.length === 0 ? <p className="text-sm text-graphite">Sin integraciones registradas.</p> : ops.integraciones.map((item) => <div key={item.proveedor} className="flex items-center justify-between gap-3 rounded-component border border-line-soft px-3 py-2"><span className="text-sm capitalize text-carbon">{item.proveedor}</span><Badge variant={item.con_error > 0 ? "danger" : item.conectadas === item.total && item.total > 0 ? "success" : "default"}>{item.conectadas}/{item.total}</Badge></div>)}</div>
        </Card>
      </div>

      <Toolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar sistema" />
      {filtered.length === 0 ? <EmptyState icon={ServerIcon} titulo="No hay sistemas gestionados" descripcion={search ? "No encontramos sistemas con ese criterio." : "La flota aparecerá cuando registres el primer sistema."} /> : (
        <DataTable>
          <thead><tr><th className="px-4 py-2 text-left text-xs font-label text-slate-500">Sistema</th><th className="px-4 py-2 text-left text-xs font-label text-slate-500">Cliente</th><th className="px-4 py-2 text-left text-xs font-label text-slate-500">Estado</th><th className="px-4 py-2 text-left text-xs font-label text-slate-500">Último check</th><th className="w-12 px-2" /></tr></thead>
          <tbody>{filtered.map((sistema) => { const status = statusMeta(sistema); return <tr key={sistema.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50"><td className="px-4 py-3"><Link href={`/software/${sistema.id}`} className="font-label text-signal underline underline-offset-2">{sistema.nombre}</Link><p className="mt-0.5 text-xs text-graphite">{sistema.url_produccion ?? "Sin URL de producción"}</p></td><td className="px-4 py-3 text-sm text-slate-600">{sistema.cliente_id ?? "Sin cliente vinculado"}</td><td className="px-4 py-3"><Badge variant={status.variant}><span className={`mr-1.5 h-2 w-2 rounded-pill ${status.dot}`} />{status.label}</Badge></td><td className="px-4 py-3 text-sm text-slate-600">{sistema.ultimo_check ? formatearFechaDisplay(sistema.ultimo_check.checked_at) : "Nunca verificado"}</td><td className="px-2 py-3 text-right"><RowActions actions={[{ kind: "view", label: "Ver detalle", onClick: () => { window.location.href = `/software/${sistema.id}`; } }]} /></td></tr>; })}</tbody>
        </DataTable>
      )}
    </div>
  );
}
