import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PrintOnLoad, PrintPdfButton } from "@/components/diagnostico/PrintPdfButton";
import { fetchDiagnosticoInforme } from "@/lib/diagnostico/informe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type InformePageProps = {
  params: {
    token: string;
  };
  searchParams?: {
    print?: string;
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

function heatmapStyles(nivel: number) {
  if (nivel >= 5) {
    return { backgroundColor: "#FFF5F5", borderColor: "#F5B5B5", color: "#B91C1C" };
  }

  if (nivel >= 4) {
    return { backgroundColor: "#FFFBEB", borderColor: "#F4D28A", color: "#B45309" };
  }

  if (nivel >= 3) {
    return { backgroundColor: "#E8EEFF", borderColor: "#AFC0FF", color: "#1F44FF" };
  }

  return { backgroundColor: "#F0FFF4", borderColor: "#A8E0BB", color: "#2F855A" };
}

export async function generateMetadata({ params }: InformePageProps): Promise<Metadata> {
  const informe = await fetchDiagnosticoInforme(params.token).catch(() => null);

  return {
    title: informe ? `Informe diagnóstico · ${informe.empresa}` : "Informe no disponible"
  };
}

export default async function DiagnosticoInformePage({ params, searchParams }: InformePageProps) {
  const informe = await fetchDiagnosticoInforme(params.token);

  if (!informe) {
    notFound();
  }

  const { empresa, hallazgos, diagnosticoEmpresa, antesDespues, mapaAreas, cuantificacion } = informe;
  const {
    contexto_empresa,
    dependencias_criticas,
    riesgos_operativos,
    prioridades_90_dias,
    indicadores_clave
  } = diagnosticoEmpresa;
  const formatUsd = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} USD`;
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
              <PrintPdfButton />
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

        <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="print-card rounded-card border border-line-soft bg-white p-5">
                <p className="text-sm font-label text-graphite">Problemas detectados</p>
                <p className="mt-2 text-3xl font-title text-carbon">{hallazgos.length}</p>
              </div>
              <div className="print-card rounded-card border border-line-soft bg-white p-5">
                <p className="text-sm font-label text-graphite">Oportunidades de mejora</p>
                <p className="mt-2 text-3xl font-title text-carbon">{diagnosticoEmpresa.oportunidades_mejora.length}</p>
              </div>
              <div className="print-card rounded-card border border-line-soft bg-white p-5">
                <p className="text-sm font-label text-graphite">Tipo de análisis</p>
                <p className="mt-2 text-lg font-title text-carbon">Diagnóstico operativo</p>
              </div>
              <div className="print-card rounded-card border border-line-soft bg-white p-5">
                <p className="text-sm font-label text-graphite">Costo anual estimado</p>
                <p className="mt-2 text-3xl font-title text-carbon">
                  {cuantificacion && cuantificacion.total_anual_usd > 0 ? formatUsd(cuantificacion.total_anual_usd) : "A validar"}
                </p>
                <p className="mt-2 text-xs text-graphite">
                  {cuantificacion ? `Estimación interna · confianza ${cuantificacion.confianza}` : "Sin métricas cuantificadas todavía"}
                </p>
              </div>
            </section>

            <section id="lectura" className="print-card scroll-mt-8 space-y-5 rounded-card border border-line-soft bg-white p-6 sm:p-8">
              <SectionLabel>Informe diagnóstico</SectionLabel>
              <div>
                <h2 className="text-2xl font-title text-carbon">Lectura ejecutiva</h2>
                <p className="mt-4 text-base leading-7 text-graphite">{diagnosticoEmpresa.resumen_ejecutivo}</p>
              </div>
              <div className="print-card rounded-card border border-line-soft bg-paper/60 p-5">
                <h3 className="text-lg font-title text-carbon">Cómo opera hoy</h3>
                <p className="mt-3 text-sm leading-7 text-graphite">{diagnosticoEmpresa.operativa_actual}</p>
              </div>
            </section>

            <section id="alcance" className="print-card scroll-mt-8 space-y-5 rounded-card border border-line-soft bg-white p-6 sm:p-8 print-page">
              <SectionLabel>Alcance del relevamiento</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Qué se analizó y cómo leer este informe</h2>
              <p className="mt-4 text-sm leading-7 text-graphite">
                Este diagnóstico combina la información cualitativa del cuestionario, el contexto interno registrado por Blyndtek y la sesión de relevamiento cuantitativo. No busca calificar a la empresa: busca hacer visible dónde el modelo operativo depende de memoria, planillas, mensajes o controles difíciles de auditar.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["Observar", "Cómo circula hoy la información y dónde se pierde continuidad."],
                  ["Cuantificar", "Qué tiempo, reproceso, riesgo o oportunidad puede medirse."],
                  ["Priorizar", "Qué orden conviene instalar antes de sumar complejidad tecnológica."]
                ].map(([title, text]) => (
                  <div key={title} className="print-card rounded-card border border-line-soft bg-paper/60 p-5">
                    <p className="font-title text-carbon">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-graphite">{text}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-component border-l-2 border-signal bg-signal-light px-4 py-3 text-sm leading-6 text-carbon">
                El documento describe el estado actual y sus implicancias. La propuesta de software es un documento separado y sólo aparece después de cerrar esta lectura.
              </div>
            </section>

            <section id="contexto" className="print-card scroll-mt-8 space-y-5 rounded-card border border-line-soft bg-white p-6 sm:p-8 print-page">
              <SectionLabel>Contexto empresarial</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">La empresa dentro de su realidad operativa</h2>
              <p className="mt-4 text-base leading-7 text-graphite">{contexto_empresa}</p>
              <div className="rounded-card border border-line-soft bg-paper/60 p-5">
                <p className="text-sm font-label text-graphite">Lectura de Blyndtek</p>
                <p className="mt-3 text-sm leading-7 text-carbon">
                  La oportunidad no está en reemplazar indiscriminadamente las herramientas que ya funcionan, sino en conectar los puntos críticos para que la información pueda convertirse en decisiones, responsables y acciones verificables.
                </p>
              </div>
            </section>

            <section id="cuantificacion" className="print-card scroll-mt-8 space-y-5 rounded-card border border-line-soft bg-white p-6 sm:p-8 print-page">
              <SectionLabel>Línea de base cuantitativa</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Qué costo puede estar oculto en la operación manual</h2>
              <p className="mt-4 text-sm leading-7 text-graphite">
                La siguiente lectura se calcula con las métricas cargadas durante la sesión interna. Es una estimación de trabajo para decidir dónde profundizar, no una promesa de ahorro ni una cifra contable.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="print-card rounded-card border border-line-soft p-5"><p className="text-sm font-label text-graphite">Costo mensual estimado</p><p className="mt-2 text-2xl font-title text-carbon">{cuantificacion && cuantificacion.total_mensual_usd > 0 ? formatUsd(cuantificacion.total_mensual_usd) : "A validar"}</p></div>
                <div className="print-card rounded-card border border-line-soft p-5"><p className="text-sm font-label text-graphite">Costo anual estimado</p><p className="mt-2 text-2xl font-title text-carbon">{cuantificacion && cuantificacion.total_anual_usd > 0 ? formatUsd(cuantificacion.total_anual_usd) : "A validar"}</p></div>
                <div className="print-card rounded-card border border-line-soft p-5"><p className="text-sm font-label text-graphite">Confianza del relevamiento</p><p className="mt-2 text-2xl font-title text-carbon">{cuantificacion?.confianza ?? "Pendiente"}</p></div>
              </div>
              <p className="text-xs leading-5 text-graphite">La precisión mejora cuando se validan volúmenes, tiempos y costos con registros reales durante la etapa de diseño funcional.</p>
            </section>

            <section id="hallazgos" className="scroll-mt-8 rounded-card border border-line-soft bg-white p-6 sm:p-8">
              <div className="print-heading-group max-w-3xl">
                <SectionLabel>Problemas detectados</SectionLabel>
                <h2 className="mt-2 text-2xl font-title text-carbon">Dónde la operación pierde control, tiempo o trazabilidad</h2>
                <p className="mt-3 text-sm leading-6 text-graphite">
                  Estos hallazgos salen de las respuestas del diagnóstico y del contexto adicional cargado por Blyndtek. La intención no es marcar errores, sino identificar dónde conviene instalar “maquinaria digital” para que la empresa dependa menos de memoria, mensajes sueltos y seguimiento manual.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {hallazgos.map((hallazgo, index) => (
                  <article key={`${hallazgo.hallazgo}-${index}`} className="print-card rounded-card border border-line-soft p-5">
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
                      <p className="mt-3 text-sm leading-6 text-graphite">Lectura de la operación: {hallazgo.evidencia}</p>
                    ) : null}
                    <p className="mt-3 text-sm leading-6 text-graphite">Impacto: {hallazgo.impacto}</p>
                    <div className="mt-4 rounded-component bg-signal-light px-3 py-2 text-sm font-label text-carbon">
                      {hallazgo.que_resolveria}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="costo" className="print-card scroll-mt-8 rounded-card border border-line-soft bg-white p-6 sm:p-8">
              <SectionLabel>Costo de no cambiar</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Lo que sigue pasando si no se ordena</h2>
              <p className="mt-4 text-sm leading-7 text-graphite">{diagnosticoEmpresa.costo_de_no_cambiar}</p>
            </section>

            <section id="dependencias" className="print-card scroll-mt-8 space-y-6 rounded-card border border-line-soft bg-white p-6 sm:p-8 print-page">
              <div>
                <SectionLabel>Dependencias y riesgos</SectionLabel>
                <h2 className="mt-2 text-2xl font-title text-carbon">Qué puede frenar el crecimiento si no se ordena</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-title text-carbon">Dependencias críticas</h3>
                  <div className="mt-4"><Bullets items={dependencias_criticas.length > 0 ? dependencias_criticas : ["Conocimiento operativo distribuido entre personas y herramientas que no comparten un registro común."]} /></div>
                </div>
                <div>
                  <h3 className="text-lg font-title text-carbon">Riesgos operativos</h3>
                  <div className="mt-4"><Bullets items={riesgos_operativos.length > 0 ? riesgos_operativos : ["La falta de trazabilidad puede convertir diferencias pequeñas en problemas difíciles de detectar al cierre."]} /></div>
                </div>
              </div>
            </section>

            <section id="oportunidades" className="print-card scroll-mt-8 rounded-card border border-line-soft bg-white p-6 sm:p-8">
              <SectionLabel>Oportunidades</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Qué se puede mejorar</h2>
              <div className="mt-4">
                <Bullets items={diagnosticoEmpresa.oportunidades_mejora} />
              </div>
            </section>

            <section id="prioridades" className="print-card scroll-mt-8 space-y-5 rounded-card border border-line-soft bg-white p-6 sm:p-8 print-page">
              <SectionLabel>Prioridades de corto plazo</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Qué conviene ordenar en los próximos 90 días</h2>
              <p className="mt-3 text-sm leading-6 text-graphite">Antes de construir funcionalidades, hay decisiones de proceso que reducen riesgo y preparan una implementación más rápida.</p>
              <div className="space-y-3">
                {(prioridades_90_dias.length > 0 ? prioridades_90_dias : ["Definir responsables y una fuente única para cada proceso crítico.", "Acordar indicadores mínimos de seguimiento y una frecuencia de revisión.", "Seleccionar un flujo piloto con impacto visible y datos disponibles."]).map((item, index) => (
                  <div key={`${item}-${index}`} className="print-card flex gap-4 rounded-card border border-line-soft p-4">
                    <span className="font-title text-signal">0{index + 1}</span><p className="text-sm leading-6 text-graphite">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="indicadores" className="print-card scroll-mt-8 space-y-5 rounded-card border border-line-soft bg-white p-6 sm:p-8 print-page">
              <SectionLabel>Indicadores de gestión</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Qué debería poder mirar dirección</h2>
              <div className="space-y-3">
                {(indicadores_clave.length > 0 ? indicadores_clave : [{ nombre: "Tiempo de ciclo", lectura_actual: "A validar durante el diseño funcional.", por_que_importa: "Permite detectar dónde la operación se demora y qué etapa necesita intervención." }]).map((item, index) => (
                  <article key={`${item.nombre}-${index}`} className="print-card grid gap-3 rounded-card border border-line-soft p-4 md:grid-cols-[0.8fr_1fr_1fr]">
                    <h3 className="font-title text-carbon">{item.nombre}</h3>
                    <p className="text-sm leading-6 text-graphite"><span className="font-label text-carbon">Lectura actual:</span> {item.lectura_actual}</p>
                    <p className="text-sm leading-6 text-graphite"><span className="font-label text-carbon">Por qué importa:</span> {item.por_que_importa}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="antes-despues" className="scroll-mt-8 rounded-card border border-line-soft bg-white p-6 sm:p-8">
              <div className="print-heading-group max-w-3xl">
                <SectionLabel>Antes y después</SectionLabel>
                <h2 className="mt-2 text-2xl font-title text-carbon">Qué cambia en la operación si se digitaliza</h2>
                <p className="mt-3 text-sm leading-6 text-graphite">
                  La comparación ordena el salto esperado: pasar de seguimiento manual, memoria y mensajes sueltos a procesos visibles, medibles y delegables.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {antesDespues.map((item) => (
                  <article key={`${item.area}-${item.metrica}`} className="print-card rounded-card border border-line-soft p-4">
                    <p className="font-title text-carbon">{item.area}</p>
                    <div className="mt-3 space-y-3">
                      <p className="text-sm leading-6 text-graphite">Antes: {item.antes}</p>
                      <p className="text-sm leading-6 text-carbon">Después: {item.despues}</p>
                      <p className="text-sm font-label leading-6 text-signal">Métrica de impacto: {item.metrica}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="mapa" className="scroll-mt-8 rounded-card border border-line-soft bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="print-heading-group max-w-3xl">
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

              <div className="mt-6 space-y-3">
                {mapaAreas.map((area) => (
                  <article
                    key={area.area}
                    className="print-card rounded-card border p-4"
                    style={heatmapStyles(area.nivel)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-title text-carbon">{area.area}</h3>
                      <span className="rounded-pill bg-white/70 px-2 py-1 text-xs font-label">Nivel {area.nivel}/5</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-graphite">{area.diagnostico}</p>
                    <p className="mt-3 text-sm font-label leading-6 text-carbon">{area.oportunidad}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="conclusion" className="print-card scroll-mt-8 rounded-card border border-line-soft bg-white p-6 sm:p-8">
              <SectionLabel>Conclusión</SectionLabel>
              <h2 className="mt-2 text-2xl font-title text-carbon">Lectura final del diagnóstico</h2>
              <p className="mt-4 text-base leading-7 text-graphite">{diagnosticoEmpresa.conclusion_diagnostico}</p>
            </section>
        </div>

        <p className="text-center text-xs text-graphite">
          Informe generado por Blyndtek LLC para {empresa}
        </p>
      </div>
      {searchParams?.print === "1" ? <PrintOnLoad /> : null}
    </main>
  );
}
