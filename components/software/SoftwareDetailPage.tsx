"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AvailabilityChart } from "@/components/software/AvailabilityChart";
import { Badge, Button, Card, EmptyState, Input, Modal, SavingIndicator } from "@/components/ui";
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon, MegaphoneIcon, RefreshIcon, ServerIcon, SettingsIcon, UploadIcon, XIcon } from "@/components/ui/icons";
import { formatearFechaDisplay } from "@/lib/utils/fechas";
import type { SistemaDeploy, SistemaGestionadoPublico, SistemaHealthCheck, SistemaIncidente } from "@/types/sistemas";

type Tab = "general" | "stack" | "salud" | "incidentes" | "deploys" | "accesos";
type DetailProps = { sistemaId: string };

function statusMeta(estado: string) {
  if (estado === "ok" || estado === "activo") return { label: "Operativo", variant: "success" as const };
  if (estado === "degradado" || estado === "pausado") return { label: "Degradado", variant: "warning" as const };
  return { label: "Caído", variant: "danger" as const };
}

function timeAgo(value: string | null | undefined) {
  if (!value) return "Nunca";
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.round(hours / 24)} días`;
}

function stackEntries(value: SistemaGestionadoPublico["stack"]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).filter(([, item]) => typeof item === "string" || typeof item === "number").map(([clave, valor]) => ({ clave, valor: String(valor) }));
}

export function SoftwareDetailPage({ sistemaId }: DetailProps) {
  const [sistema, setSistema] = useState<SistemaGestionadoPublico | null>(null);
  const [checks, setChecks] = useState<SistemaHealthCheck[]>([]);
  const [incidentes, setIncidentes] = useState<SistemaIncidente[]>([]);
  const [deploys, setDeploys] = useState<SistemaDeploy[]>([]);
  const [tab, setTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [stack, setStack] = useState<{ clave: string; valor: string }[]>([]);

  const load = useCallback(async function loadSistema() {
    setLoading(true);
    setError(null);
    try {
      const [systemResponse, healthResponse, incidentsResponse, deployResponse, maintenanceResponse] = await Promise.all([
        fetch(`/api/sistemas/${sistemaId}`, { cache: "no-store" }),
        fetch(`/api/sistemas/${sistemaId}/health?solo_historial=1`, { cache: "no-store" }),
        fetch(`/api/sistemas/${sistemaId}/incidentes`, { cache: "no-store" }),
        fetch(`/api/sistemas/${sistemaId}/deploys`, { cache: "no-store" }),
        fetch(`/api/sistemas/${sistemaId}/maintenance`, { cache: "no-store" })
      ]);
      const systemPayload = await systemResponse.json() as { data?: SistemaGestionadoPublico; error?: string };
      if (!systemResponse.ok || !systemPayload.data) throw new Error(systemPayload.error ?? "No se encontró el sistema.");
      setSistema(systemPayload.data);
      setStack(stackEntries(systemPayload.data.stack));
      const healthPayload = await healthResponse.json() as { data?: SistemaHealthCheck[] };
      const incidentsPayload = await incidentsResponse.json() as { data?: SistemaIncidente[] };
      const deployPayload = await deployResponse.json() as { data?: SistemaDeploy[] };
      const maintenancePayload = await maintenanceResponse.json() as { data?: { activo?: boolean } };
      setChecks(healthPayload.data ?? []);
      setIncidentes(incidentsPayload.data ?? []);
      setDeploys(deployPayload.data ?? []);
      setMaintenanceActive(maintenancePayload.data?.activo === true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el sistema.");
    } finally {
      setLoading(false);
    }
  }, [sistemaId]);

  useEffect(() => { void load(); }, [load]);

  async function patchSystem(payload: Record<string, unknown>) {
    setSaving("saving");
    const response = await fetch(`/api/sistemas/${sistemaId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json() as { data?: SistemaGestionadoPublico; error?: string };
    if (!response.ok || !body.data) throw new Error(body.error ?? "No se pudo guardar.");
    setSistema(body.data);
    setSaving("saved");
    window.setTimeout(() => setSaving("idle"), 1800);
  }

  async function runHealthCheck() {
    setSaving("saving");
    try { await fetch(`/api/sistemas/${sistemaId}/health`); await load(); } finally { setSaving("idle"); }
  }

  async function resolveIncident(id: string) {
    await fetch(`/api/sistemas/${sistemaId}/incidentes`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, resuelto: true }) });
    const response = await fetch(`/api/sistemas/${sistemaId}/incidentes`);
    const payload = await response.json() as { data?: SistemaIncidente[] };
    setIncidentes(payload.data ?? []);
  }

  async function rotateToken() {
    if (!window.confirm("¿Rotar el token de management? El sistema cliente deberá recibir el nuevo token para seguir siendo monitoreado.")) return;
    setSaving("saving");
    const response = await fetch(`/api/sistemas/${sistemaId}/rotate-token`, { method: "POST" });
    const payload = await response.json() as { data?: SistemaGestionadoPublico; error?: string };
    if (!response.ok || !payload.data) { setSaving("idle"); window.alert(payload.error ?? "No se pudo rotar el token."); return; }
    setSistema(payload.data);
    setSaving("saved");
  }

  async function sendMaintenance(activo: boolean) {
    setSaving("saving");
    try {
      const response = await fetch(`/api/sistemas/${sistemaId}/maintenance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo, mensaje: maintenanceMessage || null }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo actualizar el mantenimiento.");
      setMaintenanceOpen(false);
      setMaintenanceActive(activo);
    } catch (cause) { window.alert(cause instanceof Error ? cause.message : "No se pudo actualizar el mantenimiento."); } finally { setSaving("idle"); }
  }

  async function sendAnnouncement() {
    setSaving("saving");
    try {
      const response = await fetch(`/api/sistemas/${sistemaId}/announce`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensaje: announceMessage }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo enviar el anuncio.");
      setAnnounceMessage(""); setAnnounceOpen(false);
    } catch (cause) { window.alert(cause instanceof Error ? cause.message : "No se pudo enviar el anuncio."); } finally { setSaving("idle"); }
  }

  async function saveStack() {
    const next = Object.fromEntries(stack.filter((item) => item.clave.trim()).map((item) => [item.clave.trim(), item.valor]));
    try { await patchSystem({ stack: next }); } catch (cause) { window.alert(cause instanceof Error ? cause.message : "No se pudo guardar el stack."); }
  }

  const averageLatency = useMemo(() => { const values = checks.map((check) => check.latencia_ms).filter((value): value is number => typeof value === "number"); return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null; }, [checks]);
  if (loading) return <div className="animate-pulse space-y-4"><div className="h-5 w-64 rounded-md bg-slate-200" /><div className="h-12 rounded-md bg-slate-100" /><div className="h-80 rounded-md bg-slate-100" /></div>;
  if (error || !sistema) return <EmptyState icon={ServerIcon} titulo="No se pudo cargar el sistema" descripcion={error ?? "Sistema no encontrado."} accion={{ label: "Reintentar", onClick: () => void load() }} />;
  const status = statusMeta(sistema.estado);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/software" className="text-sm text-signal underline underline-offset-2">Software</Link><div className="mt-1 flex items-center gap-3"><h1 className="text-xl font-title text-carbon">{sistema.nombre}</h1><Badge variant={status.variant}>{status.label}</Badge></div><p className="mt-1 text-sm text-graphite">{sistema.ultimo_check ? `Último check: ${timeAgo(sistema.ultimo_check.checked_at)}` : "Sin checks registrados"}</p></div><div className="flex flex-wrap items-center gap-2"><SavingIndicator estado={saving} /><Button size="sm" variant="secondary" onClick={() => void runHealthCheck()}><RefreshIcon size={16} />Verificar ahora</Button><Button size="sm" variant={maintenanceActive ? "danger" : "secondary"} onClick={() => setMaintenanceOpen(true)}><SettingsIcon size={16} />{maintenanceActive ? "Desactivar mantenimiento" : "Modo mantenimiento"}</Button><Button size="sm" onClick={() => setAnnounceOpen(true)}><MegaphoneIcon size={16} />Enviar anuncio</Button></div></div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">{([['general', 'General'], ['stack', 'Stack'], ['salud', 'Salud'], ['incidentes', 'Incidentes'], ['deploys', 'Deploys'], ['accesos', 'Accesos']] as [Tab, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`shrink-0 border-b-2 px-3 py-2 text-sm font-label transition-colors ${tab === value ? "border-signal text-signal" : "border-transparent text-graphite hover:text-carbon"}`}>{label}</button>)}</div>
      {tab === "general" ? <GeneralTab sistema={sistema} onSave={patchSystem} /> : null}
      {tab === "stack" ? <StackTab stack={stack} setStack={setStack} version={sistema.version_patrones} onVersion={(value) => void patchSystem({ version_patrones: value })} onSave={() => void saveStack()} /> : null}
      {tab === "salud" ? <section className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Card padding="sm"><p className="text-xs text-graphite">Disponibilidad últimos 7 días</p><p className="mt-1 text-2xl font-title text-carbon">{checks.length ? `${Math.round((checks.filter((check) => check.estado === "ok").length / checks.length) * 100)}%` : "Sin datos"}</p></Card><Card padding="sm"><p className="text-xs text-graphite">Latencia promedio</p><p className="mt-1 text-2xl font-title text-carbon">{averageLatency === null ? "Sin datos" : `${averageLatency} ms`}</p></Card></div><Card padding="sm"><h2 className="font-label text-carbon">Disponibilidad</h2><AvailabilityChart checks={checks} /></Card><RecentChecks checks={checks} /></section> : null}
      {tab === "incidentes" ? <IncidentsTab incidents={incidentes} onResolve={resolveIncident} /> : null}
      {tab === "deploys" ? <DeploysTab deploys={deploys} /> : null}
      {tab === "accesos" ? <AccessTab sistema={sistema} onRotate={rotateToken} /> : null}
      <Modal isOpen={maintenanceOpen} onClose={() => setMaintenanceOpen(false)} title="Modo mantenimiento" size="sm"><p className="text-sm text-graphite">{maintenanceActive ? "El sistema cliente está mostrando una pantalla de mantenimiento." : "El sistema cliente mostrará una pantalla de mantenimiento a sus usuarios."}</p>{!maintenanceActive ? <Input label="Mensaje opcional" value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} placeholder="Estamos realizando una actualización." className="mt-4" /> : null}<div className="mt-4 flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setMaintenanceOpen(false)}>Cancelar</Button><Button variant={maintenanceActive ? "danger" : "primary"} size="sm" onClick={() => { if (window.confirm(maintenanceActive ? "¿Desactivar el modo mantenimiento?" : "¿Activar el modo mantenimiento?")) void sendMaintenance(!maintenanceActive); }}>{maintenanceActive ? "Desactivar" : "Activar"}</Button></div></Modal>
      <Modal isOpen={announceOpen} onClose={() => setAnnounceOpen(false)} title="Enviar anuncio" size="sm"><p className="text-sm text-graphite">El mensaje aparecerá como banner dentro del sistema cliente.</p><textarea value={announceMessage} onChange={(event) => setAnnounceMessage(event.target.value)} maxLength={2000} rows={5} placeholder="Escribí el anuncio para los usuarios." className="mt-4 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" /><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => setAnnounceOpen(false)}>Cancelar</Button><Button size="sm" disabled={!announceMessage.trim()} onClick={() => void sendAnnouncement()}>Enviar</Button></div></Modal>
    </div>
  );
}

function GeneralTab({ sistema, onSave }: { sistema: SistemaGestionadoPublico; onSave: (payload: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ nombre: sistema.nombre, url_produccion: sistema.url_produccion ?? "", url_staging: sistema.url_staging ?? "", version_patrones: sistema.version_patrones ?? "" });
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  async function save() { setSaving("saving"); try { await onSave({ ...form, url_produccion: form.url_produccion || null, url_staging: form.url_staging || null }); setSaving("saved"); window.setTimeout(() => setSaving("idle"), 1500); } catch { setSaving("idle"); } }
  return <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><Card padding="sm"><div className="grid gap-3 sm:grid-cols-2"><Input label="Nombre del sistema" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /><Input label="Versión de patrones" value={form.version_patrones} onChange={(event) => setForm({ ...form, version_patrones: event.target.value })} /><Input label="URL de producción" value={form.url_produccion} onChange={(event) => setForm({ ...form, url_produccion: event.target.value })} /><Input label="URL de staging" value={form.url_staging} onChange={(event) => setForm({ ...form, url_staging: event.target.value })} /></div><div className="mt-4 flex items-center justify-end gap-2"><SavingIndicator estado={saving} /><Button size="sm" onClick={() => void save()}>Guardar cambios</Button></div></Card><Card padding="sm"><h2 className="font-label text-carbon">Vínculos</h2><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-graphite">Cliente</dt><dd className="text-carbon">{sistema.cliente_id ?? "Sin cliente vinculado"}</dd></div><div><dt className="text-xs text-graphite">Proyecto</dt><dd className="text-carbon">{sistema.proyecto_id ?? "Sin proyecto vinculado"}</dd></div><div><dt className="text-xs text-graphite">Monitoreo</dt><dd><Badge variant={sistema.monitoreo_activo ? "success" : "default"}>{sistema.monitoreo_activo ? "Activo" : "Pausado"}</Badge></dd></div></dl></Card></section>;
}

function StackTab({ stack, setStack, version, onVersion, onSave }: { stack: { clave: string; valor: string }[]; setStack: (value: { clave: string; valor: string }[]) => void; version: string | null; onVersion: (value: string) => void; onSave: () => void }) {
  return <section className="space-y-4"><Card padding="sm"><div className="flex items-center justify-between gap-3"><div><h2 className="font-label text-carbon">Stack declarado</h2><p className="mt-1 text-sm text-graphite">Tecnologías y versiones que informa el sistema cliente.</p></div><Button size="sm" variant="secondary" onClick={() => setStack([...stack, { clave: "", valor: "" }])}>Agregar tecnología</Button></div><div className="mt-4 space-y-2">{stack.length === 0 ? <p className="text-sm text-graphite">No hay tecnologías declaradas.</p> : stack.map((item, index) => <div key={`${index}-${item.clave}`} className="flex gap-2"><Input value={item.clave} placeholder="Tecnología" onChange={(event) => setStack(stack.map((row, rowIndex) => rowIndex === index ? { ...row, clave: event.target.value } : row))} /><Input value={item.valor} placeholder="Versión" onChange={(event) => setStack(stack.map((row, rowIndex) => rowIndex === index ? { ...row, valor: event.target.value } : row))} /><Button variant="ghost" size="sm" onClick={() => setStack(stack.filter((_, rowIndex) => rowIndex !== index))}><XIcon size={16} /></Button></div>)}</div><div className="mt-4 flex justify-end"><Button size="sm" onClick={onSave}>Guardar stack</Button></div></Card><Card padding="sm"><h2 className="font-label text-carbon">Desvíos del stack canónico</h2><p className="mt-1 text-sm text-graphite">{stack.some((item) => item.clave.toLowerCase().includes("desvio")) ? "Hay desvíos declarados para revisar." : "No hay desvíos declarados."}</p><div className="mt-4 max-w-sm"><Input label="Versión de patrones Blyndtek" value={version ?? ""} onChange={(event) => onVersion(event.target.value)} /></div></Card></section>;
}

function RecentChecks({ checks }: { checks: SistemaHealthCheck[] }) { return <div className="overflow-hidden rounded-md border border-slate-200 bg-white"><div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-label text-slate-500">Checks recientes</div>{checks.length === 0 ? <EmptyState icon={ClockIcon} titulo="Sin checks todavía" descripcion="Ejecutá una verificación para empezar a medir la salud." /> : <div>{checks.slice(0, 10).map((check) => <div key={check.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0"><div className="flex items-center gap-2">{check.estado === "ok" ? <CheckCircleIcon className="text-success" size={16} /> : <AlertTriangleIcon className="text-warning" size={16} />}<span className="text-sm text-carbon">{check.estado === "ok" ? "Operativo" : check.estado === "degradado" ? "Degradado" : "Caído"}</span></div><span className="text-xs text-graphite">{timeAgo(check.checked_at)} · {check.latencia_ms ?? "--"} ms</span></div>)}</div>}</div>; }

function IncidentsTab({ incidents, onResolve }: { incidents: SistemaIncidente[]; onResolve: (id: string) => Promise<void> }) { return incidents.length === 0 ? <EmptyState icon={CheckCircleIcon} titulo="Sin incidentes" descripcion="Los incidentes detectados aparecerán acá." /> : <div className="overflow-hidden rounded-md border border-slate-200 bg-white">{incidents.map((incident) => <div key={incident.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><div><div className="flex items-center gap-2"><Badge variant={incident.resuelto ? "default" : incident.severidad === "alta" ? "danger" : "warning"}>{incident.resuelto ? "Resuelto" : incident.severidad === "alta" ? "Alta" : "Media"}</Badge><span className="font-label text-carbon">{incident.titulo}</span></div><p className="mt-1 text-sm text-graphite">{incident.detalle ?? "Sin detalle"}</p><p className="mt-1 text-xs text-graphite">{formatearFechaDisplay(incident.created_at)}</p></div>{incident.resuelto ? <Badge variant="success">Resuelto</Badge> : <Button size="sm" variant="secondary" onClick={() => void onResolve(incident.id)}>Marcar resuelto</Button>}</div>)}</div>; }

function DeploysTab({ deploys }: { deploys: SistemaDeploy[] }) { return deploys.length === 0 ? <EmptyState icon={UploadIcon} titulo="Sin deploys registrados" descripcion="Los deploys de Vercel aparecerán cuando el sistema tenga un proyecto vinculado." /> : <div className="overflow-hidden rounded-md border border-slate-200 bg-white">{deploys.map((deploy) => <div key={deploy.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><div><div className="flex items-center gap-2"><Badge variant={deploy.estado === "READY" ? "success" : deploy.estado === "ERROR" ? "danger" : "warning"}>{deploy.estado ?? "Sin estado"}</Badge><span className="font-label text-carbon">{deploy.commit_mensaje ?? "Deploy sin mensaje"}</span></div><p className="mt-1 font-mono text-xs text-graphite">{deploy.commit_sha?.slice(0, 8) ?? "Sin commit"}</p></div><span className="text-xs text-graphite">{deploy.desplegado_at ? formatearFechaDisplay(deploy.desplegado_at) : "Sin fecha"}</span></div>)}</div>; }

function AccessTab({ sistema, onRotate }: { sistema: SistemaGestionadoPublico; onRotate: () => Promise<void> }) { return <section className="max-w-3xl space-y-4"><Card padding="sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-label text-carbon">Management</h2><p className="mt-1 text-sm text-graphite">El OS usa este contrato HTTP autenticado para verificar y operar el sistema.</p></div><SettingsIcon className="text-signal" size={20} /></div><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-xs text-graphite">Endpoint</dt><dd className="break-all font-mono text-carbon">{sistema.management_endpoint ?? "Sin endpoint configurado"}</dd></div><div><dt className="text-xs text-graphite">Token</dt><dd className="font-mono text-carbon">{sistema.management_token_masked ?? "Sin token configurado"}</dd></div></dl><div className="mt-4 border-t border-slate-200 pt-4"><Button size="sm" variant="secondary" onClick={() => void onRotate()}>Rotar token</Button><p className="mt-2 text-xs text-graphite">El token completo nunca se muestra en Blyndtek OS.</p></div></Card></section>; }
