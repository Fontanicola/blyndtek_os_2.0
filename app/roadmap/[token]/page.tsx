import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { RoadmapFooter, RoadmapHeader, RoadmapTimeline } from "@/components/roadmap";
import type { PublicRoadmapProject } from "@/types/roadmap-public";

type RoadmapPageProps = {
  params: {
    token: string;
  };
};

type RoadmapApiResponse = {
  data?: PublicRoadmapProject;
  error?: string;
};

async function fetchRoadmap(token: string) {
  const requestHeaders = headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("No se pudo resolver el host para cargar el roadmap.");
  }

  const response = await fetch(`${protocol}://${host}/api/roadmap/${token}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  const payload = (await response.json()) as RoadmapApiResponse;

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudo cargar el roadmap.");
  }

  return payload.data;
}

export async function generateMetadata({ params }: RoadmapPageProps): Promise<Metadata> {
  const roadmap = await fetchRoadmap(params.token).catch(() => null);

  if (!roadmap) {
    return {
      title: "Roadmap no disponible · Blyndtek"
    };
  }

  return {
    title: `Roadmap · ${roadmap.nombre} · Blyndtek`
  };
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const roadmap = await fetchRoadmap(params.token);

  if (!roadmap) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <RoadmapHeader roadmap={roadmap} />
        <RoadmapTimeline fases={roadmap.fases} />
        <RoadmapFooter ultimaActualizacion={roadmap.ultima_actualizacion} />
      </div>
    </main>
  );
}
