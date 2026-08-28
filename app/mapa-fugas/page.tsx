import type { Metadata } from "next";
import Image from "next/image";
import { Clock3, CopyCheck, Route, SearchCheck } from "lucide-react";
import { MapaFugasForm } from "@/components/marketing/MapaFugasForm";

export const metadata: Metadata = {
  title: "Mapa de fugas operativas | Blyndtek",
  description: "Detectá dónde se repite información, se pierden horas y aparecen errores dentro de un proceso.",
  robots: { index: false, follow: false }
};

const signals = [
  { icon: CopyCheck, title: "Recargas", text: "La misma información copiada entre WhatsApp, planillas y sistemas." },
  { icon: Clock3, title: "Esperas", text: "Pasos detenidos porque falta una respuesta, aprobación o dato." },
  { icon: SearchCheck, title: "Correcciones", text: "Trabajo que debe revisarse o rehacerse para que el proceso cierre." }
];

export default function MapaFugasPage() {
  return (
    <main className="min-h-screen bg-[#081226] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgba(91,140,255,0.28),transparent_30%),radial-gradient(circle_at_16%_72%,rgba(56,161,105,0.18),transparent_28%)]" />
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
          <Image src="/Logo_Blyndtek_plataforma.svg" alt="Blyndtek" width={154} height={38} priority className="h-9 w-auto brightness-0 invert" />

          <div className="grid gap-12 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-20">
            <section>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#BDD3FF]">
                <Route className="h-3.5 w-3.5" aria-hidden="true" />
                Diagnóstico práctico · 7–10 minutos
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl">
                Encontrá dónde se fuga el tiempo de tu operación.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[#B7C3D8] sm:text-lg">
                Mapeá un solo proceso y detectá recargas, esperas y correcciones antes de sumar otra herramienta o reemplazar lo que ya usás.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {signals.map(({ icon: Icon, title, text }) => (
                  <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur">
                    <Icon className="h-5 w-5 text-[#8DB3FF]" aria-hidden="true" />
                    <h2 className="mt-4 text-sm font-semibold">{title}</h2>
                    <p className="mt-2 text-xs leading-5 text-[#A7B4C9]">{text}</p>
                  </article>
                ))}
              </div>

              <div className="mt-8 border-l-2 border-[#6F9DFF] pl-4 text-sm leading-6 text-[#B7C3D8]">
                No intenta mapear toda la empresa. Elegís pedidos, presupuestos, cobranzas u otro proceso y la hoja calcula las horas mensuales y los puntos de fuga.
              </div>
            </section>

            <MapaFugasForm />
          </div>
        </div>
      </div>
    </main>
  );
}
