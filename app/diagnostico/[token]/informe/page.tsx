import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DownloadIcon } from "@/components/ui/icons";
import { fetchDiagnosticoInforme, formatInformeCurrency } from "@/lib/diagnostico/informe";

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

export async function generateMetadata({ params }: InformePageProps): Promise<Metadata> {
  const informe = await fetchDiagnosticoInforme(params.token).catch(() => null);

  return {
    title: informe ? `Diagnóstico y propuesta · ${informe.empresa}` : "Informe no disponible"
  };
}

export default async function DiagnosticoInformePage({ params }: InformePageProps) {
  const informe = await fetchDiagnosticoInforme(params.token);

  if (!informe) {
    notFound();
  }

  const { empresa, hallazgos, modulos, diagnosticoEmpresa, propuestaSoftware } = informe;
  const whatsappText = encodeURIComponent(
    `Hola Blyndtek, revisé el diagnóstico y la propuesta para ${empresa}. Quiero avanzar con el próximo paso.`
  );

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
              <SectionLabel>Diagnóstico de empresa y propuesta de software</SectionLabel>
              <h1 className="mt-3 text-3xl font-title text-carbon sm:text-5xl">
                Sistema a medida para {empresa}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-graphite">
                Este documento primero muestra qué está pasando en la operación actual y después traduce ese diagnóstico en una propuesta concreta de software, módulos, impacto esperado y próximos pasos.
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
            <p className="text-sm font-label text-graphite">Problemas detectados</p>
            <p className="mt-2 text-3xl font-title text-carbon">{hallazgos.length}</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Módulos propuestos</p>
            <p className="mt-2 text-3xl font-title text-carbon">{modulos.length}</p>
          </div>
          <div className="rounded-card border border-line-soft bg-white p-5">
            <p className="text-sm font-label text-graphite">Tipo de solución</p>
            <p className="mt-2 text-lg font-title text-carbon">Sistema operativo a medida</p>
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

        <section className="rounded-card border border-line-soft bg-carbon p-6 text-white sm:p-8">
          <SectionLabel>Propuesta de software</SectionLabel>
          <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <h2 className="text-3xl font-title">{propuestaSoftware.vision_sistema}</h2>
              <p className="mt-4 text-sm leading-7 text-white/70">{propuestaSoftware.alcance_general}</p>
            </div>
            <div className="rounded-card border border-white/10 bg-white/5 p-5">
              <p className="text-sm font-label text-white/70">Inversión</p>
              <p className="mt-2 text-3xl font-title">{formatInformeCurrency(informe.precio_ideal_desarrollo)}</p>
              {informe.precio_ideal_mensual > 0 ? (
                <p className="mt-2 text-sm text-white/70">
                  + {formatInformeCurrency(informe.precio_ideal_mensual)} mensuales
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <div className="max-w-3xl">
            <SectionLabel>Módulos propuestos</SectionLabel>
            <h2 className="mt-2 text-2xl font-title text-carbon">Qué tendría el sistema y por qué importa</h2>
            <p className="mt-3 text-sm leading-6 text-graphite">
              Cada módulo está conectado a un dolor del diagnóstico. El cliente no está comprando pantallas: está comprando control operativo, velocidad y menor dependencia de procesos manuales.
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
            <h2 className="mt-2 text-2xl font-title text-carbon">Qué cambia cuando el sistema entra en operación</h2>
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
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <SectionLabel>Supuestos</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Condiciones consideradas</h2>
              <div className="mt-4">
                <Bullets items={propuestaSoftware.supuestos} />
              </div>
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

        <section className="rounded-card border border-line-soft bg-carbon p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-title">Siguiente paso</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
                Si la dirección hace sentido, coordinamos una llamada corta para ajustar alcance, prioridades, tiempos y forma de pago.
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
