"use client";

import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge, Button, Card, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, EmptyState } from "@/components/ui";
import { BrainIcon, InboxIcon, RefreshIcon, SparklesIcon } from "@/components/ui/icons";
import { chartTheme } from "@/lib/charts/chartTheme";
import { cn } from "@/lib/cn";
import type { MarketingIntelligenceOverview } from "@/types/marketingHub";

const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const stageLabels: Record<string, string> = { por_contactar: "Por contactar", contactado: "Contactado", seguimiento: "Seguimiento", calificado: "Calificado", diagnostico_ofrecido: "Diagnóstico ofrecido", diagnostico_pagado: "Diagnóstico pagado", cotizacion: "Cotización", ganado: "Ganado", descartado: "Descartado" };
const channelLabels: Record<string, string> = { web: "Web", meta: "Meta", instagram: "Instagram", whatsapp: "WhatsApp", crm: "CRM", calendly: "Calendly", email: "Email", other: "Otros" };

function percent(value: number | null) { return value === null ? "—" : `${decimal.format(value * 100)}%`; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <Card padding="sm"><p className="text-xs font-label text-graphite">{label}</p><p className="mt-2 font-title text-2xl tabular-nums text-carbon">{value}</p><p className="mt-1 text-xs text-graphite">{detail}</p></Card>; }
function tierVariant(tier: string) { return tier === "A" ? "success" as const : tier === "B" ? "warning" as const : "default" as const; }

