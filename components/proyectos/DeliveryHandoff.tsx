"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { AlertTriangleIcon, CheckCircleIcon, FileTextIcon, UsersIcon } from "@/components/ui/icons";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { DeliveryHandoff } from "@/types/entrega";

type DeliveryHandoffProps = { proyectoId: string };

function ChecklistItem({ completo, label, detalle }: { completo: boolean; label: string; detalle: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-line-soft py-3 last:border-b-0">
      {completo ? <CheckCircleIcon className="mt-0.5 shrink-0 text-success" size={18} /> : <AlertTriangleIcon className="mt-0.5 shrink-0 text-warning" size={18} />}
      <div className="min-w-0">
        <p className="text-sm font-label text-carbon">{label}</p>
        <p className="mt-0.5 text-xs text-graphite">{detalle}</p>
      </div>
    </div>
  );
}

export function DeliveryHandoff({ proyectoId }: DeliveryHandoffProps) {
  const [data, setData] = useState<DeliveryHandoff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferred, setTransferred] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/proyectos/${proyectoId}/handoff`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { data?: DeliveryHandoff; error?: string };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudo cargar el handoff de delivery.");
        }
        if (!cancelled) setData(payload.data);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el handoff de delivery.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [proyectoId]);

  async function transferToSupport() {
    setTransferring(true);
    try {
      const response = await fetch(`/api/proyectos/${proyectoId}/transferir-soporte`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo transferir el proyecto.");
      setTransferred(true);
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : "No se pudo transferir el proyecto.");
    } finally {
      setTransferring(false);
    }
  }

  if (loading) return <p className="text-sm text-graphite">Preparando handoff de delivery...</p>;
  if (error) return <div className="rounded-component border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>;
  if (!data) return <EmptyState icon={FileTextIcon} titulo="Handoff no disponible" descripcion="Todavía no hay información suficiente para preparar la entrega." />;

  return (
    <div className="space-y-5 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-label text-graphite">Preparación de delivery</p>
          <h2 className="mt-1 text-2xl font-title text-carbon">Handoff listo para ejecutar</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite">Esta vista reúne lo que Ventas aprobó y lo que el equipo necesita para comenzar sin volver a interpretar la propuesta.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Badge variant={data.status === "ready" ? "success" : "warning"}>{data.status === "ready" ? "Listo para kickoff" : "Requiere preparación"}</Badge><Button size="sm" variant="secondary" loading={transferring} disabled={transferred} onClick={() => void transferToSupport()}>{transferred ? "Transferido a soporte" : "Transferir a soporte"}</Button></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2"><FileTextIcon size={18} className="text-signal" /><h3 className="font-title text-carbon">Checklist de handoff</h3></div>
          <div>{data.checklist.map((item) => <ChecklistItem key={item.clave} {...item} />)}</div>
        </Card>

        <Card padding="lg" className="space-y-4">
          <div className="flex items-center gap-2"><UsersIcon size={18} className="text-signal" /><h3 className="font-title text-carbon">Equipo de entrega</h3></div>
          <div className="space-y-3 text-sm">
            <div><p className="text-xs font-label text-graphite">Responsable</p><p className="mt-1 text-carbon">{data.proyecto.responsable?.nombre ?? "Sin asignar"}</p></div>
            <div><p className="text-xs font-label text-graphite">Devs asignados</p><p className="mt-1 text-carbon">{data.proyecto.devs.length > 0 ? data.proyecto.devs.map((dev) => dev.nombre).join(", ") : "Sin asignar"}</p></div>
            <div><p className="text-xs font-label text-graphite">Inicio</p><p className="mt-1 text-carbon">{data.proyecto.fecha_inicio ? formatFecha(data.proyecto.fecha_inicio) : "Sin definir"}</p></div>
            <div><p className="text-xs font-label text-graphite">Entrega comprometida</p><p className="mt-1 text-carbon">{data.proyecto.entrega_comprometida ? formatFecha(data.proyecto.entrega_comprometida) : "Sin definir"}</p></div>
          </div>
        </Card>
      </div>

      <Card padding="lg" className="space-y-4">
        <div><p className="text-xs font-label text-graphite">Qué se aprobó</p><h3 className="mt-1 text-xl font-title text-carbon">{data.cliente?.empresa ?? "Cliente"}</h3></div>
        {data.propuesta.resumen || data.propuesta.alcance ? <p className="text-sm leading-6 text-graphite">{data.propuesta.resumen ?? data.propuesta.alcance}</p> : null}
        {data.propuesta.modulos.length > 0 ? <div className="grid gap-3 md:grid-cols-2">{data.propuesta.modulos.map((modulo) => <div key={modulo.nombre} className="rounded-component border border-line-soft bg-paper p-3"><p className="text-sm font-label text-carbon">{modulo.nombre}</p>{modulo.descripcion ? <p className="mt-1 text-xs leading-5 text-graphite">{modulo.descripcion}</p> : null}</div>)}</div> : null}
        <div className="grid gap-3 border-t border-line-soft pt-4 sm:grid-cols-4">
          <div><p className="text-xs font-label text-graphite">Desarrollo</p><p className="mt-1 text-sm font-label text-carbon">{data.propuesta.condiciones.precio_desarrollo == null ? "—" : formatUSD(data.propuesta.condiciones.precio_desarrollo)}</p></div>
          <div><p className="text-xs font-label text-graphite">Adelanto</p><p className="mt-1 text-sm font-label text-carbon">{data.propuesta.condiciones.adelanto_pct == null ? "—" : `${data.propuesta.condiciones.adelanto_pct}%`}</p></div>
          <div><p className="text-xs font-label text-graphite">Cuotas</p><p className="mt-1 text-sm font-label text-carbon">{data.propuesta.condiciones.cantidad_cuotas ?? "—"}</p></div>
          <div><p className="text-xs font-label text-graphite">Mantenimiento</p><p className="mt-1 text-sm font-label text-carbon">{data.propuesta.condiciones.mantenimiento_mensual == null ? "—" : formatUSD(data.propuesta.condiciones.mantenimiento_mensual)}</p></div>
        </div>
      </Card>

      <div className="space-y-3"><div><p className="text-xs font-label text-graphite">Plan operativo</p><h3 className="mt-1 text-xl font-title text-carbon">Fases listas para ejecutar</h3></div>
        {data.fases.length > 0 ? data.fases.map((fase) => <Card key={fase.id} padding="md" className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-label text-graphite">Fase {fase.orden}</p><h4 className="mt-1 text-base font-title text-carbon">{fase.nombre}</h4></div><Badge variant={fase.features_completadas === fase.features_total && fase.features_total > 0 ? "success" : "default"}>{fase.features_completadas}/{fase.features_total} features</Badge></div>{fase.descripcion ? <p className="text-sm leading-6 text-graphite">{fase.descripcion}</p> : null}<div className="grid gap-3 border-t border-line-soft pt-3 md:grid-cols-2"><div><p className="text-xs font-label text-graphite">Tareas vinculadas</p><p className="mt-1 text-sm text-carbon">{fase.tareas_total}</p></div><div><p className="text-xs font-label text-graphite">Criterio de aceptación</p><p className="mt-1 text-sm text-carbon">{fase.criterio_aceptacion ?? "Definir con el cliente en kickoff"}</p></div></div></Card>) : <EmptyState icon={FileTextIcon} titulo="Sin fases materializadas" descripcion="La propuesta debe tener un roadmap antes de iniciar delivery." />}
      </div>
    </div>
  );
}
