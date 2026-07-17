import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiHubCostoChart } from "@/components/ai-hub/AiHubCostoChart";
import { Badge, Card } from "@/components/ui";
import { BellIcon, BotIcon, CheckCircleIcon, ClockIcon, SparklesIcon } from "@/components/ui/icons";
import { MetricaCard } from "@/components/finanzas/MetricaCard";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import {
  fetchAgentesCostoHistorico,
  fetchAgentesCostoTotal,
  fetchAgentesFeed,
  formatAgentesRelativeTime,
  type AgentesHubFeedItem
} from "@/lib/agentes/hub";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatUSD } from "@/lib/utils/formatters";
import type { AgentesDatabase } from "@/types/agentes";

export const dynamic = "force-dynamic";

function feedIcon(item: AgentesHubFeedItem) {
  switch (item.tipo) {
    case "analista":
      return <SparklesIcon className="h-4 w-4" />;
    case "generador":
      return <CheckCircleIcon className="h-4 w-4" />;
    case "ejecutor":
      return <BotIcon className="h-4 w-4" />;
    case "vigilante":
      return <BellIcon className="h-4 w-4" />;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export default async function AiHubPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
  const [
    { count: agentesActivosCount, error: agentesActivosError },
    costoMes,
    costoHistorico,
    feed
  ] = await Promise.all([
    supabase.from("agentes").select("id", { count: "exact", head: true }).eq("activo", true),
    fetchAgentesCostoTotal(supabase, "month"),
    fetchAgentesCostoHistorico(supabase, 6),
    fetchAgentesFeed(supabase, 20)
  ]);

  if (agentesActivosError) {
    throw new Error(agentesActivosError.message);
  }

  const accionesSemana = feed.filter((item) => {
    const createdAt = new Date(item.fecha).getTime();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return createdAt >= weekAgo;
  }).length;

  const latestFeed = feed.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-title text-3xl text-carbon">Centro IA</h1>
        <p className="max-w-4xl text-sm text-graphite">
          Vista ejecutiva de análisis, automatizaciones y costo real de IA dentro del sistema.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricaCard
          label="Costo de IA (este mes)"
          value={costoMes.total_usd}
          icono={<SparklesIcon />}
          colorIcono="signal"
          description={
            costoMes.desglose.length > 0
              ? costoMes.desglose.map((item) => item.agente).join(" · ")
              : "Sin consumo de IA en el período actual."
          }
        />
        <MetricaCard
          label="Acciones esta semana"
          value={accionesSemana}
          icono={<ClockIcon />}
          colorIcono="graphite"
          description="Análisis, checklist QA y AI Dev."
        />
        <MetricaCard
          label="Agentes activos"
          value={agentesActivosCount ?? 0}
          icono={<BotIcon />}
          colorIcono="success"
          description="Agentes habilitados en la tabla de configuración."
        />
      </div>

      <AiHubCostoChart data={costoHistorico.data} series={costoHistorico.series} />

      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-title text-xl text-carbon">Actividad más reciente</h2>
            <p className="text-sm text-graphite">Últimos eventos cruzados entre Asesor, Checklist QA y AI Dev.</p>
          </div>
          <Link href="/ai-hub/actividad" className="text-sm font-label text-signal transition-colors duration-fast ease-fast hover:text-carbon">
            Ver toda la actividad →
          </Link>
        </div>

        {latestFeed.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-paper px-4 py-8 text-sm text-graphite">
            Todavía no hay actividad registrada.
          </div>
        ) : (
          <div className="space-y-3">
            {latestFeed.map((item) => (
              <div key={item.id} className="rounded-component border border-line-soft bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-paper text-signal">
                      {feedIcon(item)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-label text-carbon">{item.agente}</p>
                      <p className="mt-1 text-sm text-graphite">{item.resumen}</p>
                      <p className="mt-2 text-xs text-graphite">
                        {formatAgentesRelativeTime(item.fecha)} · {formatDateTime(item.fecha)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {item.costo_usd != null ? <Badge variant="ghost">{formatUSD(item.costo_usd)}</Badge> : null}
                    {item.pr_url ? (
                      <a
                        href={item.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-label text-signal transition-colors duration-fast ease-fast hover:text-carbon"
                      >
                        Ver PR
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