export function MarketingIntelligencePanel() {
  const [data, setData] = useState<MarketingIntelligenceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/marketing/intelligence", { cache: "no-store" });
      const payload = await response.json() as { data?: MarketingIntelligenceOverview; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "No se pudo cargar la inteligencia de marketing.");
      setData(payload.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar la inteligencia de marketing."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function refresh() {
    setRefreshing(true); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/marketing/intelligence", { method: "POST" });
      const payload = await response.json() as { data?: { profiles: number; touchpoints: number; audienceEligible: number }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "No se pudo recalcular.");
      setNotice(`Modelo actualizado: ${payload.data.profiles} perfiles, ${payload.data.touchpoints} señales y ${payload.data.audienceEligible} leads elegibles para audiencias.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo recalcular."); }
    finally { setRefreshing(false); }
  }

  if (loading && !data) return <Card className="py-16 text-center text-sm text-graphite">Construyendo perfiles 360 y recorrido multicanal...</Card>;
  if (error && !data) return <Card className="border-danger/25 bg-danger-light text-sm text-danger">{error}</Card>;
  if (!data) return null;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="rounded-md bg-signal-light p-2 text-signal"><BrainIcon size={20} /></div><div><p className="font-label text-carbon">Motor de aprendizaje comercial</p><p className="text-xs text-graphite">Prioriza leads, aprende del embudo y prepara señales de calidad para Meta.</p></div></div>
      <Button onClick={() => void refresh()} disabled={refreshing}><RefreshIcon className={cn("mr-2", refreshing && "animate-spin")} size={16} />{refreshing ? "Recalculando" : "Recalcular perfiles"}</Button>
    </div>
    {error ? <Card className="border-danger/25 bg-danger-light text-sm text-danger">{error}</Card> : null}
    {notice ? <Card className="border-success/25 bg-success-light text-sm text-success">{notice}</Card> : null}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Metric label="Leads perfilados" value={integer.format(data.summary.profiledLeads)} detail="Identidad 360 unificada" />
      <Metric label="Prioridad A" value={integer.format(data.summary.tierA)} detail={`${integer.format(data.summary.tierB)} en prioridad B`} />
      <Metric label="Score promedio" value={decimal.format(data.summary.averageScore)} detail="Fit + intención + engagement" />
      <Metric label="Datos completos" value={`${decimal.format(data.summary.averageCompleteness)}%`} detail="Cobertura media del perfil" />
      <Metric label="Tasa calificada" value={percent(data.summary.qualifiedRate)} detail="Sobre leads perfilados" />
      <Metric label="Audiencia elegible" value={integer.format(data.summary.audienceEligible)} detail="Con consentimiento y score ≥ 65" />
    </div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
      <Card>
        <div className="flex items-start gap-3"><SparklesIcon className="mt-0.5 text-signal" size={20} /><div><div className="flex flex-wrap items-center gap-2"><p className="font-title text-lg text-carbon">Perfil de cliente ideal en aprendizaje</p><Badge variant={data.idealCustomer.confidence === "high" ? "success" : data.idealCustomer.confidence === "medium" ? "warning" : "default"}>Confianza {data.idealCustomer.confidence === "high" ? "alta" : data.idealCustomer.confidence === "medium" ? "media" : "inicial"}</Badge></div><p className="mt-2 text-sm leading-6 text-graphite">{data.idealCustomer.narrative}</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div><p className="text-xs font-label text-graphite">Rubros que avanzan</p><div className="mt-2 flex flex-wrap gap-2">{data.idealCustomer.topIndustries.length ? data.idealCustomer.topIndustries.map((item) => <Badge key={item.value}>{item.value} · {item.count}</Badge>) : <span className="text-sm text-graphite">Sin muestra suficiente</span>}</div></div>
          <div><p className="text-xs font-label text-graphite">Fuentes que califican</p><div className="mt-2 flex flex-wrap gap-2">{data.idealCustomer.topSources.length ? data.idealCustomer.topSources.map((item) => <Badge key={item.value}>{item.value} · {item.count}</Badge>) : <span className="text-sm text-graphite">Sin muestra suficiente</span>}</div></div>
          <div><p className="text-xs font-label text-graphite">Señales ganadoras</p><div className="mt-2 flex flex-wrap gap-2">{data.idealCustomer.winningSignals.length ? data.idealCustomer.winningSignals.map((signal) => <Badge key={signal} variant="success">{signal}</Badge>) : <span className="text-sm text-graphite">Se aprenderán con los cierres</span>}</div></div>
        </div>
        <p className="mt-4 text-xs text-graphite">Muestra actual: {data.idealCustomer.sampleSize} leads calificados o ganados. Las correlaciones orientan decisiones; no sustituyen validación humana.</p>
      </Card>
      <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Señales por canal</p><p className="mt-1 text-xs text-graphite">Puntos de contacto realmente vinculados a un lead.</p></div>{data.channels.length ? <DataTable><DataTableHeader><DataTableRow><DataTableHead>Canal</DataTableHead><DataTableHead className="text-right">Señales</DataTableHead><DataTableHead className="text-right">Leads</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{data.channels.map((channel) => <DataTableRow key={channel.channel}><DataTableCell>{channelLabels[channel.channel] || channel.channel}</DataTableCell><DataTableCell className="text-right">{channel.touchpoints}</DataTableCell><DataTableCell className="text-right">{channel.leads}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <EmptyState icon={InboxIcon} titulo="Esperando señales" descripcion="Aparecerán al recalcular perfiles." />}</Card>
    </div>

    {data.learningTrend.length > 1 ? <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Evolución del aprendizaje</p></div><div className="h-[260px] px-3 py-5"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.learningTrend}><CartesianGrid stroke={chartTheme.grid.stroke} vertical={false} /><XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} tickFormatter={(value) => String(value).slice(5)} /><YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="profiled" name="Perfilados" stroke={chartTheme.colors.signal} strokeWidth={2} /><Line type="monotone" dataKey="tierA" name="Prioridad A" stroke={chartTheme.colors.success} strokeWidth={2} /><Line type="monotone" dataKey="eligible" name="Elegibles" stroke="#7c3aed" strokeWidth={2} /></LineChart></ResponsiveContainer></div></Card> : null}

    <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Prioridad comercial y próxima mejor acción</p><p className="mt-1 text-xs text-graphite">Ordenado por score; muestra por qué priorizar y qué dato falta.</p></div>{data.profiles.length ? <div className="overflow-x-auto"><DataTable className="min-w-[1280px]"><DataTableHeader><DataTableRow><DataTableHead>Lead</DataTableHead><DataTableHead>Score</DataTableHead><DataTableHead>Componentes</DataTableHead><DataTableHead>Etapa</DataTableHead><DataTableHead>Origen</DataTableHead><DataTableHead>Señales</DataTableHead><DataTableHead>Próxima acción</DataTableHead><DataTableHead>Meta</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{data.profiles.map((profile) => <DataTableRow key={profile.leadId}><DataTableCell><p className="font-label text-carbon">{profile.company}</p><p className="text-xs text-graphite">{profile.name} · {profile.touchpoints} señales</p></DataTableCell><DataTableCell><div className="flex items-center gap-2"><Badge variant={tierVariant(profile.tier)}>Tier {profile.tier}</Badge><span className="font-title text-lg tabular-nums text-carbon">{profile.score}</span></div><p className="mt-1 text-xs text-graphite">{profile.completeness}% completo</p></DataTableCell><DataTableCell className="text-xs text-graphite"><p>Fit {profile.fitScore}</p><p>Intención {profile.intentScore}</p><p>Engagement {profile.engagementScore}</p></DataTableCell><DataTableCell><Badge variant={profile.stage === "ganado" ? "success" : profile.stage === "descartado" ? "danger" : "default"}>{stageLabels[profile.stage] || profile.stage}</Badge></DataTableCell><DataTableCell><p>{profile.source || "Sin fuente"}</p><p className="max-w-[190px] truncate text-xs text-graphite">{profile.campaign || "Sin campaña"}</p></DataTableCell><DataTableCell><p className="max-w-[240px] text-xs text-graphite">{profile.positiveSignals.slice(0, 3).join(" · ") || "Sin señales fuertes"}</p>{profile.missingData.length ? <p className="mt-1 max-w-[240px] text-xs text-warning">Falta: {profile.missingData.slice(0, 3).join(", ")}</p> : null}</DataTableCell><DataTableCell className="max-w-[300px] text-sm text-carbon">{profile.nextBestAction || "Revisar"}</DataTableCell><DataTableCell><Badge variant={profile.audienceEligible ? "success" : "default"}>{profile.audienceEligible ? "Elegible" : "No elegible"}</Badge><p className="mt-1 text-xs text-graphite">{profile.audienceStatus}</p></DataTableCell></DataTableRow>)}</DataTableBody></DataTable></div> : <EmptyState icon={InboxIcon} titulo="Todavía no hay perfiles" descripcion="Ejecutá el primer recálculo para construirlos." />}</Card>

    <div className="grid gap-3 md:grid-cols-4"><Card padding="sm"><p className="font-label text-carbon">1. Captura</p><p className="mt-1 text-xs leading-5 text-graphite">Web, Meta, WhatsApp y CRM generan señales con atribución.</p></Card><Card padding="sm"><p className="font-label text-carbon">2. Identidad</p><p className="mt-1 text-xs leading-5 text-graphite">Se unifican sesiones, campañas, conversaciones y etapas por lead.</p></Card><Card padding="sm"><p className="font-label text-carbon">3. Aprendizaje</p><p className="mt-1 text-xs leading-5 text-graphite">El score y el ICP se recalculan con calificados, descartes y ganados.</p></Card><Card padding="sm"><p className="font-label text-carbon">4. Activación segura</p><p className="mt-1 text-xs leading-5 text-graphite">CAPI devuelve calidad; los cambios de pauta pasan por aprobación y auditoría.</p></Card></div>
  </div>;
}
