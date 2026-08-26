"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { BookOpenIcon, MailIcon, RefreshIcon, SearchIcon, SparklesIcon, TrendingUpIcon, UsersIcon } from "@/components/ui/icons";
import type { EstadoNewsletterSuscriptor, NewsletterSuscriptor } from "@/types/newsletter";

type Metrics = { total: number; activos: number; ultimos30Dias: number; fuentePrincipal: string };
type ApiResponse = { data?: NewsletterSuscriptor[]; metrics?: Metrics; error?: string };

const date = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" });

function statusVariant(status: EstadoNewsletterSuscriptor) {
  if (status === "activo") return "success" as const;
  if (status === "rebotado") return "danger" as const;
  return "warning" as const;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <Card padding="sm" className="min-w-0 bg-gradient-to-br from-signal/5 to-white">
      <div className="flex items-center justify-between gap-3 text-signal">{icon}<span className="text-xs text-graphite">{label}</span></div>
      <p className="mt-3 truncate font-title text-2xl text-carbon">{value}</p>
      <p className="mt-1 truncate text-xs text-graphite">{detail}</p>
    </Card>
  );
}

export function NewsletterSubscribersClient() {
  const [items, setItems] = useState<NewsletterSuscriptor[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, activos: 0, ultimos30Dias: 0, fuentePrincipal: "—" });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ estado: status });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/newsletter?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(payload.error || "No se pudo cargar la audiencia.");
      setItems(payload.data || []);
      if (payload.metrics) setMetrics(payload.metrics);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la audiencia.");
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [load]);

  async function setSubscriberStatus(id: string, estado: EstadoNewsletterSuscriptor) {
    const response = await fetch(`/api/newsletter/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    const payload = await response.json() as ApiResponse;
    if (!response.ok) { setError(payload.error || "No se pudo actualizar el estado."); return; }
    await load();
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de audiencia">
        <Metric icon={<UsersIcon size={18} />} label="Audiencia" value={String(metrics.total)} detail="suscripciones registradas" />
        <Metric icon={<MailIcon size={18} />} label="Activos" value={String(metrics.activos)} detail="contactos habilitados" />
        <Metric icon={<TrendingUpIcon size={18} />} label="Últimos 30 días" value={String(metrics.ultimos30Dias)} detail="nuevas suscripciones" />
        <Metric icon={<SparklesIcon size={18} />} label="Fuente principal" value={metrics.fuentePrincipal} detail="origen con más altas" />
      </section>

      <Card className="overflow-hidden" padding="none">
        <div className="flex flex-col gap-3 border-b border-line-soft p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-carbon"><BookOpenIcon size={18} /><h1 className="font-title text-lg">Audiencia de La Operación</h1></div>
            <p className="mt-1 text-sm text-graphite">Suscriptores, consentimiento y atribución del canal editorial.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={load} loading={loading}><RefreshIcon size={15} />Actualizar</Button>
        </div>

        <div className="grid gap-3 border-b border-line-soft bg-paper/30 p-4 md:grid-cols-[1fr_190px]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, email, empresa o fuente" leftIcon={<SearchIcon size={16} />} />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-line bg-white px-3 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/10">
            <option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="desuscripto">Desuscriptos</option><option value="rebotado">Rebotados</option>
          </select>
        </div>

        {error ? <div className="m-4 rounded-md border border-danger/20 bg-danger-light p-3 text-sm text-danger">{error}</div> : null}
        {!loading && items.length === 0 ? <div className="p-8"><EmptyState titulo="Todavía no hay suscriptores" descripcion="Las altas desde blyndtek.com van a aparecer acá con su fuente y consentimiento." icon={MailIcon} /></div> : null}

        <div className="divide-y divide-line-soft">
          {items.map((item) => (
            <article key={item.id} className="grid gap-4 p-4 transition-colors hover:bg-paper/30 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-center">
              <div className="min-w-0"><p className="truncate font-label text-sm text-carbon">{item.nombre || item.email}</p><p className="mt-1 truncate text-xs text-graphite">{item.nombre ? item.email : item.empresa || "Sin empresa informada"}</p>{item.nombre && item.empresa ? <p className="mt-1 truncate text-xs text-graphite">{item.empresa}</p> : null}</div>
              <div><p className="text-xs text-graphite">Fuente</p><p className="mt-1 truncate text-sm text-carbon">{item.fuente || item.utm_source || "Directa"}</p></div>
              <div><p className="text-xs text-graphite">Alta con consentimiento</p><p className="mt-1 text-sm text-carbon">{date.format(new Date(item.consentimiento_at))}</p></div>
              <div className="flex items-center gap-3 lg:justify-end"><Badge variant={statusVariant(item.estado)}>{item.estado}</Badge><select aria-label={`Estado de ${item.email}`} value={item.estado} onChange={(event) => setSubscriberStatus(item.id, event.target.value as EstadoNewsletterSuscriptor)} className="h-8 rounded-md border border-line bg-white px-2 text-xs text-carbon"><option value="activo">Activo</option><option value="desuscripto">Desuscripto</option><option value="rebotado">Rebotado</option></select></div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
