import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DownloadIcon } from "@/components/ui/icons";
import { fetchDiagnosticoInforme, formatInformeCurrency } from "@/lib/diagnostico/informe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PropuestaPageProps = {
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

export async function generateMetadata({ params }: PropuestaPageProps): Promise<Metadata> {
  const informe = await fetchDiagnosticoInforme(params.token).catch(() => null);

  return {
    title: informe ? `Propuesta de software · ${informe.empresa}` : "Propuesta no disponible"
  };
}

export default async function DiagnosticoPropuestaPage({ params }: PropuestaPageProps) {
  const informe = await fetchDiagnosticoInforme(params.token);

  if (!informe) {
    notFound();
  }

  const { empresa, modulos, propuestaSoftware } = informe;
  const whatsappText = encodeURIComponent(
    `Hola Blyndtek, revisé la propuesta de software para ${empresa}. Quiero avanzar con el próximo paso.`
  );

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-card border border-line-soft bg-white">
          <div className="border-b border-line-soft px-6 py-5 sm:px-8">
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
                href={`/api/diagnostico/${params.token}/propuesta/pdf`}
                className="inline-flex items-center justify-center gap-2 rounded-component border border-line bg-white px-4 py-2 text-sm font-label text-carbon transition-colors duration-fast hover:bg-paper"
              >
                <DownloadIcon size={16} aria-hidden="true" />
                Descargar PDF
              </a>
            </div>
          </div>

          <div className="grid gap-8 bg-carbon p-6 text-white sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="text-sm font-label text-white/65">Propuesta de desarrollo de software</p>
              <h1 className="mt-3 text-3xl font-title sm:text-5xl">
                Sistema operativo a medida para {empresa}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/70">
                Esta propuesta traduce el diagnóstico operativo en una solución concreta: alcance, módulos, beneficios, tiempos estimados, inversión y próximos pasos para implementar el salto digital.
              </p>
            </div>

            <div className="rounded-card border border-white/10 bg-white/10 p-5">
              <p className="text-sm font-label text-white/70">Inversión estimada</p>
              <p className="mt-2 text-4xl font-title">{formatInformeCurrency(informe.precio_ideal_desarrollo)}</p>
              {informe.precio_ideal_mensual > 0 ? (
                <p className="mt-2 text-sm text-white/70">
                  + {formatInformeCurrency(informe.precio_ideal_mensual)} mensuales
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Módulos incluidos</p>
            <p className="mt-2 text-3xl font-title text-carbon">{modulos.length}</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Tipo de solución</p>
            <p className="mt-2 text-lg font-title text-carbon">Sistema a medida</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Modelo</p>
            <p className="mt-2 text-lg font-title text-carbon">Implementación guiada</p>
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <SectionLabel>Visión del sistema</SectionLabel>
          <h2 className="mt-2 text-3xl font-title text-carbon">{propuestaSoftware.vision_sistema}</h2>
          <p className="mt-4 max-w-4xl text-base leading-7 text-graphite">{propuestaSoftware.alcance_general}</p>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <div className="max-w-3xl">
            <SectionLabel>Módulos propuestos</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Qué tendría el sistema y qué mejora cada módulo</h2>
            <p className="mt-3 text-sm leading-6 text-graphite">
              El alcance está organizado por módulos para que el cliente pueda entender exactamente qué va a tener, qué problema resuelve cada parte y qué impacto operativo debería generar.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {modulos.map((modulo, index) => (
              <article key={`${modulo.nombre}-${index}`} className="rounded-card border border-line-soft p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-label text-graphite">Módulo {index + 1}</p>
                    <h3 className="mt-1 text-xl font-title text-carbon">{modulo.nombre}</h3>
                    {modulo.descripcion ? (
                      <p className="mt-2 text-sm leading-6 text-graphite">{modulo.descripcion}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {modulo.prioridad ? (
                      <span className="rounded-pill bg-warning-light px-2 py-1 text-xs font-label text-warning">
                        Prioridad {modulo.prioridad}
                      </span>
                    ) : null}
                    {modulo.tiempo_estimado_semanas ? (
                      <span className="rounded-pill bg-paper px-2 py-1 text-xs font-label text-graphite">
                        {modulo.tiempo_estimado_semanas} semanas
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-component bg-paper p-4">
                    <p className="text-sm font-label text-carbon">Problema que resuelve</p>
                    <p className="mt-2 text-sm leading-6 text-graphite">
                      {modulo.problema_resuelve || modulo.justificacion}
                    </p>
                  </div>
                  <div className="rounded-component bg-success-light p-4">
                    <p className="text-sm font-label text-carbon">Impacto esperado</p>
                    <p className="mt-2 text-sm leading-6 text-graphite">
                      {modulo.impacto_esperado || modulo.justificacion}
                    </p>
                  </div>
                </div>

                {modulo.funcionalidades && modulo.funcionalidades.length > 0 ? (
                  <div className="mt-5">
                    <p className="text-sm font-label text-carbon">Funcionalidades incluidas</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {modulo.funcionalidades.map((funcionalidad) => (
                        <div key={funcionalidad} className="rounded-component border border-line-soft px-3 py-2 text-sm text-graphite">
                          {funcionalidad}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
            <SectionLabel>Beneficios esperados</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Qué cambia al implementar</h2>
            <div className="mt-4">
              <Bullets items={propuestaSoftware.beneficios_esperados} />
            </div>
          </div>

          <div className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
            <SectionLabel>Roadmap</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Plan de implementación sugerido</h2>
            <div className="mt-5 space-y-4">
              {propuestaSoftware.roadmap_implementacion.map((etapa, index) => (
                <div key={`${etapa.etapa}-${index}`} className="border-l-2 border-signal pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-title text-carbon">{etapa.etapa}</p>
                    <span className="rounded-pill bg-paper px-2 py-1 text-xs font-label text-graphite">
                      {etapa.duracion_estimada}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-graphite">{etapa.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-card border border-signal/20 bg-signal-light p-5">
              <p className="text-sm font-label text-signal">Inversión de desarrollo</p>
              <p className="mt-2 text-4xl font-title text-carbon">
                {formatInformeCurrency(informe.precio_ideal_desarrollo)}
              </p>
              {informe.precio_ideal_mensual > 0 ? (
                <p className="mt-3 text-sm text-graphite">
                  Mantenimiento mensual: {formatInformeCurrency(informe.precio_ideal_mensual)}
                </p>
              ) : null}
            </div>
            <div>
              <SectionLabel>Próximos pasos</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Cómo avanzar</h2>
              <div className="mt-4">
                <Bullets items={propuestaSoftware.proximos_pasos} />
              </div>
            </div>
          </div>
        </section>

        {propuestaSoftware.supuestos.length > 0 ? (
          <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
            <SectionLabel>Supuestos</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Condiciones consideradas</h2>
            <div className="mt-4">
              <Bullets items={propuestaSoftware.supuestos} />
            </div>
          </section>
        ) : null}

        <section className="rounded-card border border-line-soft bg-carbon p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-title">Siguiente paso</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                Si la dirección hace sentido, coordinamos una llamada corta para ajustar alcance, tiempos y forma de pago.
              </p>
            </div>
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-component bg-white px-5 py-2.5 text-base font-label text-carbon transition-colors duration-fast hover:bg-paper"
            >
              Avanzar por WhatsApp
            </a>
          </div>
        </section>

        <p className="text-center text-xs text-graphite">
          Propuesta generada por Blyndtek OS a partir del diagnóstico operativo completado con el cliente.
        </p>
      </div>
    </main>
  );
}
