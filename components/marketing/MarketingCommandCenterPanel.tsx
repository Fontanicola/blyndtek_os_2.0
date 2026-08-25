"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge, Button, Card, Input, Modal } from "@/components/ui";
import { AlertTriangleIcon, BarChartIcon, CalendarIcon, CheckCircleIcon, ClockIcon, PlusIcon, RefreshIcon, SparklesIcon, TareasIcon, TrendingUpIcon, UsersIcon, VideoIcon } from "@/components/ui/icons";
import { chartTheme } from "@/lib/charts/chartTheme";
import type { MarketingCommandCenter } from "@/types/marketingCommand";
import type { MarketingHubPeriod } from "@/types/marketingHub";

type Props = { period: MarketingHubPeriod; mode?: "overview" | "experiments" | "planning" };
type Response = { data?: MarketingCommandCenter; permissions?: { canEditGoals: boolean; canCreateExperiments: boolean; canCreateTasks: boolean }; error?: string };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const decimalMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const pct = (value: number | null) => value == null ? "—" : `${(value * 100).toFixed(1)}%`;
const ratio = (value: number | null) => value == null ? "—" : `${value.toFixed(2)}x`;

function tone(status: string) {
  return status === "healthy" || status === "completed" || status === "winner" ? "success" as const : status === "critical" || status === "loser" ? "danger" as const : status === "warning" || status === "watch" || status === "fatigued" ? "warning" as const : "default" as const;
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <Card className={accent ? "border-signal/20 bg-signal-light/20" : ""}><p className="text-xs font-label uppercase tracking-wide text-graphite">{label}</p><p className="mt-2 font-title text-2xl text-carbon">{value}</p><p className="mt-1 text-xs leading-5 text-graphite">{detail}</p></Card>;
}

