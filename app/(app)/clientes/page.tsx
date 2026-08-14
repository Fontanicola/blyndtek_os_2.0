import { Suspense } from "react";
import ClientesClient from "@/components/clientes/ClientesClient";
import { PageSkeleton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const usuario = await getCurrentUser();

  return (
    <Suspense fallback={<PageSkeleton rows={7} kpis={2} />}>
      <ClientesClient isAdmin={usuario?.rol === "admin"} />
    </Suspense>
  );
}
