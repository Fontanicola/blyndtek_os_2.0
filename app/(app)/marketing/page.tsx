"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, EmptyState } from "@/components/ui";
import { AlertTriangleIcon, BarChartIcon, CheckCircleIcon, ClockIcon, InboxIcon, MegaphoneIcon, RefreshIcon, SparklesIcon, WrenchIcon } from "@/components/ui/icons";
import { chartTheme } from "@/lib/charts/chartTheme";
import { cn } from "@/lib/cn";
import type { MetaGuardrails, MetaOverview, MetaPeriod } from "@/types/meta";
import { MarketingHubPanel } from "@/components/marketing/MarketingHubPanel";
import { MarketingIntelligencePanel } from "@/components/marketing/MarketingIntelligencePanel";

type Tab = "resumen" | "web" | "leads" | "inteligencia" | "campanas" | "creatividad" | "embudo" | "instagram" | "whatsapp" | "acciones" | "operacion";
type Permissions = { canSync: boolean; canAnalyze: boolean; canManageRecommendations: boolean; canEditGuardrails: boolean; canCreateActions: boolean; canReviewActions: boolean; canExecuteActions: boolean; canEditExecutionPolicy: boolean };
type ApiResponse = { data?: MetaOverview; permissions?: Permissions; error?: string };

