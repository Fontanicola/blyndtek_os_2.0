"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge, Button, Card, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, EmptyState } from "@/components/ui";
import { GlobeIcon, ImageIcon, InboxIcon, PhoneIcon } from "@/components/ui/icons";
import { chartTheme } from "@/lib/charts/chartTheme";
import type { MetaPeriod } from "@/types/meta";
import type { MarketingHubOverview } from "@/types/marketingHub";

type Mode = "web" | "leads" | "instagram" | "whatsapp";

const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const stageLabels: Record<string, string> = { por_contactar: "Por contactar", seguimiento: "Seguimiento", calificado: "Calificado", diagnostico_ofrecido: "Diagnóstico ofrecido", diagnostico_pagado: "Diagnóstico pagado", cotizacion: "Cotización", ganado: "Ganado", descartado: "Descartado" };

function percent(value: number | null) { return value === null ? "—" : `${decimal.format(value * 100)}%`; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card padding="sm"><p className="text-xs font-label text-graphite">{label}</p><p className="mt-2 font-title text-2xl tabular-nums text-carbon">{value}</p><p className="mt-1 text-xs text-graphite">{detail}</p></Card>;
}

export function MarketingHubPanel({ mode, period }: { mode: Mode; period: MetaPeriod }) {
  const [data, setData] = useState<MarketingHubOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncingInstagram, setSyncingInstagram] = useState(false);
  const [instagramMessage, setInstagramMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true; setError(null);
    void fetch(`/api/marketing/hub/overview?period=${period}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json() as { data?: MarketingHubOverview; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "No se pudo cargar Adquisición.");
      if (active) setData(payload.data);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar Adquisición."); });
    return () => { active = false; };
  }, [period, refreshKey]);

  async function synchronizeInstagram() {
    setSyncingInstagram(true); setInstagramMessage(null);
    try {
      const response = await fetch("/api/marketing/instagram/sync", { method: "POST" });
      const payload = await response.json() as { data?: { media: number; insights: number }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "No se pudo sincronizar Instagram.");
      setInstagramMessage(`Sincronización completa: ${payload.data.media} publicaciones y ${payload.data.insights} métricas.`);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      setInstagramMessage(cause instanceof Error ? cause.message : "No se pudo sincronizar Instagram.");
    } finally { setSyncingInstagram(false); }
  }

  if (error) return <Card className="border-danger/25 bg-danger-light text-sm text-danger">{error}</Card>;
  if (!data) return <Card className="py-16 text-center text-sm text-graphite">Cruzando Web, Meta, CRM y canales...</Card>;

  if (mode === "web") return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Sesiones" value={integer.format(data.web.sessions)} detail={`${integer.format(data.web.visitors)} visitantes únicos`} />
      <Metric label="Sesiones comprometidas" value={integer.format(data.web.engagedSessions)} detail={`${percent(data.web.engagementRate)} de engagement`} />
      <Metric label="Inicios de formulario" value={integer.format(data.web.formStarts)} detail={`${integer.format(data.web.pageViews)} páginas vistas`} />
      <Metric label="Conversión web → lead" value={percent(data.web.conversionRate)} detail={`${integer.format(data.web.leads)} leads en el CRM`} />
      <Metric label="Clics a WhatsApp" value={integer.format(data.web.whatsappClicks)} detail="Con atribución de sesión" />
      <Metric label="Clics a Calendly" value={integer.format(data.web.calendlyClicks)} detail="Próximo paso comercial" />
    </div>
    <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Recorrido diario de adquisición</p><p className="mt-1 text-xs text-graphite">Sesiones, interacción y conversiones medidas por Blyndtek.</p></div><div className="h-[330px] px-3 py-5"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trend}><CartesianGrid stroke={chartTheme.grid.stroke} vertical={false} /><XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} tickFormatter={(value) => String(value).slice(5)} /><YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="sessions" name="Sesiones" stroke={chartTheme.colors.signal} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="engagedSessions" name="Comprometidas" stroke={chartTheme.colors.success} strokeWidth={2} dot={false} /><Line type="monotone" dataKey="formStarts" name="Formularios" stroke="#7c3aed" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="leads" name="Leads" stroke="#ea580c" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Card>
    <div className="grid gap-4 xl:grid-cols-2">
      <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Landings</p></div>{data.pages.length ? <DataTable><DataTableHeader><DataTableRow><DataTableHead>Página</DataTableHead><DataTableHead className="text-right">Sesiones</DataTableHead><DataTableHead className="text-right">Leads</DataTableHead><DataTableHead className="text-right">CVR</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{data.pages.map((row) => <DataTableRow key={row.path}><DataTableCell className="max-w-[280px] truncate">{row.path}</DataTableCell><DataTableCell className="text-right">{row.sessions}</DataTableCell><DataTableCell className="text-right">{row.leads}</DataTableCell><DataTableCell className="text-right">{percent(row.conversionRate)}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <EmptyState icon={GlobeIcon} titulo="Esperando visitas" descripcion="Las páginas aparecerán con el tráfico nuevo." />}</Card>
      <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Fuentes y campañas</p></div>{data.sources.length ? <DataTable><DataTableHeader><DataTableRow><DataTableHead>Fuente</DataTableHead><DataTableHead>Campaña</DataTableHead><DataTableHead className="text-right">Sesiones</DataTableHead><DataTableHead className="text-right">CVR</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{data.sources.map((row) => <DataTableRow key={`${row.source}-${row.medium}-${row.campaign}`}><DataTableCell><p>{row.source}</p><p className="text-xs text-graphite">{row.medium}</p></DataTableCell><DataTableCell className="max-w-[230px] truncate">{row.campaign}</DataTableCell><DataTableCell className="text-right">{row.sessions}</DataTableCell><DataTableCell className="text-right">{percent(row.conversionRate)}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <EmptyState icon={GlobeIcon} titulo="Sin fuentes todavía" descripcion="Las UTMs se agruparán automáticamente." />}</Card>
    </div>
  </div>;

  if (mode === "leads") return data.leads.length ? <DataTable className="min-w-[1400px]"><DataTableHeader><DataTableRow><DataTableHead>Lead</DataTableHead><DataTableHead>Etapa</DataTableHead><DataTableHead>Campaña</DataTableHead><DataTableHead>IDs de Meta</DataTableHead><DataTableHead>Landing</DataTableHead><DataTableHead>CAPI</DataTableHead><DataTableHead>Ingreso</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{data.leads.map((lead) => <DataTableRow key={lead.id}><DataTableCell><p className="font-label text-carbon">{lead.name}</p><p className="text-xs text-graphite">{lead.company} · {lead.email || lead.phone || "Sin contacto"}</p></DataTableCell><DataTableCell><Badge variant={lead.stage === "ganado" ? "success" : lead.stage === "descartado" ? "danger" : "default"}>{stageLabels[lead.stage] || lead.stage}</Badge>{lead.discardReason ? <p className="mt-1 max-w-[220px] text-xs text-graphite">{lead.discardReason}</p> : null}</DataTableCell><DataTableCell><p className="max-w-[260px] truncate">{lead.campaign || "Sin campaña"}</p><p className="text-xs text-graphite">{lead.source || "Sin fuente"}</p></DataTableCell><DataTableCell className="text-xs text-graphite"><p>C {lead.campaignId || "—"}</p><p>A {lead.adsetId || "—"}</p><p>Ad {lead.adId || "—"}</p></DataTableCell><DataTableCell><a href={lead.landingUrl || undefined} target="_blank" rel="noreferrer" className="block max-w-[220px] truncate text-signal hover:underline">{lead.landingUrl || "—"}</a><p className="text-xs text-graphite">{lead.sessionId ? "Sesión vinculada" : "Sin sesión"}</p></DataTableCell><DataTableCell><Badge variant={lead.capiStatus === "sent" ? "success" : lead.capiStatus === "error" ? "danger" : "warning"}>{lead.capiStatus || "pendiente"}</Badge></DataTableCell><DataTableCell className="text-xs text-graphite">{new Date(lead.createdAt).toLocaleString("es-AR")}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <Card className="py-12"><EmptyState icon={InboxIcon} titulo="Sin leads atribuibles" descripcion="Los leads de Meta y sesiones web aparecerán acá sin duplicarse." /></Card>;

  if (mode === "instagram") return <div className="space-y-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="grid flex-1 gap-3 sm:grid-cols-3"><Metric label="Alcance orgánico" value={integer.format(data.instagram.reach)} detail="Cuenta y publicaciones" /><Metric label="Interacciones" value={integer.format(data.instagram.interactions)} detail="Likes, comentarios, guardados y compartidos" /><Metric label="Conexión" value={data.instagram.connected ? "Activa" : "Pendiente"} detail={data.instagram.connected ? "Insights sincronizados" : `Faltan ${data.instagram.missingPermissions.length} permisos`} /></div><Button onClick={() => void synchronizeInstagram()} disabled={syncingInstagram}>{syncingInstagram ? "Sincronizando" : "Sincronizar Instagram"}</Button></div>{instagramMessage ? <Card className={data.instagram.connected ? "border-success/25 bg-success-light text-sm" : "border-warning/25 bg-warning-light text-sm"}>{instagramMessage}</Card> : null}{!data.instagram.connected ? <Card className="border-warning/25 bg-warning-light"><p className="font-label text-carbon">Instagram está vinculado como activo, pero no autorizado para Insights.</p><p className="mt-1 text-sm text-graphite">Permisos pendientes: {data.instagram.missingPermissions.join(", ")}.</p></Card> : null}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.instagram.media.map((media) => <Card key={media.id} padding="none" className="overflow-hidden">{media.thumbnailUrl ? <img src={media.thumbnailUrl} alt="Preview de publicación" className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center bg-paper text-graphite"><ImageIcon size={36} /></div>}<div className="p-4"><p className="line-clamp-2 text-sm text-carbon">{media.caption || "Publicación sin texto"}</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-graphite"><span>{integer.format(media.reach)} alcance</span><span>{integer.format(media.interactions)} interacciones</span><span>{integer.format(media.likes)} likes</span><span>{integer.format(media.comments)} comentarios</span></div>{media.permalink ? <a href={media.permalink} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-label text-signal hover:underline">Abrir en Instagram</a> : null}</div></Card>)}</div>{!data.instagram.media.length ? <Card className="py-12"><EmptyState icon={ImageIcon} titulo="Esperando permisos de Instagram" descripcion="Después de autorizar Insights aparecerán publicaciones, reels y métricas." /></Card> : null}</div>;

  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Clics web → WhatsApp" value={integer.format(data.whatsapp.clicks)} detail="Con campaña y sesión" /><Metric label="Conversaciones" value={integer.format(data.whatsapp.conversations)} detail="Cloud API" /><Metric label="Calificadas" value={integer.format(data.whatsapp.qualified)} detail="Marcadas en el CRM" /><Metric label="Sin leer" value={integer.format(data.whatsapp.unread)} detail="Requieren atención" /><Metric label="Primera respuesta" value={data.whatsapp.averageFirstResponseMinutes === null ? "—" : `${decimal.format(data.whatsapp.averageFirstResponseMinutes)} min`} detail="Promedio del período" /></div><Card className="py-12"><EmptyState icon={PhoneIcon} titulo={data.whatsapp.conversations ? "WhatsApp conectado" : "Tracking inicial activo"} descripcion={data.whatsapp.conversations ? "Las conversaciones se cruzan con leads y campañas." : "Los clics ya se miden. Para mensajes y tiempos de respuesta falta conectar WhatsApp Cloud API."} /></Card></div>;
}
