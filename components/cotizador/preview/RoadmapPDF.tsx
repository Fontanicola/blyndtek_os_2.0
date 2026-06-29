import { formatSemanas, formatUSD } from "@/lib/utils/formatters";
import type { Cotizacion } from "@/types/cotizaciones";
import type { FaseRoadmap } from "@/types/roadmap";

type RoadmapPDFProps = {
  cotizacion: Cotizacion;
  fases: FaseRoadmap[];
};

function Page({
  children,
  className = "",
  breakAfter = false
}: {
  children: React.ReactNode;
  className?: string;
  breakAfter?: boolean;
}) {
  return (
    <section
      className={[
        "mx-auto min-h-[1123px] w-full bg-white px-12 py-12 text-[14px] text-carbon",
        breakAfter ? "page-break" : "",
        className
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-title text-carbon">{title}</h2>
      <div className="mt-3 h-0.5 w-12 bg-signal" />
    </div>
  );
}

function buildWeekLabels(totalWeeks: number) {
  if (totalWeeks <= 16) {
    return Array.from({ length: totalWeeks }, (_, index) => ({
      label: `S${index + 1}`,
      startWeek: index + 1,
      endWeek: index + 1
    }));
  }

  const labels = [];

  for (let week = 1; week <= totalWeeks; week += 2) {
    labels.push({
      label: `S${week}-${Math.min(week + 1, totalWeeks)}`,
      startWeek: week,
      endWeek: Math.min(week + 1, totalWeeks)
    });
  }

  return labels;
}

export function RoadmapPDF({ cotizacion, fases }: RoadmapPDFProps) {
  const totalWeeks = Math.max(cotizacion.plazo_semanas ?? 1, 1);
  const weekLabels = buildWeekLabels(totalWeeks);

  return (
    <div className="bg-white">
      <Page breakAfter className="flex flex-col">
        <div className="text-3xl font-title text-carbon">Blyndtek</div>
        <div className="mt-6 h-0.5 w-full bg-signal" />

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-title text-carbon">Roadmap de Desarrollo</h1>
          <p className="mt-4 text-2xl text-graphite">{cotizacion.empresa}</p>
        </div>

        <p className="text-center text-[11px] text-graphite">
          Confidencial · Preparado por Blyndtek
        </p>
      </Page>

      <Page breakAfter>
        <SectionTitle title="Cronograma de desarrollo" />

        <div className="overflow-hidden rounded-card border border-line-soft">
          <div
            className="grid border-b border-line-soft bg-paper"
            style={{
              gridTemplateColumns: `220px repeat(${weekLabels.length}, minmax(0, 1fr))`
            }}
          >
            <div className="px-4 py-3 text-[11px] font-label uppercase tracking-[0.08em] text-graphite">
              Fase
            </div>
            {weekLabels.map((week) => (
              <div
                key={week.label}
                className="px-2 py-3 text-center text-[11px] font-label uppercase tracking-[0.08em] text-graphite"
              >
                {week.label}
              </div>
            ))}
          </div>

          {fases.map((fase) => {
            const leftPercent = ((fase.semanaInicio - 1) / totalWeeks) * 100;
            const widthPercent =
              ((fase.semanaFin - fase.semanaInicio + 1) / totalWeeks) * 100;
            const diamondLeft = (fase.semanaFin / totalWeeks) * 100;

            return (
              <div
                key={fase.nombre}
                className="grid items-center border-b border-line-soft last:border-b-0"
                style={{
                  gridTemplateColumns: `220px minmax(0, 1fr)`
                }}
              >
                <div className="px-4 py-4">
                  <p className="text-sm font-label text-carbon">{fase.nombre}</p>
                  <p className="mt-1 text-[11px] text-graphite">
                    {fase.modulos.length > 0 ? fase.modulos.join(" · ") : "Fase del roadmap"}
                  </p>
                </div>

                <div className="px-4 py-4">
                  <div className="relative h-10 rounded-component bg-paper">
                    <div
                      className="absolute top-2 h-6 rounded-component bg-signal"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`
                      }}
                    />

                    {fase.hito ? (
                      <div
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-signal"
                        style={{ left: `${diamondLeft}%` }}
                      >
                        ◆
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Page>

      <Page>
        <SectionTitle title="Fases e hitos de pago" />

        <div className="space-y-4">
          {fases
            .filter((fase) => fase.hito)
            .map((fase) => (
              <div key={fase.nombre} className="border-l-4 border-signal bg-paper px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-title text-carbon">{fase.hito?.nombre}</h3>
                  <p className="text-sm font-label text-carbon">
                    Semana {fase.semanaFin}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-graphite">
                  <span>{formatUSD(fase.hito?.monto ?? 0)}</span>
                  <span>{fase.hito?.pct ?? 0}%</span>
                </div>
              </div>
            ))}
        </div>

        <div className="mt-10 border-t border-line-soft pt-8">
          <h3 className="text-base font-title text-carbon">Fases del roadmap</h3>
          <div className="mt-4 space-y-4">
            {fases.map((fase) => (
              <div key={fase.nombre} className="rounded-card border border-line-soft p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-label text-carbon">{fase.nombre}</p>
                  <p className="text-[11px] text-graphite">
                    {formatSemanas(fase.semanaFin - fase.semanaInicio + 1)}
                  </p>
                </div>
                <p className="mt-2 text-sm text-graphite">
                  Semanas {fase.semanaInicio} a {fase.semanaFin}
                </p>
                <div className="mt-3 space-y-1">
                  {fase.modulos.length > 0 ? (
                    fase.modulos.map((modulo) => (
                      <p key={`${fase.nombre}-${modulo}`} className="text-sm text-carbon">
                        · {modulo}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-graphite">Módulos pendientes de definición.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Page>
    </div>
  );
}
