import { redirect } from "next/navigation";
import { FinanzasClient } from "@/components/finanzas";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  return <FinanzasClient />;
}
