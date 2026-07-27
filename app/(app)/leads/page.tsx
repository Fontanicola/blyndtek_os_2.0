import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LeadsClient } from "@/components/leads/LeadsClient";
import { getCurrentUser, getDefaultRouteForRole } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  if (usuario.rol !== "admin" && usuario.rol !== "comercial") {
    redirect(getDefaultRouteForRole(usuario.rol));
  }

  return (
    <Suspense fallback={<PageSkeleton rows={6} kpis={1} />}>
      <LeadsClient usuario={usuario} />
    </Suspense>
  );
}
