import { Suspense } from "react";
import ClientesClient from "@/components/clientes/ClientesClient";

export default function ClientesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-graphite">Cargando clientes...</div>}>
      <ClientesClient />
    </Suspense>
  );
}
