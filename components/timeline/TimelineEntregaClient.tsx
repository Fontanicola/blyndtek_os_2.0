"use client";

import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/ui";
import { useProyectos } from "@/lib/hooks/useProyectos";
import type { Cliente } from "@/types/clientes";
import type { Usuario } from "@/types/auth";
import { TimelineProyectos } from "@/components/proyectos/TimelineProyectos";

type TimelineEntregaClientProps = {
  usuario: Usuario | null;
  clientes: Array<Pick<Cliente, "id" | "empresa">>;
};

export function TimelineEntregaClient({ usuario, clientes }: TimelineEntregaClientProps) {
  const router = useRouter();
  const { proyectos, loading, error } = useProyectos();

  if (loading && proyectos.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      {error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>
      ) : null}

      <TimelineProyectos
        proyectos={proyectos}
        clientes={clientes}
        currentUserId={usuario?.id}
        onSelectProject={(id) => router.push(`/proyectos?project_id=${encodeURIComponent(id)}`)}
      />
    </div>
  );
}
