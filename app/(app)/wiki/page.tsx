import { Suspense } from "react";
import { WikiClient } from "@/components/wiki";

export default function WikiPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-graphite">Cargando wiki...</div>}>
      <WikiClient />
    </Suspense>
  );
}
