import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DownloadIcon } from "@/components/ui/icons";
import { fetchDiagnosticoInforme, formatInformeCurrency } from "@/lib/diagnostico/informe";

type InformePageProps = {
  params: {
    token: string;
  };
};

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

  const { empresa, hallazgos, modulos } = informe;
  const whatsappText = encodeURIComponent(
    `Hola Blyndtek, revisé la propuesta para ${empresa} y quiero avanzar con el próximo paso.`
  );

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
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

          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-label text-graphite">
                Informe de diagnóstico
              </p>
              <h1 className="mt-3 text-3xl font-title text-carbon sm:text-4xl">
                Propuesta de sistema para {empresa}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-graphite">
                A partir de las respuestas del diagnóstico, armamos una lectura concreta de los puntos de fricción, los módulos recomendados y la inversión estimada para ordenar la operación.
              </p>
            </div>

            <div className="rounded-card border border-signal/20 bg-signal-light p-5">
              <p className="text-sm font-label text-signal">Inversión estimada</p>
              <p className="mt-2 text-3xl font-title text-carbon">
                {formatInformeCurrency(informe.precio_ideal_desarrollo)}
              </p>
              {informe.precio_ideal_mensual > 0 ? (
                <p className="mt-2 text-sm text-graphite">
                  + {formatInformeCurrency(informe.precio_ideal_mensual)} mensuales
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Hallazgos detectados</p>
            <p className="mt-2 text-3xl font-title text-carbon">{hallazgos.length}</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Módulos propuestos</p>
            <p className="mt-2 text-3xl font-title text-carbon">{modulos.length}</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Modalidad</p>
            <p className="mt-2 text-lg font-title text-carbon">Sistema a medida</p>
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-label text-graphite">
              Lo que encontramos
            </p>
            <h2 className="mt-2 text-2xl font-title text-carbon">Hallazgos principales</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {hallazgos.map((hallazgo, index) => (
              <article key={`${hallazgo.hallazgo}-${index}`} className="rounded-card border border-line-soft p-5">
                <p className="text-xs font-label text-graphite">
                  Hallazgo {index + 1}
                </p>
                <h3 className="mt-3 text-lg font-title text-carbon">{hallazgo.hallazgo}</h3>
                <p className="mt-3 text-sm leading-6 text-graphite">{hallazgo.impacto}</p>
                <div className="mt-4 rounded-component bg-paper px-3 py-2 text-sm text-carbon">
                  {hallazgo.que_resolveria}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <div className="max-w-2xl">
            <p className="text-sm font-label text-graphite">
              Nuestra propuesta
            </p>
            <h2 className="mt-2 text-2xl font-title text-carbon">Módulos sugeridos</h2>
            <p className="mt-3 text-sm leading-6 text-graphite">
              Estos módulos fueron elegidos para atacar los puntos detectados. El precio se muestra como total de proyecto, sin desglosar valores internos por módulo.
            </p>
          </div>

          <div className="mt-6 divide-y divide-line-soft rounded-card border border-line-soft">
            {modulos.map((modulo) => (
              <article key={modulo.nombre} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-title text-carbon">{modulo.nombre}</h3>
                  {modulo.categoria ? (
                    <span className="rounded-pill bg-paper px-2 py-1 text-xs font-label text-graphite">
                      {modulo.categoria}
                    </span>
                  ) : null}
                </div>
                {modulo.descripcion ? (
                  <p className="mt-2 text-sm leading-6 text-graphite">{modulo.descripcion}</p>
                ) : null}
                {modulo.justificacion ? (
                  <p className="mt-3 text-sm font-label text-carbon">{modulo.justificacion}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-carbon p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-title">Siguiente paso</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                Si la dirección te hace sentido, coordinamos una llamada corta para ajustar alcance, tiempos y forma de pago.
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
          Propuesta generada por Blyndtek OS a partir del diagnóstico operativo completado por el cliente.
        </p>
      </div>
    </main>
  );
}
