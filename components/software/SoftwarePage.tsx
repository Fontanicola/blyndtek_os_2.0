"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, DataTable, EmptyState, PageSkeleton, RowActions, Toolbar } from "@/components/ui";
import { ServerIcon, RefreshIcon } from "@/components/ui/icons";
import { formatearFechaDisplay } from "@/lib/utils/fechas";
import type { SistemaLista } from "@/types/sistemas";

type FleetKpis = { sistemas_activos: number; incidentes_abiertos: number; deploys_24h: number };

function statusMeta(sistema: SistemaLista) {
  const estado = sistema.ultimo_check?.estado ?? sistema.estado;
  if (estado === "ok" || estado === "activo") return { label: "Operativo", variant: "success" as const, dot: "bg-success" };
  if (estado === "degradado" || estado === "pausado") return { label: "Degradado", variant: "warning" as const, dot: "bg-warning" };
  return { label: "Caído", variant: "danger" as const, dot: "bg-danger" };
}

export function SoftwarePage() {
  const [sistemas, setSistemas] = useState<SistemaLista[]>([]);
  const [kpis, setKpis] = useState<FleetKpis>({ sistemas_activos: 0, incidentes_abiertos: 0, deploys_24h: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sistemas", { cache: "no-store" });
      const payload = await response.json() as { data?: SistemaLista[]; kpis?: FleetKpis; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la flota.");
      setSistemas(payload.data ?? []);
      setKpis(payload.kpis ?? { sistemas_activos: 0, incidentes_abiertos: 0, deploys_24h: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la flota.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => sistemas.filter((sistema) => `${sistema.nombre} ${sistema.cliente_id ?? ""}`.toLowerCase().includes(search.toLowerCase())), [sistemas, search]);

  if (loading) return <PageSkeleton rows={5} kpis={3} />;
  if (error) return <EmptyState icon={ServerIcon} titulo="No se pudo cargar la flota" descripcion={error} accion={{ label: "Reintentar", onClick: () => void load() }} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm text-graphite">Control de flota</p><h1 className="text-xl font-title text-carbon">Software</h1><p className="mt-1 text-sm text-graphite">Estado operativo de los sistemas gestionados por Blyndtek.</p></div>
        <Button variant="secondary" size="sm" onClick={() => void load()}><RefreshIcon size={16} />Actualizar</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Sistemas activos", value: kpis.sistemas_activos }, { label: "Incidentes abiertos", value: kpis.incidentes_abiertos }, { label: "Deploys últimas 24 h", value: kpis.deploys_24h }].map((item) => <div key={item.label} className="rounded-md border border-slate-200 bg-white px-4 py-3"><p className="text-xs text-graphite">{item.label}</p><p className="mt-1 text-2xl font-title text-carbon">{item.value}</p></div>)}
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
