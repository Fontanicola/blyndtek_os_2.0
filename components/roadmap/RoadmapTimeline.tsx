import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PublicRoadmapFeature, PublicRoadmapPhase } from "@/types/roadmap-public";

type RoadmapTimelineProps = {
  fases: PublicRoadmapPhase[];
};

function getPhaseVariant(estado: PublicRoadmapPhase["estado"]) {
  if (estado === "completada") {
    return "success" as const;
  }

  if (estado === "en_curso") {
    return "signal" as const;
  }

  return "default" as const;
}

function getPhaseLabel(estado: PublicRoadmapPhase["estado"]) {
  if (estado === "completada") {
    return "Completada";
  }

  if (estado === "en_curso") {
    return "En curso";
  }

  return "Pendiente";
}

function getFeatureStyles(estado: PublicRoadmapFeature["estado"]) {
  if (estado === "lista") {
    return {
      dot: "bg-success",
      text: "text-carbon",
      label: "Lista"
    };
  }

  if (estado === "en_curso") {
    return {
      dot: "bg-signal",
      text: "text-carbon",
      label: "En curso"
    };
  }

  return {
    dot: "bg-graphite/25",
    text: "text-graphite",
    label: "Pendiente"
  };
}

export function RoadmapTimeline({ fases }: RoadmapTimelineProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-title text-carbon">Timeline de fases</h2>
        <p className="mt-1 text-sm text-graphite">
          Seguimiento público del proyecto, actualizado en tiempo real.
        </p>
      </div>

      {fases.length > 0 ? (
        <div className="space-y-5">
          {fases.map((fase, index) => (
            <div key={fase.nombre} className="relative pl-8">
              {index < fases.length - 1 ? (
                <div className="absolute left-[11px] top-7 h-[calc(100%+20px)] w-px bg-line-soft" />
              ) : null}

              <div
                className={cn(
                  "absolute left-0 top-2 h-[22px] w-[22px] rounded-full border-4 border-white transition-colors duration-normal ease-normal",
                  fase.estado === "completada"
                    ? "bg-success"
                    : fase.estado === "en_curso"
                      ? "bg-signal"
                      : "bg-paper"
                )}
              />

              <Card padding="lg" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-title text-carbon">{fase.nombre}</h3>
                  </div>
                  <Badge variant={getPhaseVariant(fase.estado)}>{getPhaseLabel(fase.estado)}</Badge>
                </div>

                <div className="space-y-3">
                  {fase.features.map((feature) => {
                    const styles = getFeatureStyles(feature.estado);

                    return (
                      <div
                        key={`${fase.nombre}-${feature.nombre}`}
                        className="flex items-start justify-between gap-3 rounded-component bg-paper px-4 py-3"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={cn(
                              "mt-1 inline-flex h-2.5 w-2.5 rounded-full transition-colors duration-normal ease-normal",
                              styles.dot
                            )}
                          />
                          <p className={cn("text-sm", styles.text)}>{feature.nombre}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs font-label text-graphite">
                          {styles.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card padding="lg">
          <p className="text-sm text-graphite">
            Todavía no hay fases públicas disponibles para este proyecto.
          </p>
        </Card>
      )}
    </section>
  );
}
