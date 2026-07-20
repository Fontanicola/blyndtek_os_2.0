import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AutomatizacionesClient } from "@/components/ai-hub/AutomatizacionesClient";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase, AutomatizacionConAgente } from "@/types/agentes";

export const dynamic = "force-dynamic";

export default async function AiHubAutomatizacionesPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
  const { data, error } = await supabase
    .from("automatizaciones")
    .select(
      `
        *,
        agentes (
          nombre,
          slug,
          tipo
        )
      `
    )
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-title text-3xl text-carbon">Automatizaciones</h1>
        <p className="max-w-4xl text-sm text-graphite">
          Pausá o ajustá la agenda de las tareas recurrentes de agentes desde un único lugar.
        </p>
      </div>

      <AutomatizacionesClient initialAutomatizaciones={(data ?? []) as AutomatizacionConAgente[]} />
    </div>
  );
}

