"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Modal } from "@/components/ui";
import { CalendarIcon, CheckCircleIcon, LifeBuoyIcon, PlusIcon, TrendingUpIcon } from "@/components/ui/icons";
import { MetricaCard } from "@/components/finanzas/MetricaCard";
import type { OportunidadUpsell, RevisionCuenta, SoporteTicket } from "@/types/soporte";
import { labelEstado } from "@/lib/ui/labels";

type Client = { id: string; empresa: string };
type Tab = "tickets" | "revisiones" | "upsell";
type FormMode = "ticket" | "revision" | "upsell" | null;

const json = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "No se pudo completar la operación.");
  return payload;
};

function statusVariant(status: string) {
  if (["resuelto", "cerrado", "realizada", "ganada"].includes(status)) return "success" as const;
  if (["alta", "critica", "propuesta"].includes(status)) return "danger" as const;
  if (["programada", "contactada"].includes(status)) return "signal" as const;
  return "default" as const;
}

export function SoporteClient() {
  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<SoporteTicket[]>([]);
  const [revisiones, setRevisiones] = useState<RevisionCuenta[]>([]);
  const [upsells, setUpsells] = useState<OportunidadUpsell[]>([]);
  const [clientes, setClientes] = useState<Client[]>([]);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  async function load() {
    setError(null);
    try {
      const [ticketPayload, revisionPayload, upsellPayload, clientPayload] = await Promise.all([
        json("/api/soporte/tickets"), json("/api/soporte/revisiones"), json("/api/soporte/upsells"), json("/api/clientes?estado=activo")
      ]);
      setTickets(ticketPayload.data ?? []); setRevisiones(revisionPayload.data ?? []); setUpsells(upsellPayload.data ?? []); setClientes(clientPayload.data ?? []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo cargar Soporte."); }
  }

  useEffect(() => { void load(); }, []);

  const openTickets = tickets.filter((item) => !["resuelto", "cerrado"].includes(item.estado)).length;
  const pendingReviews = revisiones.filter((item) => ["pendiente", "programada"].includes(item.estado)).length;
  const openUpsells = upsells.filter((item) => !["ganada", "perdida"].includes(item.estado));
  const potentialUpsell = useMemo(() => openUpsells.reduce((sum, item) => sum + Number(item.monto_estimado_usd ?? 0), 0), [openUpsells]);

  function startForm(mode: FormMode) { setFormMode(mode); setForm({}); setError(null); }
  async function submitForm(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const endpoint = formMode === "ticket" ? "/api/soporte/tickets" : formMode === "revision" ? "/api/soporte/revisiones" : "/api/soporte/upsells";
      await json(endpoint, { method: "POST", body: JSON.stringify(form) }); setFormMode(null); await load();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "No se pudo guardar."); } finally { setSaving(false); }
  }
  async function update(endpoint: string, payload: Record<string, unknown>) { try { await json(endpoint, { method: "PATCH", body: JSON.stringify(payload) }); await load(); } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar."); } }
  async function prepareQuarter() { setSaving(true); setError(null); try { await json("/api/soporte/revisiones/generar", { method: "POST" }); await load(); } catch (prepareError) { setError(prepareError instanceof Error ? prepareError.message : "No se pudo preparar el trimestre."); } finally { setSaving(false); } }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-label text-signal">Cuenta y continuidad</p><h1 className="mt-1 font-title text-3xl text-carbon">Soporte</h1><p className="mt-2 max-w-2xl text-sm text-graphite">Acompañá a cada cliente después del delivery, detectá nuevas oportunidades y mantené una relación activa.</p></div>
        <Button onClick={() => startForm(tab === "tickets" ? "ticket" : tab === "revisiones" ? "revision" : "upsell")}><PlusIcon size={18} /> Nueva {tab === "tickets" ? "solicitud" : tab === "revisiones" ? "revisión" : "oportunidad"}</Button>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-4">
        <MetricaCard label="Tickets abiertos" value={String(openTickets)} icono={<LifeBuoyIcon />} colorIcono="danger" description="Solicitudes que todavía requieren seguimiento." />
        <MetricaCard label="Revisiones pendientes" value={String(pendingReviews)} icono={<CalendarIcon />} colorIcono="signal" description="Revisiones trimestrales por coordinar." />
        <MetricaCard label="Oportunidades activas" value={String(openUpsells.length)} icono={<TrendingUpIcon />} colorIcono="success" description="Expansiones detectadas para clientes activos." />
        <MetricaCard label="Upsell potencial" value={`$${potentialUpsell.toLocaleString("en-US")} USD`} icono={<CheckCircleIcon />} colorIcono="warning" description="Monto estimado de oportunidades abiertas." />
      </div>

      <div className="flex gap-1 border-b border-line-soft">
        {(["tickets", "revisiones", "upsell"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 px-4 py-3 text-sm font-label transition-colors ${tab === item ? "border-signal text-signal" : "border-transparent text-graphite hover:text-carbon"}`}>{item === "tickets" ? "Soporte" : item === "revisiones" ? "Revisiones trimestrales" : "Upsell"}</button>)}
      </div>

      {error ? <div className="rounded-component border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">{error}</div> : null}
      {tab === "tickets" ? <TicketsList items={tickets} onUpdate={update} onCreate={() => startForm("ticket")} /> : null}
      {tab === "revisiones" ? <><div className="flex justify-end"><Button variant="secondary" size="sm" onClick={prepareQuarter} loading={saving}><CalendarIcon size={16} /> Preparar trimestre</Button></div><ReviewsList items={revisiones} onUpdate={update} onCreate={() => startForm("revision")} /></> : null}
      {tab === "upsell" ? <UpsellList items={upsells} onUpdate={update} onCreate={() => startForm("upsell")} /> : null}

      <Modal isOpen={Boolean(formMode)} onClose={() => setFormMode(null)} title={formMode === "ticket" ? "Nueva solicitud de soporte" : formMode === "revision" ? "Programar revisión trimestral" : "Nueva oportunidad de upsell"}>
        <form className="space-y-4" onSubmit={submitForm}>
          <label className="block text-sm font-label text-carbon">Cliente<select required value={form.cliente_id ?? ""} onChange={(event) => setForm({ ...form, cliente_id: event.target.value })} className="mt-1 w-full rounded-component border border-line bg-white px-3 py-2 text-sm"><option value="">Seleccionar cliente</option>{clientes.map((client) => <option key={client.id} value={client.id}>{client.empresa}</option>)}</select></label>
          {formMode === "ticket" ? <><Input label="Título" required value={form.titulo ?? ""} onChange={(event) => setForm({ ...form, titulo: event.target.value })} /><label className="block text-sm font-label text-carbon">Descripción<textarea required value={form.descripcion ?? ""} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} className="mt-1 min-h-28 w-full rounded-component border border-line px-3 py-2 text-sm" /></label><label className="block text-sm font-label text-carbon">Prioridad<select value={form.prioridad ?? "media"} onChange={(event) => setForm({ ...form, prioridad: event.target.value })} className="mt-1 w-full rounded-component border border-line px-3 py-2 text-sm"><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label></> : null}
          {formMode === "revision" ? <><Input label="Fecha programada" type="date" value={form.fecha_programada ?? ""} onChange={(event) => setForm({ ...form, fecha_programada: event.target.value, estado: event.target.value ? "programada" : "pendiente" })} /><Input label="Período (primer día del trimestre)" type="date" value={form.periodo_inicio ?? ""} onChange={(event) => setForm({ ...form, periodo_inicio: event.target.value })} /></> : null}
          {formMode === "upsell" ? <><Input label="Título" required value={form.titulo ?? ""} onChange={(event) => setForm({ ...form, titulo: event.target.value })} /><label className="block text-sm font-label text-carbon">Descripción<textarea value={form.descripcion ?? ""} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} className="mt-1 min-h-24 w-full rounded-component border border-line px-3 py-2 text-sm" /></label><div className="grid gap-4 sm:grid-cols-2"><Input label="Monto estimado USD" type="number" min="0" value={form.monto_estimado_usd ?? ""} onChange={(event) => setForm({ ...form, monto_estimado_usd: event.target.value })} /><label className="block text-sm font-label text-carbon">Tipo<select value={form.tipo ?? "modulo"} onChange={(event) => setForm({ ...form, tipo: event.target.value })} className="mt-1 w-full rounded-component border border-line px-3 py-2 text-sm"><option value="modulo">Módulo</option><option value="nueva_fase">Nueva fase</option><option value="automatizacion">Automatización</option><option value="mantenimiento">Mantenimiento</option></select></label></div></> : null}
          <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={() => setFormMode(null)}>Cancelar</Button><Button type="submit" loading={saving}>Guardar</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function TicketsList({ items, onUpdate, onCreate }: { items: SoporteTicket[]; onUpdate: (endpoint: string, payload: Record<string, unknown>) => void; onCreate: () => void }) {
  if (!items.length) return <EmptyState icon={LifeBuoyIcon} titulo="No hay solicitudes de soporte" descripcion="Registrá el primer pedido del cliente para que el equipo pueda darle seguimiento." accion={{ label: "Nueva solicitud", onClick: onCreate }} />;
  return <div className="space-y-3">{items.map((item) => <Card key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-label text-carbon">{item.titulo}</h2><Badge variant={statusVariant(item.prioridad)}>{labelEstado(item.prioridad)}</Badge><Badge>{item.cliente_nombre}</Badge></div><p className="mt-2 text-sm leading-6 text-graphite">{item.descripcion}</p></div><select value={item.estado} onChange={(event) => onUpdate(`/api/soporte/tickets/${item.id}`, { estado: event.target.value })} className="rounded-component border border-line bg-white px-3 py-2 text-sm"><option value="abierto">Abierto</option><option value="en_progreso">En progreso</option><option value="esperando_cliente">Esperando al cliente</option><option value="resuelto">Resuelto</option><option value="cerrado">Cerrado</option></select></div></Card>)}</div>;
}

function ReviewsList({ items, onUpdate, onCreate }: { items: RevisionCuenta[]; onUpdate: (endpoint: string, payload: Record<string, unknown>) => void; onCreate: () => void }) {
  if (!items.length) return <EmptyState icon={CalendarIcon} titulo="No hay revisiones programadas" descripcion="Creá una revisión trimestral para abrir una conversación estratégica con el cliente." accion={{ label: "Programar revisión", onClick: onCreate }} />;
  return <div className="space-y-3">{items.map((item) => <Card key={item.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-label text-graphite">Trimestre desde {item.periodo_inicio}</p><h2 className="mt-1 font-label text-carbon">{item.cliente_nombre}</h2>{item.fecha_programada ? <p className="mt-1 text-sm text-graphite">Reunión: {item.fecha_programada}</p> : null}</div><select value={item.estado} onChange={(event) => onUpdate(`/api/soporte/revisiones/${item.id}`, { estado: event.target.value, ...(event.target.value === "realizada" ? { fecha_realizada: new Date().toISOString().slice(0, 10) } : {}) })} className="rounded-component border border-line bg-white px-3 py-2 text-sm"><option value="pendiente">Pendiente</option><option value="programada">Programada</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option></select></div></Card>)}</div>;
}

function UpsellList({ items, onUpdate, onCreate }: { items: OportunidadUpsell[]; onUpdate: (endpoint: string, payload: Record<string, unknown>) => void; onCreate: () => void }) {
  if (!items.length) return <EmptyState icon={TrendingUpIcon} titulo="No hay oportunidades detectadas" descripcion="Registrá expansiones, nuevas fases o automatizaciones que puedan ampliar el valor entregado." accion={{ label: "Nueva oportunidad", onClick: onCreate }} />;
  async function createProposal(item: OportunidadUpsell) {
    const response = await fetch(`/api/soporte/upsells/${item.id}/convertir`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ destino: "propuesta" }) });
    if (response.ok) window.location.href = `/clientes?cliente_id=${item.cliente_id}`;
  }
  return <div className="space-y-3">{items.map((item) => <Card key={item.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-label text-carbon">{item.titulo}</h2><Badge>{item.cliente_nombre}</Badge><Badge variant={statusVariant(item.estado)}>{labelEstado(item.estado)}</Badge></div><p className="mt-2 text-sm text-graphite">{item.descripcion || "Sin descripción adicional."}</p>{item.monto_estimado_usd ? <p className="mt-2 text-sm font-label text-success">Potencial: ${Number(item.monto_estimado_usd).toLocaleString("en-US")} USD</p> : null}</div><div className="flex flex-wrap items-center gap-2"><select value={item.estado} onChange={(event) => onUpdate(`/api/soporte/upsells/${item.id}`, { estado: event.target.value })} className="rounded-component border border-line bg-white px-3 py-2 text-sm"><option value="detectada">Detectada</option><option value="contactada">Contactada</option><option value="propuesta">Propuesta</option><option value="ganada">Ganada</option><option value="perdida">Perdida</option></select>{["detectada", "contactada"].includes(item.estado) ? <Button size="sm" variant="secondary" onClick={() => void createProposal(item)}>Crear propuesta</Button> : null}</div></div></Card>)}</div>;
}
