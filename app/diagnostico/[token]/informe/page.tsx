import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DownloadIcon } from "@/components/ui/icons";
import { fetchDiagnosticoInforme } from "@/lib/diagnostico/informe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InformePageProps = {
  params: {
    token: string;
  };
};

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-label text-graphite">{children}</p>;
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-graphite">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function heatmapTone(nivel: number) {
  if (nivel >= 5) {
    return "border-danger/30 bg-danger-light text-danger";
  }

  if (nivel >= 4) {
    return "border-warning/30 bg-warning-light text-warning";
  }

  if (nivel >= 3) {
    return "border-signal/25 bg-signal-light text-signal";
  }

  return "border-success/25 bg-success-light text-success";
}

export async function generateMetadata({ params }: InformePageProps): Promise<Metadata> {
  const informe = await fetchDiagnosticoInforme(params.token).catch(() => null);

  return {
    title: informe ? `Informe diagnóstico · ${informe.empresa}` : "Informe no disponible"
  };
}

export default async function DiagnosticoInformePage({ params }: InformePageProps) {
  const informe = await fetchDiagnosticoInforme(params.token);

  if (!informe) {
    notFound();
  }

  const { empresa, hallazgos, diagnosticoEmpresa, antesDespues, mapaAreas } = informe;

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-card border border-line-soft bg-white">
          <div className="border-b border-line-soft bg-white px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Image
                src="/Logo_Blyndtek_plataforma_negro.svg"
                alt="Blyndtek"
                width={148}
                height={32}
                className="object-contain"
                style={{ width: "auto", height: "32px" }}
                priority
              />
              <a
                href={`/api/diagnostico/${params.token}/informe/pdf`}
                className="inline-flex items-center justify-center gap-2 rounded-component border border-line bg-white px-4 py-2 text-sm font-label text-carbon transition-colors duration-fast hover:bg-paper"
              >
                <DownloadIcon size={16} aria-hidden="true" />
                Descargar PDF
              </a>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <SectionLabel>Informe diagnóstico de empresa</SectionLabel>
              <h1 className="mt-3 text-3xl font-title text-carbon sm:text-5xl">
                Diagnóstico operativo de {empresa}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-graphite">
                Este informe analiza cómo opera hoy la empresa, dónde aparecen fricciones, qué costos ocultos puede estar generando la operación manual y qué oportunidades de mejora conviene priorizar.
              </p>
            </div>
            <div className="rounded-card border border-line-soft bg-paper/70 p-5">
              <p className="text-sm font-label text-graphite">Objetivo del documento</p>
              <p className="mt-3 text-lg font-title leading-7 text-carbon">
                Convertir una conversación operativa en claridad para tomar decisiones.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Problemas detectados</p>
            <p className="mt-2 text-3xl font-title text-carbon">{hallazgos.length}</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Oportunidades de mejora</p>
            <p className="mt-2 text-3xl font-title text-carbon">{diagnosticoEmpresa.oportunidades_mejora.length}</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Tipo de análisis</p>
            <p className="mt-2 text-lg font-title text-carbon">Diagnóstico operativo</p>
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <SectionLabel>Informe diagnóstico</SectionLabel>
          <div className="mt-2 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-title text-carbon">Lectura ejecutiva</h2>
              <p className="mt-4 text-base leading-7 text-graphite">{diagnosticoEmpresa.resumen_ejecutivo}</p>
            </div>
            <div className="rounded-card border border-line-soft bg-paper/60 p-5">
              <h3 className="text-lg font-title text-carbon">Cómo opera hoy</h3>
              <p className="mt-3 text-sm leading-7 text-graphite">{diagnosticoEmpresa.operativa_actual}</p>
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <div className="max-w-3xl">
            <SectionLabel>Problemas detectados</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Dónde la operación pierde control, tiempo o trazabilidad</h2>
            <p className="mt-3 text-sm leading-6 text-graphite">
              Estos hallazgos salen de las respuestas del diagnóstico y del contexto adicional cargado por Blyndtek. La intención no es marcar errores, sino identificar dónde conviene instalar “maquinaria digital” para que la empresa dependa menos de memoria, mensajes sueltos y seguimiento manual.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {hallazgos.map((hallazgo, index) => (
              <article key={`${hallazgo.hallazgo}-${index}`} className="rounded-card border border-line-soft p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-label text-graphite">Hallazgo {index + 1}</p>
                  {hallazgo.severidad ? (
                    <span className="rounded-pill bg-paper px-2 py-1 text-xs font-label text-graphite">
                      Severidad {hallazgo.severidad}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-title text-carbon">{hallazgo.hallazgo}</h3>
                {hallazgo.evidencia ? (
                  <p className="mt-3 text-sm leading-6 text-graphite">Evidencia: {hallazgo.evidencia}</p>
                ) : null}
                <p className="mt-3 text-sm leading-6 text-graphite">Impacto: {hallazgo.impacto}</p>
                <div className="mt-4 rounded-component bg-signal-light px-3 py-2 text-sm font-label text-carbon">
                  {hallazgo.que_resolveria}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
            <SectionLabel>Costo de no cambiar</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Lo que sigue pasando si no se ordena</h2>
            <p className="mt-4 text-sm leading-7 text-graphite">{diagnosticoEmpresa.costo_de_no_cambiar}</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
            <SectionLabel>Oportunidades</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Qué se puede mejorar</h2>
            <div className="mt-4">
              <Bullets items={diagnosticoEmpresa.oportunidades_mejora} />
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <div className="max-w-3xl">
            <SectionLabel>Antes y después</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Qué cambia en la operación si se digitaliza</h2>
            <p className="mt-3 text-sm leading-6 text-graphite">
              La comparación ordena el salto esperado: pasar de seguimiento manual, memoria y mensajes sueltos a procesos visibles, medibles y delegables.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-card border border-line-soft">
            <div className="grid grid-cols-[0.7fr_1fr_1fr_0.9fr] gap-0 border-b border-line-soft bg-paper px-4 py-3 text-sm font-label text-carbon">
              <span>Área</span>
              <span>Antes</span>
              <span>Después</span>
              <span>Métrica de impacto</span>
            </div>
            {antesDespues.map((item) => (
              <div
                key={`${item.area}-${item.metrica}`}
                className="grid grid-cols-1 gap-3 border-b border-line-soft px-4 py-4 last:border-b-0 md:grid-cols-[0.7fr_1fr_1fr_0.9fr]"
              >
                <p className="font-label text-carbon">{item.area}</p>
                <p className="text-sm leading-6 text-graphite">{item.antes}</p>
                <p className="text-sm leading-6 text-carbon">{item.despues}</p>
                <p className="text-sm font-label leading-6 text-signal">{item.metrica}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <SectionLabel>Mapa de calor operativo</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Áreas con más fricción y potencial de mejora</h2>
              <p className="mt-3 text-sm leading-6 text-graphite">
                Escala 1 a 5: cuanto más alto el nivel, más fricción operativa aparece en esa parte del negocio.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-label text-graphite">
              <span>Saludable</span>
              <span className="h-2 w-12 rounded-pill bg-success-light" />
              <span className="h-2 w-12 rounded-pill bg-warning-light" />
              <span className="h-2 w-12 rounded-pill bg-danger-light" />
              <span>Crítico</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {mapaAreas.map((area) => (
              <article key={area.area} className={`rounded-card border p-4 ${heatmapTone(area.nivel)}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-title text-carbon">{area.area}</h3>
                  <span className="rounded-pill bg-white/70 px-2 py-1 text-xs font-label">Nivel {area.nivel}/5</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-graphite">{area.diagnostico}</p>
                <p className="mt-3 text-sm font-label leading-6 text-carbon">{area.oportunidad}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <SectionLabel>Conclusión</SectionLabel>
          <h2 className="mt-2 text-2xl font-title text-carbon">Lectura final del diagnóstico</h2>
          <p className="mt-4 text-base leading-7 text-graphite">{diagnosticoEmpresa.conclusion_diagnostico}</p>
        </section>

        <p className="text-center text-xs text-graphite">
          Informe generado por Blyndtek LLC para {empresa}
        </p>
      </div>
    </main>
  );
}
