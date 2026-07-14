import { Suspense } from "react";
import { LeadsClient } from "@/components/leads/LeadsClient";

export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-graphite">Cargando leads...</div>}>
      <LeadsClient />
    </Suspense>
  );
}
