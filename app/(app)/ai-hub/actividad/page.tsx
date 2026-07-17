import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AiHubActividadClient } from "@/components/ai-hub/AiHubActividadClient";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { fetchAgentesFeed } from "@/lib/agentes/hub";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Agente, AgentesDatabase } from "@/types/agentes";

export const dynamic = "force-dynamic";

export default async function AiHubActividadPage() {
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
    feedData
  ] = await Promise.all([
    supabase.from("agentes").select("slug, nombre, tipo").order("nombre", { ascending: true }),
    fetchAgentesFeed(supabase, 500)
  ]);

  if (agentesError) {
    throw new Error(agentesError.message);
  }

  return <AiHubActividadClient feed={feedData} agentes={(agentesData ?? []) as Pick<Agente, "slug" | "nombre" | "tipo">[]} />;
}
