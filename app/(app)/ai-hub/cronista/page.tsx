import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CronistaClient } from "@/components/ai-hub/CronistaClient";
import { fechaActualArgentina } from "@/lib/agentes/cronista";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase, CronistaLogDiario } from "@/types/agentes";

export const dynamic = "force-dynamic";

export default async function CronistaPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  const fecha = fechaActualArgentina();
  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
  const { data, error } = await supabase
    .from("logs_diarios")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  const logs = (data ?? []) as CronistaLogDiario[];
  const logActual = logs.find((log) => log.fecha === fecha) ?? null;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="font-title text-2xl text-carbon">Contexto del día</h1>
        <p className="max-w-3xl text-sm text-graphite">
          Respondé las preguntas en menos de dos minutos. Cronista convierte tu contexto en un log diario listo para la memoria.
        </p>
      </div>

      <CronistaClient fecha={fecha} initialLog={logActual} recentLogs={logs} />
    </div>
  );
}
