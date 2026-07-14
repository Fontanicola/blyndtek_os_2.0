import { Suspense } from "react";
import { NotasClient } from "@/components/notas";
import { getCurrentUser } from "@/lib/auth";

export default async function NotasPage() {
  const usuario = await getCurrentUser();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-graphite">Cargando notas...</div>}>
      <div className="flex h-full min-h-0 flex-col">
        <NotasClient usuario={usuario} />
      </div>
    </Suspense>
  );
}
