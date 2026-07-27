"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { CalendarIcon, LifeBuoyIcon, TrendingUpIcon } from "@/components/ui/icons";
import type { OportunidadUpsell, RevisionCuenta, SoporteTicket } from "@/types/soporte";

export function ClienteSoporteSection({ clienteId }: { clienteId: string }) {
  const [tickets, setTickets] = useState<SoporteTicket[]>([]);
  const [revisiones, setRevisiones] = useState<RevisionCuenta[]>([]);
  const [upsells, setUpsells] = useState<OportunidadUpsell[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/soporte/tickets?cliente_id=${clienteId}`).then((response) => response.json()),
      fetch(`/api/soporte/revisiones?cliente_id=${clienteId}`).then((response) => response.json()),
      fetch(`/api/soporte/upsells?cliente_id=${clienteId}`).then((response) => response.json())
    ]).then(([ticketsPayload, reviewsPayload, upsellPayload]) => {
      if (cancelled) return;
      setTickets((ticketsPayload.data ?? []).filter((item: SoporteTicket) => item.cliente_id === clienteId));
      setRevisiones(reviewsPayload.data ?? []);
      setUpsells(upsellPayload.data ?? []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clienteId]);

  if (loading) return <p className="text-sm text-graphite">Cargando continuidad de cuenta...</p>;
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-title text-carbon">Continuidad de cuenta</h2><p className="mt-1 text-sm text-graphite">Soporte, revisiones y oportunidades de expansión de este cliente.</p></div><Button variant="secondary" size="sm" onClick={() => { window.location.href = "/soporte"; }}>Abrir Soporte</Button></div><div className="grid gap-4 xl:grid-cols-3"><Card padding="md" className="space-y-3"><div className="flex items-center gap-2"><LifeBuoyIcon className="text-danger" size={18} /><h3 className="font-label text-carbon">Tickets</h3></div>{tickets.length ? tickets.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 border-b border-line-soft py-2 last:border-0"><span className="min-w-0 truncate text-sm text-carbon">{item.titulo}</span><Badge variant={item.estado === "cerrado" ? "success" : "default"}>{item.estado}</Badge></div>) : <EmptyState icon={LifeBuoyIcon} titulo="Sin tickets" className="min-h-28 border-0 bg-transparent p-2" />}</Card><Card padding="md" className="space-y-3"><div className="flex items-center gap-2"><CalendarIcon className="text-signal" size={18} /><h3 className="font-label text-carbon">Revisiones</h3></div>{revisiones.length ? revisiones.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 border-b border-line-soft py-2 last:border-0"><span className="text-sm text-carbon">{item.periodo_inicio}</span><Badge variant={item.estado === "realizada" ? "success" : "signal"}>{item.estado}</Badge></div>) : <EmptyState icon={CalendarIcon} titulo="Sin revisiones" className="min-h-28 border-0 bg-transparent p-2" />}</Card><Card padding="md" className="space-y-3"><div className="flex items-center gap-2"><TrendingUpIcon className="text-success" size={18} /><h3 className="font-label text-carbon">Upsell</h3></div>{upsells.length ? upsells.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 border-b border-line-soft py-2 last:border-0"><span className="min-w-0 truncate text-sm text-carbon">{item.titulo}</span><Badge variant={item.estado === "ganada" ? "success" : "default"}>{item.estado}</Badge></div>) : <EmptyState icon={TrendingUpIcon} titulo="Sin oportunidades" className="min-h-28 border-0 bg-transparent p-2" />}</Card></div></div>;
}
