import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FinanzasClient } from "@/components/finanzas";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentesDatabase, AgenteAnalisis } from "@/types/agentes";
import type { CierreMensual } from "@/types/cierres";
import type { Cotizacion } from "@/types/cotizaciones";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  const supabase = createAdminClient() as SupabaseClient<AgentesDatabase>;
  const { data: cotizacionesData } = await supabase
    .from("cotizaciones")
    .select("id, empresa, precio_total")
    .order("created_at", { ascending: false });

  const { data: agenteData } = await supabase
    .from("agentes")
    .select("id, slug")
    .eq("slug", "asesor-financiero")
    .maybeSingle();

  const { data: cierresData } = await supabase
    .from("cierres_mensuales")
    .select("*")
    .order("generado_at", { ascending: false })
    .limit(12);

  let asesorFinancieroAnalisis: AgenteAnalisis | null = null;

  if (agenteData?.id) {
    const { data: analisisData } = await supabase
      .from("agente_analisis")
      .select("*")
      .eq("agente_id", agenteData.id)
      .order("created_at", { ascending: false })
      .limit(1);

    asesorFinancieroAnalisis = (analisisData?.[0] ?? null) as AgenteAnalisis | null;
  }

  const cotizaciones = (cotizacionesData ?? []) as Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  const cierresMensuales = (cierresData ?? []) as CierreMensual[];

  return (
    <FinanzasClient
      cotizaciones={cotizaciones}
      asesorFinancieroAnalisis={asesorFinancieroAnalisis}
      cierresMensuales={cierresMensuales}
    />
  );
}