export function MarketingCommandCenterPanel({ period, mode = "overview" }: Props) {
  const [data, setData] = useState<MarketingCommandCenter | null>(null);
  const [permissions, setPermissions] = useState<Response["permissions"]>(undefined);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState<Record<string, string>>({});
  const [experimentDraft, setExperimentDraft] = useState({ title: "", hypothesis: "", category: "creative", primaryMetric: "qualified_leads", budgetUsd: "", targetValue: "" });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/marketing/command-center?period=${period}`, { cache: "no-store" });
      const payload = await response.json() as Response;
      if (!response.ok || !payload.data) throw new Error(payload.error || "No se pudo cargar Marketing Command.");
      setData(payload.data); setPermissions(payload.permissions);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar Marketing Command."); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    setGoalDraft({ budgetUsd: String(data.goal.budgetUsd || ""), leadsTarget: String(data.goal.leadsTarget || ""), qualifiedLeadsTarget: String(data.goal.qualifiedLeadsTarget || ""), wonLeadsTarget: String(data.goal.wonLeadsTarget || ""), revenueTargetUsd: String(data.goal.revenueTargetUsd || ""), targetCpl: String(data.goal.targetCpl || ""), targetCpql: String(data.goal.targetCpql || ""), targetCac: String(data.goal.targetCac || ""), targetCashRoas: String(data.goal.targetCashRoas || "") });
  }, [data]);

  async function refreshPriorities() {
    setBusy("refresh"); setError(null);
    try {
      const response = await fetch("/api/marketing/command-center", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh", period }) });
      const payload = await response.json() as Response;
      if (!response.ok || !payload.data) throw new Error(payload.error || "No se pudieron actualizar las prioridades.");
      setData(payload.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron actualizar las prioridades."); }
    finally { setBusy(null); }
  }

  async function createTask(priorityId: string) {
    setBusy(priorityId); setError(null);
    try {
      const response = await fetch("/api/marketing/command-center", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_task", priorityId }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo crear la tarea.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la tarea."); }
    finally { setBusy(null); }
  }

  async function saveGoals() {
    if (!data) return;
    setBusy("goal"); setError(null);
    try {
      const response = await fetch("/api/marketing/goals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodMonth: data.goal.periodMonth, ...goalDraft }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudieron guardar los objetivos.");
      setGoalOpen(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron guardar los objetivos."); }
    finally { setBusy(null); }
  }

  async function createExperiment() {
    setBusy("experiment"); setError(null);
    try {
      const response = await fetch("/api/marketing/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(experimentDraft) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo crear el experimento.");
      setExperimentOpen(false); setExperimentDraft({ title: "", hypothesis: "", category: "creative", primaryMetric: "qualified_leads", budgetUsd: "", targetValue: "" }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el experimento."); }
    finally { setBusy(null); }
  }

  async function updateExperiment(id: string, status: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/marketing/experiments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar el experimento.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar el experimento."); }
    finally { setBusy(null); }
  }

  const goalProgress = useMemo(() => data ? [
    { label: "Presupuesto", actual: data.actuals.spend, target: data.goal.budgetUsd, format: money.format },
    { label: "Leads", actual: data.actuals.leads, target: data.goal.leadsTarget, format: integer.format },
    { label: "Calificados", actual: data.actuals.qualifiedLeads, target: data.goal.qualifiedLeadsTarget, format: integer.format },
    { label: "Ventas", actual: data.actuals.wonLeads, target: data.goal.wonLeadsTarget, format: integer.format },
    { label: "Ingresos", actual: data.actuals.revenue, target: data.goal.revenueTargetUsd, format: money.format },
  ] : [], [data]);

  if (loading && !data) return <Card className="py-14 text-center text-sm text-graphite">Construyendo lectura operativa...</Card>;
  if (!data) return <Card className="border-danger/20 bg-danger-light text-sm text-danger">{error || "No se pudo cargar el centro de decisiones."}</Card>;

  if (mode === "experiments") return (
    <div className="space-y-4">
      {error ? <Card className="border-danger/20 bg-danger-light text-sm text-danger">{error}</Card> : null}
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-title text-xl text-carbon">Laboratorio de crecimiento</h2><p className="mt-1 text-sm text-graphite">Una hipótesis, una variable principal y un aprendizaje por prueba.</p></div><Button size="sm" onClick={() => setExperimentOpen(true)}><PlusIcon size={15}/>Nuevo experimento</Button></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.experiments.map((experiment) => <Card key={experiment.id} className="flex flex-col gap-4"><div className="flex items-start justify-between gap-3"><div><p className="font-label text-carbon">{experiment.title}</p><p className="mt-1 text-sm leading-6 text-graphite">{experiment.hypothesis}</p></div><Badge variant={tone(experiment.status)}>{experiment.status}</Badge></div><div className="grid grid-cols-3 gap-2 rounded-md bg-paper p-3 text-center text-xs"><div><p className="font-label text-carbon">{experiment.category}</p><p className="text-graphite">Categoría</p></div><div><p className="font-label text-carbon">{experiment.primaryMetric}</p><p className="text-graphite">KPI</p></div><div><p className="font-label text-carbon">{money.format(experiment.budgetUsd)}</p><p className="text-graphite">Presupuesto</p></div></div>{experiment.learning ? <p className="rounded-md border border-success/20 bg-success-light p-3 text-sm text-carbon">Aprendizaje: {experiment.learning}</p> : null}<div className="flex justify-end gap-2">{experiment.status === "planned" || experiment.status === "draft" ? <Button size="sm" variant="secondary" loading={busy === experiment.id} onClick={() => void updateExperiment(experiment.id, "running")}>Iniciar</Button> : null}{experiment.status === "running" ? <Button size="sm" loading={busy === experiment.id} onClick={() => void updateExperiment(experiment.id, "completed")}>Cerrar prueba</Button> : null}</div></Card>)}
        {!data.experiments.length ? <Card className="lg:col-span-2 py-12 text-center"><SparklesIcon className="mx-auto text-signal"/><p className="mt-3 font-label text-carbon">Todavía no hay experimentos</p><p className="mt-1 text-sm text-graphite">Registrá la primera hipótesis antes de modificar campañas.</p></Card> : null}
      </div>
      <div><h3 className="mb-3 font-title text-lg text-carbon">Señales creativas</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.creativeSignals.map((creative) => <Card key={creative.adId}><div className="flex items-start justify-between gap-2"><VideoIcon className="text-signal"/><Badge variant={tone(creative.fatigue)}>{creative.fatigue === "fatigued" ? "Fatigada" : creative.fatigue === "watch" ? "Vigilar" : "Fresca"}</Badge></div><p className="mt-3 line-clamp-1 font-label text-carbon">{creative.name}</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span>CTR <b>{creative.ctr.toFixed(2)}%</b></span><span>CPL <b>{creative.cpl ? decimalMoney.format(creative.cpl) : "—"}</b></span><span>Freq. <b>{creative.frequency.toFixed(1)}</b></span></div><p className="mt-3 text-xs leading-5 text-graphite">{creative.recommendation}</p></Card>)}</div></div>
      <ExperimentModal open={experimentOpen} onClose={() => setExperimentOpen(false)} draft={experimentDraft} setDraft={setExperimentDraft} busy={busy === "experiment"} save={() => void createExperiment()} />
    </div>
  );

  if (mode === "planning") return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tareas abiertas de Luli" value={integer.format(data.contentOperations.luli.openTasks)} detail={`${data.contentOperations.luli.overdueTasks} vencidas`} accent/><Metric label="Capacidad diaria" value={`${Math.round(data.contentOperations.luli.capacityMinutes / 60)} h`} detail={data.contentOperations.luli.automationEnabled ? "Revisión automática activa a las 17:00" : "Automatización pausada"}/><Metric label="Programadas 7 días" value={integer.format(data.contentOperations.scheduledNext7Days)} detail="Piezas con fecha confirmada"/><Metric label="Sin calendario" value={integer.format(data.contentOperations.missingSchedule)} detail="Ideas o borradores que necesitan decisión"/></div>
      <Card><div className="flex items-center justify-between"><div><p className="font-title text-lg text-carbon">Pipeline de producción</p><p className="mt-1 text-xs text-graphite">Idea → brief → producción → aprobación → publicación.</p></div><a href="/marca/feed" className="text-sm font-label text-signal hover:underline">Abrir estudio</a></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{data.contentOperations.pipeline.map((stage) => <div key={stage.status} className="rounded-md border border-line-soft bg-paper/60 p-4"><p className="text-xs uppercase tracking-wide text-graphite">{stage.status}</p><p className="mt-2 font-title text-2xl text-carbon">{stage.count}</p></div>)}</div></Card>
      <div className="grid gap-4 lg:grid-cols-2"><Card><div className="flex items-center gap-2"><UsersIcon className="text-signal"/><p className="font-title text-lg text-carbon">Salud del seguimiento</p></div><div className="mt-4 space-y-3">{[["Leads sin responsable", data.funnelHealth.unassignedLeads], ["Leads detenidos +72 h", data.funnelHealth.staleLeads], ["Leads sin atribución", data.funnelHealth.unattributedLeads]].map(([label, value]) => <div key={String(label)} className="flex items-center justify-between border-b border-line-soft pb-3"><span className="text-sm text-graphite">{label}</span><Badge variant={Number(value) ? "warning" : "success"}>{String(value)}</Badge></div>)}</div></Card><Card><div className="flex items-center gap-2"><ClockIcon className="text-signal"/><p className="font-title text-lg text-carbon">Rutina automática</p></div><ol className="mt-4 space-y-3 text-sm leading-6 text-graphite"><li>1. A las 17:00 revisa pendientes, bloqueos y capacidad.</li><li>2. Cruza necesidades de contenido con campaña y calendario.</li><li>3. Sólo crea tareas para Luli cuando tiene capacidad real.</li><li>4. Cada tarea incluye motivo, acción y criterio de entrega.</li></ol></Card></div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error ? <Card className="border-danger/20 bg-danger-light text-sm text-danger">{error}</Card> : null}
      <Card className="overflow-hidden border-signal/15 bg-gradient-to-br from-white via-white to-signal-light/35"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><SparklesIcon className="text-signal" size={18}/><p className="text-xs font-label uppercase tracking-[0.16em] text-signal">Decisiones de hoy</p></div><h2 className="mt-2 font-title text-2xl text-carbon">Qué conviene hacer ahora</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-graphite">Priorizado por impacto, confianza y esfuerzo. Convertí una recomendación en tarea cuando decidas ejecutarla.</p></div><Button size="sm" variant="secondary" loading={busy === "refresh"} onClick={() => void refreshPriorities()}><RefreshIcon size={15}/>Actualizar lectura</Button></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{data.priorities.slice(0, 6).map((priority, index) => <div key={priority.id || priority.title} className="rounded-md border border-line-soft bg-white p-4"><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-xs font-label text-white">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-label text-carbon">{priority.title}</p><Badge variant={priority.impact === "high" ? "warning" : "default"}>{priority.impact === "high" ? "Impacto alto" : "Impacto medio"}</Badge></div><p className="mt-1 text-xs leading-5 text-graphite">{priority.reason}</p><p className="mt-2 text-sm text-carbon">{priority.action}</p><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-graphite">Confianza {priority.confidence}% · esfuerzo {priority.effort}</span>{priority.taskId ? <Badge variant="success">Tarea creada</Badge> : priority.id && permissions?.canCreateTasks ? <Button size="sm" variant="ghost" loading={busy === priority.id} onClick={() => void createTask(priority.id!)}><TareasIcon size={14}/>Crear tarea</Button> : null}</div></div></div></div>)}</div></Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Inversión del mes" value={money.format(data.actuals.spend)} detail={`${money.format(data.pacing.expectedSpend)} esperados a hoy`}/><Metric label="CPL real" value={data.actuals.cpl ? decimalMoney.format(data.actuals.cpl) : "—"} detail={`${data.actuals.leads} leads CRM`}/><Metric label="Costo por calificado" value={data.actuals.cpql ? decimalMoney.format(data.actuals.cpql) : "—"} detail={`${data.actuals.qualifiedLeads} calificados`}/><Metric label="CAC" value={data.actuals.cac ? decimalMoney.format(data.actuals.cac) : "—"} detail={`${data.actuals.wonLeads} clientes ganados`}/><Metric label="Cash ROAS" value={ratio(data.actuals.cashRoas)} detail={`${money.format(data.actuals.revenue)} cobrado`} accent/></div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]"><Card padding="none" className="overflow-hidden"><div className="flex items-center justify-between border-b border-line-soft px-5 py-4"><div><p className="font-title text-lg text-carbon">Pacing mensual</p><p className="mt-1 text-xs text-graphite">Inversión acumulada real versus plan.</p></div><TrendingUpIcon className="text-signal"/></div><div className="h-[270px] px-2 pb-3 pt-5"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.pacing.trend} margin={{ left: -12, right: 14 }}><CartesianGrid stroke={chartTheme.grid.stroke} vertical={false}/><XAxis dataKey="date" tick={chartTheme.axis.tick} axisLine={false} tickLine={false}/><YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="cumulativeSpend" name="Real" stroke={chartTheme.colors.signal} strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="cumulativePlan" name="Plan" stroke={chartTheme.colors.graphite} strokeDasharray="5 5" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></Card><Card><div className="flex items-center justify-between"><div><p className="font-title text-lg text-carbon">Objetivos del mes</p><p className="mt-1 text-xs text-graphite">Avance y proyección.</p></div>{permissions?.canEditGoals ? <Button size="sm" variant="ghost" onClick={() => setGoalOpen(true)}>Editar</Button> : null}</div><div className="mt-5 space-y-4">{goalProgress.map((item) => { const progress = item.target ? Math.min(100, item.actual / item.target * 100) : 0; return <div key={item.label}><div className="flex items-center justify-between text-sm"><span className="text-graphite">{item.label}</span><span className="font-label text-carbon">{item.format(item.actual)} / {item.target ? item.format(item.target) : "sin meta"}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-signal" style={{ width: `${progress}%` }}/></div></div>; })}</div><div className="mt-5 rounded-md bg-paper p-3 text-xs leading-5 text-graphite">Proyección: {money.format(data.pacing.projectedSpend)} de inversión y {Math.round(data.pacing.projectedLeads)} leads al cierre.</div></Card></div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]"><Card><div className="flex items-center justify-between"><div><p className="font-title text-lg text-carbon">Salud de datos</p><p className="mt-1 text-xs text-graphite">¿Podemos confiar en la lectura?</p></div><span className="font-title text-2xl text-carbon">{data.dataHealth.score}/100</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{data.dataHealth.checks.map((check) => <div key={check.key} className="flex items-start gap-3 rounded-md border border-line-soft p-3">{check.status === "healthy" ? <CheckCircleIcon className="mt-0.5 shrink-0 text-success" size={17}/> : <AlertTriangleIcon className={`mt-0.5 shrink-0 ${check.status === "critical" ? "text-danger" : "text-warning"}`} size={17}/>}<div><p className="text-sm font-label text-carbon">{check.label}</p><p className="mt-0.5 text-xs text-graphite">{check.detail}</p></div></div>)}</div></Card><Card><div className="flex items-center gap-2"><BarChartIcon className="text-signal"/><p className="font-title text-lg text-carbon">Conversión comercial</p></div><div className="mt-5 space-y-4">{[["Lead → Calificado", pct(data.actuals.leadToQualifiedRate)], ["Lead → Venta", pct(data.actuals.leadToWonRate)], ["Leads detenidos", String(data.funnelHealth.staleLeads)], ["Sin responsable", String(data.funnelHealth.unassignedLeads)]].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-line-soft pb-3"><span className="text-sm text-graphite">{label}</span><span className="font-title text-lg text-carbon">{value}</span></div>)}</div></Card></div>

      {data.latestWeeklyReport ? <Card><div className="flex items-center gap-2"><CalendarIcon className="text-signal"/><p className="font-title text-lg text-carbon">Último cierre de aprendizaje</p></div><p className="mt-3 text-sm leading-6 text-graphite">{data.latestWeeklyReport.summary}</p><div className="mt-4 grid gap-4 md:grid-cols-3"><ReportList title="Qué funcionó" items={data.latestWeeklyReport.wins}/><ReportList title="Riesgos" items={data.latestWeeklyReport.risks}/><ReportList title="Próximas acciones" items={data.latestWeeklyReport.nextActions}/></div></Card> : null}
      <GoalModal open={goalOpen} onClose={() => setGoalOpen(false)} draft={goalDraft} setDraft={setGoalDraft} busy={busy === "goal"} save={() => void saveGoals()} />
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) { return <div><p className="text-xs font-label uppercase tracking-wide text-carbon">{title}</p><ul className="mt-2 space-y-2 text-xs leading-5 text-graphite">{items.length ? items.map((item) => <li key={item}>• {item}</li>) : <li>Sin datos suficientes todavía.</li>}</ul></div>; }

function GoalModal({ open, onClose, draft, setDraft, busy, save }: { open: boolean; onClose: () => void; draft: Record<string, string>; setDraft: (next: Record<string, string>) => void; busy: boolean; save: () => void }) {
  const fields: Array<[string, string]> = [["budgetUsd", "Presupuesto USD"], ["leadsTarget", "Leads"], ["qualifiedLeadsTarget", "Calificados"], ["wonLeadsTarget", "Ventas"], ["revenueTargetUsd", "Ingresos USD"], ["targetCpl", "CPL máximo"], ["targetCpql", "CPQL máximo"], ["targetCac", "CAC máximo"], ["targetCashRoas", "Cash ROAS mínimo"]];
  return <Modal isOpen={open} onClose={onClose} title="Objetivos mensuales" size="lg"><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label]) => <Input key={key} label={label} type="number" min="0" step="0.01" value={draft[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}/>)}</div><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={save}>Guardar objetivos</Button></div></Modal>;
}

type ExperimentDraft = { title: string; hypothesis: string; category: string; primaryMetric: string; budgetUsd: string; targetValue: string };

function ExperimentModal({ open, onClose, draft, setDraft, busy, save }: { open: boolean; onClose: () => void; draft: ExperimentDraft; setDraft: (next: ExperimentDraft) => void; busy: boolean; save: () => void }) {
  return <Modal isOpen={open} onClose={onClose} title="Nuevo experimento" size="lg"><div className="space-y-4"><Input label="Nombre" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/><div><label className="mb-1 block text-sm font-label text-carbon">Hipótesis</label><textarea className="min-h-28 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20" value={draft.hypothesis} onChange={(event) => setDraft({ ...draft, hypothesis: event.target.value })} placeholder="Si cambiamos X, entonces Y debería mejorar porque..."/></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-label text-carbon">Categoría</label><select className="w-full rounded-md border border-line bg-white px-3 py-2" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="creative">Creatividad</option><option value="audience">Audiencia</option><option value="offer">Oferta</option><option value="landing">Landing</option><option value="funnel">Embudo</option><option value="channel">Canal</option></select></div><Input label="KPI principal" value={draft.primaryMetric} onChange={(event) => setDraft({ ...draft, primaryMetric: event.target.value })}/><Input label="Presupuesto USD" type="number" min="0" value={draft.budgetUsd} onChange={(event) => setDraft({ ...draft, budgetUsd: event.target.value })}/><Input label="Meta del KPI" type="number" value={draft.targetValue} onChange={(event) => setDraft({ ...draft, targetValue: event.target.value })}/></div></div><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} disabled={!draft.title.trim() || !draft.hypothesis.trim()} onClick={save}><PlusIcon size={15}/>Crear experimento</Button></div></Modal>;
}
