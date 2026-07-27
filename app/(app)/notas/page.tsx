import { Suspense } from "react";
import { NotasClient } from "@/components/notas";
import { getCurrentUser } from "@/lib/auth";
import { PageSkeleton } from "@/components/ui";

export default async function NotasPage() {
  const usuario = await getCurrentUser();

  return (
    <Suspense fallback={<PageSkeleton rows={8} />}>
      <div className="flex h-full min-h-0 flex-col">
        <NotasClient usuario={usuario} />
      </div>
    </Suspense>
  );
}
