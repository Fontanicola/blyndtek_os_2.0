import Image from "next/image";
import { Badge } from "@/components/ui";
import { formatFecha } from "@/lib/utils/formatters";
import type { PublicRoadmapProject } from "@/types/roadmap-public";

type RoadmapHeaderProps = {
  roadmap: PublicRoadmapProject;
};

function getStatusVariant(estado: string) {
  if (estado === "entregado" || estado === "soporte") {
    return "success" as const;
  }

  if (estado === "en_desarrollo" || estado === "implementacion") {
    return "signal" as const;
  }

  if (estado === "pausado") {
    return "warning" as const;
  }

  return "default" as const;
}

function getStatusLabel(estado: string) {
  return estado.replaceAll("_", " ");
}

export function RoadmapHeader({ roadmap }: RoadmapHeaderProps) {
  return (
    <header className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-5">
          <Image
            src="/Logo_Blyndtek_plataforma.svg"
            alt="Blyndtek"
            width={152}
            height={36}
            className="h-8 w-auto"
            priority
          />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-title text-carbon sm:text-3xl">{roadmap.nombre}</h1>
              <Badge variant={getStatusVariant(roadmap.estado)}>{getStatusLabel(roadmap.estado)}</Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-graphite">
              {roadmap.fecha_inicio ? <span>Inicio: {formatFecha(roadmap.fecha_inicio)}</span> : null}
              {roadmap.entrega_comprometida ? (
                <span>Entrega estimada: {formatFecha(roadmap.entrega_comprometida)}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-[180px] rounded-card bg-paper px-5 py-4">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Avance</p>
          <p className="mt-2 text-3xl font-title text-carbon">{roadmap.avance_pct}%</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-label text-carbon">Progreso general del proyecto</span>
          <span className="text-graphite">{roadmap.avance_pct}% completado</span>
        </div>
        <div className="h-3 overflow-hidden rounded-pill bg-paper">
          <div
            className="h-full rounded-pill bg-signal transition-all duration-normal ease-normal"
            style={{ width: `${Math.min(Math.max(roadmap.avance_pct, 0), 100)}%` }}
          />
        </div>
      </div>
    </header>
  );
}
