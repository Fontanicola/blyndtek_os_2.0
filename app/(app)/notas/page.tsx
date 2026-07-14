import { Suspense } from "react";
import { NotasClient } from "@/components/notas";

export default function NotasPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-graphite">Cargando notas...</div>}>
      <div className="flex h-full min-h-0 flex-col">
        <NotasClient />
      </div>
    </Suspense>
  );
}
