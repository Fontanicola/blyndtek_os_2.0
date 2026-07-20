import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiHubActividadClient } from "@/components/ai-hub/AiHubActividadClient";
import { AiHubCostoChart } from "@/components/ai-hub/AiHubCostoChart";
import { MetricaCard } from "@/components/finanzas/MetricaCard";
import { BotIcon, ClockIcon, PlayIcon, SparklesIcon } from "@/components/ui/icons";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { fetchAgentesCostoHistorico, fetchAgentesCostoTotal, fetchAgentesFeed } from "@/lib/agentes/hub";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Agente, AgentesDatabase } from "@/types/agentes";

export const dynamic = "force-dynamic";

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
    { data: agentesData, error: agentesError },
    { count: agentesActivosCount, error: agentesActivosError },
    { count: automatizacionesActivasCount, error: automatizacionesActivasError },
    costoMes,
    costoHistorico,
    feed
  ] = await Promise.all([
    supabase.from("agentes").select("slug,nombre,tipo").order("created_at", { ascending: true }),
    supabase.from("agentes").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("automatizaciones").select("id", { count: "exact", head: true }).eq("activa", true),
    fetchAgentesCostoTotal(supabase, "month"),
    fetchAgentesCostoHistorico(supabase, 6),
    fetchAgentesFeed(supabase, 500)
  ]);

  const errors = [agentesError, agentesActivosError, automatizacionesActivasError].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0]?.message ?? "No se pudo cargar el Centro IA.");
  }

  const accionesSemana = feed.filter((item) => {
    const createdAt = new Date(item.fecha).getTime();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return createdAt >= weekAgo;
  }).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-title text-3xl text-carbon">Centro IA</h1>
        <p className="max-w-4xl text-sm text-graphite">
          Vista ejecutiva de análisis, automatizaciones y costo real de IA dentro del sistema.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
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
          value={String(accionesSemana)}
          icono={<ClockIcon />}
          colorIcono="graphite"
          description="Eventos registrados en el feed unificado."
        />
        <MetricaCard
          label="Agentes activos"
          value={String(agentesActivosCount ?? 0)}
          icono={<BotIcon />}
          colorIcono="success"
          description="Agentes habilitados para operar."
        />
        <MetricaCard
          label="Automatizaciones activas"
          value={String(automatizacionesActivasCount ?? 0)}
          icono={<PlayIcon />}
          colorIcono="warning"
          description="Tareas recurrentes no pausadas."
        />
      </div>

      <AiHubCostoChart data={costoHistorico.data} series={costoHistorico.series} />

      <AiHubActividadClient
        feed={feed}
        agentes={(agentesData ?? []) as Pick<Agente, "slug" | "nombre" | "tipo">[]}
        title="Actividad"
        description="Feed completo de análisis, generaciones, checklists y ejecuciones AI Dev."
      />
    </div>
  );
}