const tabs: Array<{ value: Tab; label: string }> = [
  { value: "resumen", label: "Resumen" }, { value: "web", label: "Web" }, { value: "leads", label: "Leads de pauta" }, { value: "inteligencia", label: "Inteligencia" }, { value: "campanas", label: "Campañas" },
  { value: "creatividad", label: "Creatividad" }, { value: "embudo", label: "Embudo" }, { value: "instagram", label: "Instagram" }, { value: "whatsapp", label: "WhatsApp" }, { value: "acciones", label: "Acciones" },
  { value: "operacion", label: "Operación" }
];
const periods: Array<{ value: MetaPeriod; label: string }> = [
  { value: "7d", label: "7 días" }, { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" }, { value: "year", label: "Año" }
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const decimalMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

function pct(value: number | null) { return value === null ? "—" : `${decimal.format(value * 100)}%`; }
function metricPct(value: number) { return `${decimal.format(value)}%`; }
function ratio(value: number | null) { return value === null ? "—" : `${decimal.format(value)}x`; }
function statusVariant(status: string) {
  if (["ACTIVE", "connected", "success", "approved", "executed"].includes(status)) return "success" as const;
  if (["error", "critical", "DISAPPROVED", "rejected", "failed"].includes(status)) return "danger" as const;
  if (["degraded", "warning", "partial", "PAUSED", "pending_approval"].includes(status)) return "warning" as const;
  return "default" as const;
}
function friendlyStatus(status: string) {
  return ({ ACTIVE: "Activa", PAUSED: "Pausada", connected: "Conectada", not_configured: "Sin configurar", degraded: "Revisar", error: "Error", success: "Correcta", partial: "Parcial", running: "En curso", draft: "Borrador", pending_approval: "Pendiente", approved: "Aprobada", rejected: "Rechazada", cancelled: "Cancelada", executed: "Ejecutada", failed: "Fallida" } as Record<string, string>)[status] || status;
}

function MetricCard({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "success" | "warning" }) {
  return <Card padding="sm" className={cn("min-w-0", tone === "success" && "border-success/25", tone === "warning" && "border-warning/25")}>
    <p className="text-xs font-label text-graphite">{label}</p>
    <p className="mt-2 truncate font-title text-2xl tabular-nums text-carbon">{value}</p>
    <p className="mt-1 truncate text-xs text-graphite">{detail}</p>
  </Card>;
}

function GuardrailField({ label, value, suffix, disabled, onChange }: { label: string; value: number; suffix: string; disabled: boolean; onChange: (value: number) => void }) {
  return <label className="block"><span className="text-xs font-label text-graphite">{label}</span><div className="mt-1 flex h-10 items-center rounded-md border border-line bg-white px-3 focus-within:border-signal"><input type="number" min="0" step="0.1" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm tabular-nums text-carbon outline-none disabled:text-graphite" /><span className="ml-2 text-xs text-graphite">{suffix}</span></div></label>;
}

function EmptyModule({ title, description }: { title: string; description: string }) {
  return <Card className="py-10"><EmptyState icon={InboxIcon} titulo={title} descripcion={description} /></Card>;
}

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [period, setPeriod] = useState<MetaPeriod>("30d");
  const [overview, setOverview] = useState<MetaOverview | null>(null);
  const [canSync, setCanSync] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>({ canSync: false, canAnalyze: false, canManageRecommendations: false, canEditGuardrails: false, canCreateActions: false, canReviewActions: false, canExecuteActions: false, canEditExecutionPolicy: false });
  const [guardrails, setGuardrails] = useState<MetaGuardrails | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingGuardrails, setSavingGuardrails] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/marketing/meta/overview?period=${period}`, { cache: "no-store" });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.data) throw new Error(payload.error || "No se pudo cargar el centro de control.");
      const nextPermissions = { canSync: Boolean(payload.permissions?.canSync), canAnalyze: Boolean(payload.permissions?.canAnalyze), canManageRecommendations: Boolean(payload.permissions?.canManageRecommendations), canEditGuardrails: Boolean(payload.permissions?.canEditGuardrails), canCreateActions: Boolean(payload.permissions?.canCreateActions), canReviewActions: Boolean(payload.permissions?.canReviewActions), canExecuteActions: Boolean(payload.permissions?.canExecuteActions), canEditExecutionPolicy: Boolean(payload.permissions?.canEditExecutionPolicy) };
      setOverview(payload.data); setCanSync(nextPermissions.canSync); setPermissions(nextPermissions); setGuardrails(payload.data.guardrails);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el centro de control."); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  async function synchronize() {
    setSyncing(true); setNotice(null); setError(null);
    try {
      const response = await fetch("/api/marketing/meta/sync", { method: "POST" });
      const payload = await response.json() as { data?: { records: number }; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo sincronizar.");
      setNotice(`Sincronización completa: ${integer.format(payload.data?.records || 0)} registros actualizados.`);
      await load();
    } catch (syncError) { setError(syncError instanceof Error ? syncError.message : "No se pudo sincronizar."); }
    finally { setSyncing(false); }
  }

  async function analyze() {
    setAnalyzing(true); setNotice(null); setError(null);
    try {
      const response = await fetch("/api/marketing/meta/intelligence", { method: "POST" });
      const payload = await response.json() as { data?: { detected: number; resolved: number }; error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo ejecutar el análisis.");
      setNotice(`Análisis completo: ${payload.data?.detected || 0} alertas activas y ${payload.data?.resolved || 0} resueltas.`);
      await load();
    } catch (analysisError) { setError(analysisError instanceof Error ? analysisError.message : "No se pudo ejecutar el análisis."); }
    finally { setAnalyzing(false); }
  }

  async function saveGuardrails() {
    if (!guardrails) return;
    setSavingGuardrails(true); setNotice(null); setError(null);
    try {
      const response = await fetch("/api/marketing/meta/guardrails", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(guardrails) });
      const payload = await response.json() as { data?: MetaGuardrails; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || "No se pudieron guardar los objetivos.");
      setGuardrails(payload.data); setNotice("Objetivos y límites guardados. El análisis fue recalculado.");
      await analyze();
    } catch (guardrailError) { setError(guardrailError instanceof Error ? guardrailError.message : "No se pudieron guardar los objetivos."); }
    finally { setSavingGuardrails(false); }
  }

  async function updateRecommendation(id: string, status: "acknowledged" | "dismissed") {
    setError(null);
    const response = await fetch(`/api/marketing/meta/recommendations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(payload.error || "No se pudo actualizar la alerta."); return; }
    setNotice(status === "acknowledged" ? "Alerta reconocida; queda en seguimiento." : "Alerta descartada.");
    await load();
  }

  async function createAction(recommendationId: string) {
    setError(null); setNotice(null);
    const response = await fetch("/api/marketing/meta/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recommendationId }) });
    const payload = await response.json() as { existing?: boolean; error?: string };
    if (!response.ok) { setError(payload.error || "No se pudo proponer la acción."); return; }
    setNotice(payload.existing ? "La recomendación ya tiene una acción activa." : "Acción enviada a aprobación; no se ejecutó ningún cambio en Meta.");
    setTab("acciones"); await load();
  }

  async function reviewAction(id: string, status: "approved" | "rejected" | "cancelled") {
    setError(null); setNotice(null);
    const response = await fetch(`/api/marketing/meta/actions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(payload.error || "No se pudo revisar la acción."); return; }
    setNotice(status === "approved" ? "Acción aprobada y registrada. La ejecución en Meta continúa bloqueada." : status === "rejected" ? "Acción rechazada." : "Acción cancelada.");
    await load();
  }

  async function proposePause(entityType: "campaign" | "ad", entityId: string, name: string) {
    setActionBusy(entityId); setError(null); setNotice(null);
    try {
      const response = await fetch("/api/marketing/meta/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType, entityId, title: `Pausar ${name}` }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo proponer la pausa.");
      setNotice("Pausa propuesta. Requiere aprobación y simulación antes de ejecutarse."); setTab("acciones"); await load();
    } catch (pauseError) { setError(pauseError instanceof Error ? pauseError.message : "No se pudo proponer la pausa."); }
    finally { setActionBusy(null); }
  }

  async function runAction(id: string, mode: "simulate" | "live") {
    setActionBusy(`${id}-${mode}`); setError(null); setNotice(null);
    try {
      const confirmation = mode === "live" ? window.prompt(`Para ejecutar en Meta escribí exactamente: EJECUTAR ${id.slice(0, 8)}`) : undefined;
      if (mode === "live" && confirmation === null) return;
      const response = await fetch(`/api/marketing/meta/actions/${id}/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, confirmation }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo procesar la acción.");
      setNotice(mode === "simulate" ? "Simulación válida: no se escribió nada en Meta." : "Acción ejecutada y verificada en Meta."); await load();
    } catch (runError) { setError(runError instanceof Error ? runError.message : "No se pudo procesar la acción."); }
    finally { setActionBusy(null); }
  }

  async function saveExecutionPolicy(executionEnabled: boolean, dryRunOnly: boolean) {
    setError(null); setNotice(null);
    const response = await fetch("/api/marketing/meta/execution-policy", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ executionEnabled, dryRunOnly, allowPause: true, cooldownMinutes: overview?.executionPolicy.cooldownMinutes || 30 }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setError(payload.error || "No se pudo guardar la política."); return; }
    setNotice(dryRunOnly || !executionEnabled ? "Modo simulación activado." : "Ejecución controlada activada; cada acción sigue requiriendo confirmación."); await load();
  }

  const connection = overview?.connection;
  const kpis = overview?.kpis;
  const missingConfig = (connection?.missingEnvironmentVariables.length || 0) > 0;
  const objectiveHealth = useMemo(() => {
    if (!kpis || !kpis.spend) return "Sin inversión registrada";
    if (kpis.qualifiedLeads === 0) return "Todavía sin leads calificados";
    return `${integer.format(kpis.qualifiedLeads)} leads con intención comercial`;
  }, [kpis]);

  return <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => <button key={item.value} type="button" onClick={() => setTab(item.value)} className={cn("rounded-pill border px-3 py-2 text-sm font-label transition-colors", tab === item.value ? "border-signal bg-signal text-white" : "border-line bg-white text-graphite hover:bg-paper")}>{item.label}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={period} onChange={(event) => setPeriod(event.target.value as MetaPeriod)} className="h-10 rounded-md border border-line bg-white px-3 text-sm text-carbon outline-none focus:border-signal">
          {periods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        {connection ? <Badge variant={statusVariant(connection.status)} className="h-10 px-3">{friendlyStatus(connection.status)}</Badge> : null}
        {canSync ? <Button onClick={() => void synchronize()} disabled={syncing || missingConfig}>
          <RefreshIcon className={cn("mr-2", syncing && "animate-spin")} size={16} />{syncing ? "Sincronizando" : "Sincronizar"}
        </Button> : null}
      </div>
    </div>

    {error ? <div className="flex items-start gap-3 rounded-md border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger"><AlertTriangleIcon className="mt-0.5 shrink-0" size={17} /><span>{error}</span></div> : null}
    {notice ? <div className="flex items-start gap-3 rounded-md border border-success/20 bg-success-light px-4 py-3 text-sm text-success"><CheckCircleIcon className="mt-0.5 shrink-0" size={17} /><span>{notice}</span></div> : null}
    {missingConfig ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/25 bg-warning-light px-4 py-3">
      <div className="flex items-start gap-3"><AlertTriangleIcon className="mt-0.5 shrink-0 text-warning" size={18} /><div><p className="text-sm font-label text-carbon">Falta conectar la cuenta publicitaria</p><p className="mt-0.5 text-xs text-graphite">Variables pendientes en producción: {connection?.missingEnvironmentVariables.join(", ")}. El CRM ya está preparado y no ejecuta cambios en Meta.</p></div></div>
      <Badge variant="warning">Solo lectura</Badge>
    </div> : null}

    {loading && !overview ? <Card className="py-16 text-center text-sm text-graphite">Cargando métricas de Meta y CRM...</Card> : null}

    {overview && tab === "resumen" ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Salud operativa" value={`${overview.healthScore}/100`} detail={`${overview.recommendations.filter((item) => item.status === "open").length} alertas abiertas`} tone={overview.healthScore >= 80 ? "success" : "warning"} />
        <MetricCard label="Inversión" value={money.format(kpis?.spend || 0)} detail={`${integer.format(kpis?.impressions || 0)} impresiones`} />
        <MetricCard label="Leads en Meta" value={integer.format(kpis?.platformLeads || 0)} detail={kpis?.costPerLead ? `${decimalMoney.format(kpis.costPerLead)} por lead` : "Sin CPL calculable"} />
        <MetricCard label="Leads en CRM" value={integer.format(kpis?.crmLeads || 0)} detail={`${integer.format(kpis?.qualifiedLeads || 0)} calificados`} tone={kpis?.qualifiedLeads ? "success" : "warning"} />
        <MetricCard label="Costo por calificado" value={kpis?.costPerQualifiedLead ? decimalMoney.format(kpis.costPerQualifiedLead) : "—"} detail={objectiveHealth} />
        <MetricCard label="CTR de enlace" value={metricPct(kpis?.ctr || 0)} detail={`${integer.format(kpis?.linkClicks || 0)} clics`} />
        <MetricCard label="Frecuencia" value={decimal.format(kpis?.frequency || 0)} detail={`${integer.format(kpis?.reach || 0)} personas alcanzadas`} />
        <MetricCard label="Ventas ganadas" value={integer.format(kpis?.wonLeads || 0)} detail={`${money.format(kpis?.collectedRevenue || 0)} cobrado`} tone={kpis?.wonLeads ? "success" : "default"} />
        <MetricCard label="Cash ROAS" value={ratio(kpis?.cashRoas ?? null)} detail="Cobrado atribuible / inversión" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.7fr)]">
        <Card padding="none" className="min-w-0 overflow-hidden">
          <div className="flex items-start justify-between border-b border-line-soft px-5 py-4"><div><p className="font-title text-lg text-carbon">Inversión y generación de demanda</p><p className="mt-1 text-xs text-graphite">Serie diaria sincronizada desde Meta y el CRM.</p></div><BarChartIcon className="text-signal" size={20} /></div>
          {overview.trend.length ? <div className="h-[280px] px-2 pb-3 pt-5"><ResponsiveContainer width="100%" height="100%"><LineChart data={overview.trend} margin={{ top: 5, right: 15, bottom: 0, left: 4 }}>
            <CartesianGrid stroke={chartTheme.grid.stroke} vertical={false} /><XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} tickFormatter={(value) => String(value).slice(5)} />
            <YAxis yAxisId="money" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} /><YAxis yAxisId="leads" orientation="right" tick={chartTheme.axis.tick} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ border: `1px solid ${chartTheme.colors.line}`, borderRadius: 8, fontSize: 12 }} formatter={(value: number | string, name: string) => [name === "Inversión" ? decimalMoney.format(Number(value)) : integer.format(Number(value)), name]} />
            <Line yAxisId="money" type="monotone" dataKey="spend" name="Inversión" stroke={chartTheme.colors.signal} strokeWidth={2} dot={false} />
            <Line yAxisId="leads" type="monotone" dataKey="crmLeads" name="Leads CRM" stroke={chartTheme.colors.success} strokeWidth={2} dot={false} />
          </LineChart></ResponsiveContainer></div> : <div className="px-6 py-12"><EmptyState icon={BarChartIcon} titulo="Aún no hay serie de inversión" descripcion="La primera sincronización va a completar el histórico de 90 días." /></div>}
        </Card>
        <Card padding="none" className="overflow-hidden">
          <div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Embudo atribuible</p><p className="mt-1 text-xs text-graphite">Del lead en CRM a la venta.</p></div>
          <div className="divide-y divide-line-soft">{overview.funnel.map((stage, index) => <div key={stage.key} className="px-5 py-3"><div className="flex items-center justify-between gap-4"><span className="text-sm text-carbon">{stage.label}</span><span className="font-title text-lg tabular-nums text-carbon">{integer.format(stage.count)}</span></div><div className="mt-1 flex justify-between text-xs text-graphite"><span>{index ? `${pct(stage.conversionFromPrevious)} del paso anterior` : "Entrada atribuida"}</span><span>{index ? `${pct(stage.conversionFromLead)} del total` : "100%"}</span></div></div>)}</div>
        </Card>
      </div>
    </> : null}

    {tab === "web" ? <MarketingHubPanel mode="web" period={period} /> : null}
    {tab === "leads" ? <MarketingHubPanel mode="leads" period={period} /> : null}
    {tab === "inteligencia" ? <MarketingIntelligencePanel /> : null}
    {tab === "instagram" ? <MarketingHubPanel mode="instagram" period={period} /> : null}
    {tab === "whatsapp" ? <MarketingHubPanel mode="whatsapp" period={period} /> : null}

    {overview && tab === "campanas" ? overview.campaigns.length ? <DataTable className="min-w-[1180px]">
      <DataTableHeader><DataTableRow><DataTableHead>Campaña</DataTableHead><DataTableHead>Estado</DataTableHead><DataTableHead className="text-right">Inversión</DataTableHead><DataTableHead className="text-right">CTR</DataTableHead><DataTableHead className="text-right">Leads Meta</DataTableHead><DataTableHead className="text-right">Leads CRM</DataTableHead><DataTableHead className="text-right">Calificados</DataTableHead><DataTableHead className="text-right">CPQL</DataTableHead><DataTableHead className="text-right">Ganados</DataTableHead><DataTableHead className="text-right">Cobrado</DataTableHead><DataTableHead className="text-right">Cash ROAS</DataTableHead><DataTableHead className="text-right">Control</DataTableHead></DataTableRow></DataTableHeader>
      <DataTableBody>{overview.campaigns.map((row) => <DataTableRow key={row.id}><DataTableCell><p className="max-w-[280px] truncate font-label text-carbon">{row.name}</p><p className="mt-0.5 text-xs text-graphite">{row.objective || "Sin objetivo informado"}</p></DataTableCell><DataTableCell><Badge variant={statusVariant(row.status)}>{friendlyStatus(row.status)}</Badge></DataTableCell><DataTableCell className="text-right font-label text-carbon">{money.format(row.spend)}</DataTableCell><DataTableCell className="text-right">{metricPct(row.ctr)}</DataTableCell><DataTableCell className="text-right">{integer.format(row.platformLeads)}</DataTableCell><DataTableCell className="text-right">{integer.format(row.crmLeads)}</DataTableCell><DataTableCell className="text-right font-label text-carbon">{integer.format(row.qualifiedLeads)}</DataTableCell><DataTableCell className="text-right">{row.cpql ? decimalMoney.format(row.cpql) : "—"}</DataTableCell><DataTableCell className="text-right">{integer.format(row.wonLeads)}</DataTableCell><DataTableCell className="text-right">{money.format(row.collectedRevenue)}</DataTableCell><DataTableCell className="text-right font-label text-carbon">{ratio(row.cashRoas)}</DataTableCell><DataTableCell className="text-right">{permissions.canCreateActions && row.status === "ACTIVE" ? <Button variant="secondary" size="sm" disabled={actionBusy === row.id} onClick={() => void proposePause("campaign", row.id, row.name)}>Proponer pausa</Button> : "—"}</DataTableCell></DataTableRow>)}</DataTableBody>
    </DataTable> : <EmptyModule title="Todavía no hay campañas sincronizadas" description="Conectá Meta y ejecutá la primera sincronización para comparar inversión con resultados comerciales." /> : null}

    {overview && tab === "creatividad" ? overview.creatives.length ? <DataTable className="min-w-[1180px]">
      <DataTableHeader><DataTableRow><DataTableHead>Anuncio y pieza</DataTableHead><DataTableHead>Formato</DataTableHead><DataTableHead>Estado</DataTableHead><DataTableHead className="text-right">Inversión</DataTableHead><DataTableHead className="text-right">Impresiones</DataTableHead><DataTableHead className="text-right">Hook 3s</DataTableHead><DataTableHead className="text-right">Retención</DataTableHead><DataTableHead className="text-right">CTR</DataTableHead><DataTableHead className="text-right">Leads</DataTableHead><DataTableHead className="text-right">CPL</DataTableHead><DataTableHead className="text-right">Control</DataTableHead></DataTableRow></DataTableHeader>
      <DataTableBody>{overview.creatives.map((row) => <DataTableRow key={`${row.adId}-${row.id}`}><DataTableCell><div className="flex items-center gap-3">{row.thumbnailUrl ? <a href={row.thumbnailUrl} target="_blank" rel="noreferrer" className="block h-14 w-14 shrink-0 overflow-hidden rounded-md border border-line-soft bg-paper"><img src={row.thumbnailUrl} alt={`Preview de ${row.adName}`} className="h-full w-full object-cover" /></a> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-line-soft bg-paper text-signal"><MegaphoneIcon size={18} /></div>}<div><p className="max-w-[340px] truncate font-label text-carbon">{row.adName}</p><p className="mt-0.5 max-w-[340px] truncate text-xs text-graphite">{row.title || row.body || row.creativeName}</p><p className="mt-1 text-[11px] text-graphite">{row.thumbnailUrl ? "Abrir preview" : "Sin preview disponible"}</p></div></div></DataTableCell><DataTableCell>{row.format || "—"}</DataTableCell><DataTableCell><Badge variant={statusVariant(row.status)}>{friendlyStatus(row.status)}</Badge></DataTableCell><DataTableCell className="text-right">{money.format(row.spend)}</DataTableCell><DataTableCell className="text-right">{integer.format(row.impressions)}</DataTableCell><DataTableCell className="text-right">{pct(row.hookRate)}</DataTableCell><DataTableCell className="text-right">{pct(row.holdRate)}</DataTableCell><DataTableCell className="text-right">{metricPct(row.ctr)}</DataTableCell><DataTableCell className="text-right">{integer.format(row.platformLeads)}</DataTableCell><DataTableCell className="text-right">{row.cpl ? decimalMoney.format(row.cpl) : "—"}</DataTableCell><DataTableCell className="text-right">{permissions.canCreateActions && row.status === "ACTIVE" ? <Button variant="secondary" size="sm" disabled={actionBusy === row.adId} onClick={() => void proposePause("ad", row.adId, row.adName)}>Proponer pausa</Button> : "—"}</DataTableCell></DataTableRow>)}</DataTableBody>
    </DataTable> : <EmptyModule title="Todavía no hay creatividades" description="Las piezas aparecerán con su inversión, respuesta y costo por lead después de sincronizar Meta." /> : null}

    {overview && tab === "embudo" ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Conversión de principio a fin</p><p className="mt-1 text-xs text-graphite">Los estados comerciales se toman directamente del CRM.</p></div><div className="p-5">{overview.funnel.map((stage, index) => <div key={stage.key} className="relative pb-5 last:pb-0"><div className="flex items-center gap-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-signal/20 bg-signal-light text-sm font-label text-signal">{index + 1}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-4"><span className="font-label text-carbon">{stage.label}</span><span className="font-title text-xl tabular-nums text-carbon">{integer.format(stage.count)}</span></div><div className="mt-2 h-2 overflow-hidden rounded-pill bg-paper"><div className="h-full rounded-pill bg-signal" style={{ width: `${Math.max(2, (stage.conversionFromLead ?? 0) * 100)}%` }} /></div><p className="mt-1 text-xs text-graphite">{index ? `${pct(stage.conversionFromPrevious)} desde el paso anterior · ${pct(stage.conversionFromLead)} desde lead` : "Todos los leads Meta registrados en el período"}</p></div></div>{index < overview.funnel.length - 1 ? <div className="absolute bottom-1 left-[17px] top-10 w-px bg-line" /> : null}</div>)}</div></Card>
      <div className="space-y-4"><MetricCard label="Landing page → Lead Meta" value={pct(kpis?.landingPageViews ? (kpis.platformLeads / kpis.landingPageViews) : null)} detail={`${integer.format(kpis?.landingPageViews || 0)} visitas a landing`} /><MetricCard label="Meta → CRM" value={pct(kpis?.platformLeads ? (kpis.crmLeads / kpis.platformLeads) : null)} detail="Control de pérdida de atribución" /><MetricCard label="Lead → Calificado" value={pct(kpis?.crmLeads ? (kpis.qualifiedLeads / kpis.crmLeads) : null)} detail="Calidad real de la demanda" /><MetricCard label="Lead → Venta" value={pct(kpis?.crmLeads ? (kpis.wonLeads / kpis.crmLeads) : null)} detail={`${integer.format(kpis?.wonLeads || 0)} oportunidades ganadas`} /></div>
    </div> : null}

    {overview && tab === "acciones" ? <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Pendientes de aprobación" value={integer.format(overview.actions.filter((item) => item.status === "pending_approval").length)} detail="Requieren decisión de un administrador" tone={overview.actions.some((item) => item.status === "pending_approval") ? "warning" : "default"} />
        <MetricCard label="Aprobadas" value={integer.format(overview.actions.filter((item) => item.status === "approved").length)} detail="Requieren simulación antes de ejecutar" />
        <MetricCard label="Ejecutadas" value={integer.format(overview.actions.filter((item) => item.status === "executed").length)} detail="Cambios verificados en Meta" tone="success" />
      </div>
      <Card padding="none" className="overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4"><div><p className="font-title text-lg text-carbon">Política de ejecución</p><p className="mt-1 text-xs text-graphite">Doble kill switch, allowlist de pausas y enfriamiento de {overview.executionPolicy.cooldownMinutes} minutos.</p></div><Badge variant={connection?.writeAccessEnabled ? "success" : "warning"}>{connection?.writeAccessEnabled ? "Ejecución habilitada" : "Solo simulación"}</Badge></div><div className="grid gap-3 p-5 sm:grid-cols-3"><div><p className="text-xs font-label text-graphite">Vercel</p><p className="mt-1 text-sm text-carbon">{overview.executionPolicy.environmentWriteEnabled ? "Kill switch habilitado" : "Escritura desactivada"}</p></div><div><p className="text-xs font-label text-graphite">Base de datos</p><p className="mt-1 text-sm text-carbon">{overview.executionPolicy.executionEnabled && !overview.executionPolicy.dryRunOnly ? "Modo ejecución" : "Modo simulación"}</p></div><div><p className="text-xs font-label text-graphite">Acciones permitidas</p><p className="mt-1 text-sm text-carbon">Pausar · No reactivar · No presupuesto</p></div>{permissions.canEditExecutionPolicy ? <div className="flex flex-wrap gap-2 sm:col-span-3 sm:justify-end"><Button variant="secondary" size="sm" onClick={() => void saveExecutionPolicy(false, true)}>Forzar simulación</Button><Button size="sm" disabled={!overview.executionPolicy.environmentWriteEnabled} onClick={() => void saveExecutionPolicy(true, false)}>Habilitar ejecución</Button></div> : null}</div></Card>
      <div className="flex items-start gap-3 rounded-md border border-warning/25 bg-warning-light px-4 py-3"><AlertTriangleIcon className="mt-0.5 shrink-0 text-warning" size={18} /><div><p className="text-sm font-label text-carbon">Aprobar no ejecuta</p><p className="mt-0.5 text-xs text-graphite">Toda pausa exige aprobación, simulación válida, ambos kill switches y una confirmación escrita con el identificador de la acción.</p></div></div>
      {overview.actions.length ? <DataTable className="min-w-[1220px]">
        <DataTableHeader><DataTableRow><DataTableHead>Acción propuesta</DataTableHead><DataTableHead>Entidad</DataTableHead><DataTableHead>Riesgo</DataTableHead><DataTableHead>Estado</DataTableHead><DataTableHead>Solicitada</DataTableHead><DataTableHead className="text-right">Decisión</DataTableHead></DataTableRow></DataTableHeader>
        <DataTableBody>{overview.actions.map((action) => <DataTableRow key={action.id}><DataTableCell><div className="flex items-start gap-3"><div className="mt-0.5 rounded-md bg-signal-light p-2 text-signal"><WrenchIcon size={16} /></div><div><p className="max-w-[380px] font-label text-carbon">{action.title}</p><p className="mt-1 max-w-[480px] text-xs text-graphite">{action.proposedAction}</p>{action.simulatedAt ? <p className="mt-1 text-[11px] text-success">Simulada {new Date(action.simulatedAt).toLocaleString("es-AR")}</p> : null}{action.errorMessage ? <p className="mt-1 text-[11px] text-danger">{action.errorMessage}</p> : null}</div></div></DataTableCell><DataTableCell><p className="text-sm text-carbon">{action.entityType || "Cuenta"}</p><p className="max-w-[150px] truncate text-xs text-graphite">{action.entityId || "General"}</p></DataTableCell><DataTableCell><Badge variant={action.riskLevel === "high" ? "danger" : action.riskLevel === "medium" ? "warning" : "default"}>{action.riskLevel === "high" ? "Alto" : action.riskLevel === "medium" ? "Medio" : "Bajo"}</Badge></DataTableCell><DataTableCell><Badge variant={statusVariant(action.status)}>{friendlyStatus(action.status)}</Badge></DataTableCell><DataTableCell className="text-sm text-graphite">{new Date(action.requestedAt).toLocaleString("es-AR")}</DataTableCell><DataTableCell><div className="flex flex-wrap justify-end gap-2">{permissions.canReviewActions && action.status === "pending_approval" ? <><Button size="sm" onClick={() => void reviewAction(action.id, "approved")}>Aprobar</Button><Button variant="secondary" size="sm" onClick={() => void reviewAction(action.id, "rejected")}>Rechazar</Button></> : null}{permissions.canExecuteActions && action.status === "approved" && action.actionType === "pause_entity" ? <><Button variant="secondary" size="sm" disabled={actionBusy === `${action.id}-simulate`} onClick={() => void runAction(action.id, "simulate")}>Simular</Button><Button size="sm" disabled={!action.simulatedAt || !connection?.writeAccessEnabled || actionBusy === `${action.id}-live`} onClick={() => void runAction(action.id, "live")}>Ejecutar</Button></> : null}{permissions.canReviewActions && action.status === "approved" ? <Button variant="ghost" size="sm" onClick={() => void reviewAction(action.id, "cancelled")}>Cancelar</Button> : null}</div></DataTableCell></DataTableRow>)}</DataTableBody>
      </DataTable> : <Card className="py-12"><EmptyState icon={WrenchIcon} titulo="Todavía no hay acciones propuestas" descripcion="Cuando aparezca una alerta, usá “Proponer acción” para enviarla a aprobación y dejar trazabilidad de la decisión." /></Card>}
    </div> : null}

    {overview && tab === "operacion" ? <div className="grid gap-4 xl:grid-cols-2">
      <Card padding="none" className="overflow-hidden"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Conexión y seguridad</p><p className="mt-1 text-xs text-graphite">Estado técnico de la integración.</p></div><div className="divide-y divide-line-soft">
        {[{ label: "Cuenta publicitaria", value: connection?.accountName || connection?.adAccountId || "Pendiente", ok: connection?.status === "connected" }, { label: "Credenciales de servidor", value: missingConfig ? "Configuración incompleta" : "Disponibles", ok: !missingConfig }, { label: "Ejecución controlada", value: connection?.writeAccessEnabled ? "Habilitada con confirmación" : "Solo simulación", ok: true }, { label: "Vencimiento del token", value: connection?.tokenExpiresAt ? new Date(connection.tokenExpiresAt).toLocaleString("es-AR") : "Sin fecha registrada", ok: Boolean(connection?.tokenExpiresAt) }, { label: "Última sincronización", value: connection?.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString("es-AR") : "Nunca", ok: Boolean(connection?.lastSyncAt) }].map((item) => <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3"><div className="flex items-center gap-3">{item.ok ? <CheckCircleIcon className="text-success" size={18} /> : <ClockIcon className="text-warning" size={18} />}<span className="text-sm text-carbon">{item.label}</span></div><span className="max-w-[55%] truncate text-right text-xs text-graphite">{item.value}</span></div>)}
      </div></Card>
      <Card padding="none" className="overflow-hidden"><div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4"><div><p className="font-title text-lg text-carbon">Alertas y recomendaciones</p><p className="mt-1 text-xs text-graphite">Persistentes, auditables y sin ejecución automática.</p></div>{permissions.canAnalyze ? <Button variant="secondary" size="sm" onClick={() => void analyze()} disabled={analyzing}><SparklesIcon className={cn("mr-2", analyzing && "animate-pulse")} size={15} />{analyzing ? "Analizando" : "Analizar"}</Button> : null}</div>{overview.recommendations.length ? <div className="max-h-[520px] divide-y divide-line-soft overflow-y-auto">{overview.recommendations.map((item) => <div key={item.id} className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><SparklesIcon className="text-signal" size={16} /><p className="min-w-0 flex-1 font-label text-carbon">{item.title}</p><Badge variant={item.status === "acknowledged" ? "default" : statusVariant(item.severity)}>{item.status === "acknowledged" ? "En seguimiento" : item.severity}</Badge></div><p className="mt-2 text-sm text-graphite">{item.rationale}</p><p className="mt-2 text-xs font-label text-signal">Acción: {item.recommendedAction}</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-[11px] text-graphite">Detectada {item.occurrences} {item.occurrences === 1 ? "vez" : "veces"}</span>{item.id !== "configuration" ? <div className="flex flex-wrap gap-2">{permissions.canCreateActions ? <Button size="sm" onClick={() => void createAction(item.id)}>Proponer acción</Button> : null}{permissions.canManageRecommendations && item.status === "open" ? <Button variant="secondary" size="sm" onClick={() => void updateRecommendation(item.id, "acknowledged")}>Reconocer</Button> : null}{permissions.canManageRecommendations ? <Button variant="ghost" size="sm" onClick={() => void updateRecommendation(item.id, "dismissed")}>Descartar</Button> : null}</div> : null}</div></div>)}</div> : <div className="px-6 py-10"><EmptyState icon={SparklesIcon} titulo="Sin alertas activas" descripcion="La cuenta está dentro de los objetivos definidos o todavía no tiene suficiente entrega." /></div>}</Card>
      <Card padding="none" className="overflow-hidden xl:col-span-2"><div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4"><div><p className="font-title text-lg text-carbon">Objetivos y guardrails</p><p className="mt-1 text-xs text-graphite">Definen cuándo alertar; nunca cambian presupuesto ni campañas.</p></div><Badge variant="default">Fase 2</Badge></div>{guardrails ? <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4"><GuardrailField label="CPL objetivo" value={guardrails.targetCpl} suffix="USD" disabled={!permissions.canEditGuardrails} onChange={(value) => setGuardrails({ ...guardrails, targetCpl: value })} /><GuardrailField label="CPQL objetivo" value={guardrails.targetCpql} suffix="USD" disabled={!permissions.canEditGuardrails} onChange={(value) => setGuardrails({ ...guardrails, targetCpql: value })} /><GuardrailField label="Cash ROAS objetivo" value={guardrails.targetCashRoas} suffix="x" disabled={!permissions.canEditGuardrails} onChange={(value) => setGuardrails({ ...guardrails, targetCashRoas: value })} /><GuardrailField label="CTR mínimo" value={guardrails.minLinkCtr} suffix="%" disabled={!permissions.canEditGuardrails} onChange={(value) => setGuardrails({ ...guardrails, minLinkCtr: value })} /><GuardrailField label="Frecuencia máxima" value={guardrails.maxFrequency} suffix="x" disabled={!permissions.canEditGuardrails} onChange={(value) => setGuardrails({ ...guardrails, maxFrequency: value })} /><GuardrailField label="Brecha atribución máxima" value={guardrails.maxAttributionGapPct} suffix="%" disabled={!permissions.canEditGuardrails} onChange={(value) => setGuardrails({ ...guardrails, maxAttributionGapPct: value })} /><GuardrailField label="Gasto mínimo para alertar" value={guardrails.minSpendForAlert} suffix="USD" disabled={!permissions.canEditGuardrails} onChange={(value) => setGuardrails({ ...guardrails, minSpendForAlert: value })} /><GuardrailField label="Sync atrasado después de" value={guardrails.staleSyncHours} suffix="horas" disabled={!permissions.canEditGuardrails} onChange={(value) => setGuardrails({ ...guardrails, staleSyncHours: value })} />{permissions.canEditGuardrails ? <div className="sm:col-span-2 xl:col-span-4 flex justify-end"><Button onClick={() => void saveGuardrails()} disabled={savingGuardrails}>{savingGuardrails ? "Guardando" : "Guardar objetivos"}</Button></div> : null}</div> : null}</Card>
      <Card padding="none" className="overflow-hidden xl:col-span-2"><div className="border-b border-line-soft px-5 py-4"><p className="font-title text-lg text-carbon">Historial de sincronización</p><p className="mt-1 text-xs text-graphite">Trazabilidad completa de ejecuciones manuales y programadas.</p></div>{overview.runs.length ? <DataTable wrapperClassName="rounded-none border-0"><DataTableHeader><DataTableRow><DataTableHead>Inicio</DataTableHead><DataTableHead>Origen</DataTableHead><DataTableHead>Estado</DataTableHead><DataTableHead className="text-right">Registros</DataTableHead><DataTableHead>Detalle</DataTableHead></DataTableRow></DataTableHeader><DataTableBody>{overview.runs.map((run) => <DataTableRow key={run.id}><DataTableCell>{new Date(run.startedAt).toLocaleString("es-AR")}</DataTableCell><DataTableCell>{run.triggerType === "cron" ? "Programada" : "Manual"}</DataTableCell><DataTableCell><Badge variant={statusVariant(run.status)}>{friendlyStatus(run.status)}</Badge></DataTableCell><DataTableCell className="text-right">{integer.format(run.records)}</DataTableCell><DataTableCell className="max-w-[420px] truncate">{run.errorMessage || "Sin observaciones"}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <div className="px-6 py-10"><EmptyState icon={ClockIcon} titulo="Todavía no hay ejecuciones" descripcion="El historial comenzará con la primera sincronización manual o programada." /></div>}</Card>
    </div> : null}
  </div>;
}
