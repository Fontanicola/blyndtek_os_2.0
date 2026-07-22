import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

type InformePageProps = {
  params: {
    token: string;
  };
};

type DiagnosticoInformeRecord = {
  id: string;
  token_publico: string;
  informe_hallazgos: unknown;
  modulos_sugeridos: unknown;
  precio_ideal_desarrollo: number | null;
  precio_ideal_mensual: number | null;
  estado: string;
  lead?: {
    empresa: string;
    contacto_1_nombre: string | null;
  } | null;
};

type HallazgoInforme = {
  hallazgo: string;
  impacto: string;
  que_resolveria: string;
};

type ModuloInforme = {
  nombre: string;
  descripcion: string | null;
  justificacion: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseHallazgos(value: unknown): HallazgoInforme[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const hallazgo = typeof item.hallazgo === "string" ? item.hallazgo : "";
    const impacto = typeof item.impacto === "string" ? item.impacto : "";
    const queResolveria = typeof item.que_resolveria === "string" ? item.que_resolveria : "";

    if (!hallazgo || !impacto || !queResolveria) {
      return [];
    }

    return [{ hallazgo, impacto, que_resolveria: queResolveria }];
  });
}

function parseModulos(value: unknown): ModuloInforme[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const nombre = typeof item.nombre === "string" ? item.nombre : "";
    const descripcion = typeof item.descripcion === "string" ? item.descripcion : null;
    const justificacion = typeof item.justificacion === "string" ? item.justificacion : "";

    if (!nombre) {
      return [];
    }

    return [{ nombre, descripcion, justificacion }];
  });
}

function formatCurrency(value: number | null) {
  return `$${Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 0
  })} USD`;
}

async function fetchInforme(token: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("diagnosticos")
    .select("id, token_publico, informe_hallazgos, modulos_sugeridos, precio_ideal_desarrollo, precio_ideal_mensual, estado, lead:leads(empresa, contacto_1_nombre)")
    .eq("token_publico", token)
    .maybeSingle<DiagnosticoInformeRecord>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.estado !== "informe_generado") {
    return null;
  }

  return data;
}

export async function generateMetadata({ params }: InformePageProps): Promise<Metadata> {
  const informe = await fetchInforme(params.token).catch(() => null);

  return {
    title: informe ? `Informe diagnóstico · ${informe.lead?.empresa ?? "Blyndtek"}` : "Informe no disponible"
  };
}

export default async function DiagnosticoInformePage({ params }: InformePageProps) {
  const informe = await fetchInforme(params.token);

  if (!informe) {
    notFound();
  }

  const hallazgos = parseHallazgos(informe.informe_hallazgos);
  const modulos = parseModulos(informe.modulos_sugeridos);
  const empresa = informe.lead?.empresa ?? "tu operación";
  const whatsappText = encodeURIComponent(
    `Hola Blyndtek, revisé la propuesta para ${empresa} y quiero avanzar con el próximo paso.`
  );

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek"
            width={148}
            height={32}
            className="object-contain"
            style={{ width: "auto", height: "32px" }}
            priority
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-label text-graphite">
                Informe de diagnóstico
              </p>
              <h1 className="mt-3 text-3xl font-title text-carbon sm:text-4xl">
                Propuesta de sistema para {empresa}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-graphite">
                A partir de las respuestas del diagnóstico, armamos una lectura concreta de los puntos de fricción y una propuesta de módulos para ordenar la operación.
              </p>
            </div>

            <div className="rounded-card border border-signal/20 bg-signal-light p-5">
              <p className="text-sm font-label text-signal">Inversión estimada</p>
              <p className="mt-2 text-3xl font-title text-carbon">
                {formatCurrency(informe.precio_ideal_desarrollo)}
              </p>
              {Number(informe.precio_ideal_mensual ?? 0) > 0 ? (
                <p className="mt-2 text-sm text-graphite">
                  + {formatCurrency(informe.precio_ideal_mensual)} mensuales
                </p>
              ) : null}
            </div>
          </div>
        </header>

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
                <h3 className="text-lg font-title text-carbon">{modulo.nombre}</h3>
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
      </div>
    </main>
  );
}
