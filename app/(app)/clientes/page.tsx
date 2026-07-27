import { Suspense } from "react";
import ClientesClient from "@/components/clientes/ClientesClient";
import { PageSkeleton } from "@/components/ui";

export default function ClientesPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={7} kpis={2} />}>
      <ClientesClient />
    </Suspense>
  );
}
