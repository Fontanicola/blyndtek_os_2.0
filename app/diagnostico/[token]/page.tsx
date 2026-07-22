import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DiagnosticoForm } from "@/components/diagnostico/DiagnosticoForm";
import type { DiagnosticoPublicPayload } from "@/types/diagnostico";

type DiagnosticoPageProps = {
  params: {
    token: string;
  };
};

type ApiResponse = {
  data?: DiagnosticoPublicPayload;
  error?: string;
};

async function fetchDiagnostico(token: string) {
  const requestHeaders = headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("No se pudo resolver el host para cargar el diagnóstico.");
  }

  const response = await fetch(`${protocol}://${host}/api/diagnostico/${token}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  const payload = (await response.json()) as ApiResponse;

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudo cargar el diagnóstico.");
  }

  return payload.data;
}

export async function generateMetadata({ params }: DiagnosticoPageProps): Promise<Metadata> {
  const diagnostico = await fetchDiagnostico(params.token).catch(() => null);

  return {
    title: diagnostico ? `Diagnóstico · ${diagnostico.lead?.empresa ?? "Blyndtek"}` : "Diagnóstico no disponible"
  };
}

export default async function DiagnosticoPage({ params }: DiagnosticoPageProps) {
  const payload = await fetchDiagnostico(params.token);

  if (!payload) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <Image
            src="/Logo_Blyndtek_plataforma_negro.svg"
            alt="Blyndtek"
            width={132}
            height={28}
            className="object-contain"
            style={{ width: "auto", height: "28px" }}
            priority
          />

          <div className="mt-8 space-y-3">
            <p className="text-sm font-label text-graphite">
              Diagnóstico operativo
            </p>
            <h1 className="text-2xl font-title text-carbon sm:text-3xl">
              Este diagnóstico nos ayuda a entender tu operación.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-graphite">
              No hay respuestas correctas o incorrectas. La idea es capturar cómo trabajan hoy,
              dónde se traban los procesos y qué oportunidades reales hay para automatizar o mejorar.
            </p>
            {payload.lead?.empresa ? (
              <p className="text-sm text-carbon">
                Para: <span className="font-label">{payload.lead.empresa}</span>
              </p>
            ) : null}
          </div>
        </header>

        <section className="rounded-card border border-line-soft bg-white p-6 sm:p-8">
          <DiagnosticoForm
            initialPayload={payload}
            saveUrl={`/api/diagnostico/${params.token}`}
          />
        </section>
      </div>
    </main>
  );
}
