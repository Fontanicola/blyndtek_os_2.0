import { redirect } from "next/navigation";
import { FinanzasClient } from "@/components/finanzas";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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

  const supabase = createAdminClient();
  const { data: cotizacionesData } = await supabase
    .from("cotizaciones")
    .select("id, empresa, precio_total")
    .order("created_at", { ascending: false });

  const cotizaciones = (cotizacionesData ?? []) as Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;

  return <FinanzasClient cotizaciones={cotizaciones} />;
}
