"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, EmptyState, PageSkeleton } from "@/components/ui";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  MegaphoneIcon,
  PencilIcon,
  SparklesIcon,
  TareasIcon
} from "@/components/ui/icons";
import { fetchPiezas } from "@/lib/hooks/useContenido";
import type { PiezaContenido } from "@/types/contenido";

type MarcaWorkspaceProps = {
  nombreUsuario: string;
};

const accessCards = [
  {
    href: "/contenido",
    label: "Contenido",
    description: "Planificar, redactar y revisar piezas para Instagram y LinkedIn.",
    icon: FileTextIcon,
    action: "Abrir Content Studio"
  },
  {
    href: "/marketing",
    label: "Campañas y atribución",
    description: "Entender qué canales generan oportunidades y qué conviene reforzar.",
    icon: MegaphoneIcon,
    action: "Ver marketing"
  },
  {
    href: "/archivos",
    label: "Recursos de marca",
    description: "Centralizar logos, piezas aprobadas, manuales y materiales compartidos.",
    icon: FolderIcon,
    action: "Abrir archivos"
  },
  {
    href: "/calendario",
    label: "Calendario editorial",
    description: "Coordinar publicaciones, reuniones, entregas y fechas importantes.",
    icon: CalendarIcon,
    action: "Abrir calendario"
  },
  {
    href: "/tareas",
    label: "Tareas",
    description: "Convertir cada idea o campaña en una próxima acción concreta.",
    icon: TareasIcon,
    action: "Ver tareas"
  },
  {
    href: "/notas",
    label: "Notas de marca",
    description: "Guardar criterios, decisiones, referencias y aprendizajes del equipo.",
    icon: PencilIcon,
    action: "Abrir notas"
  }
];

function countByState(piezas: PiezaContenido[], estado: PiezaContenido["estado"]) {
  return piezas.filter((pieza) => pieza.estado === estado).length;
}

export function MarcaWorkspace({ nombreUsuario }: MarcaWorkspaceProps) {
  const [piezas, setPiezas] = useState<PiezaContenido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await fetchPiezas();
        if (active) {
          setPiezas(data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el estado de contenido.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(
    () => [
      { label: "Pendientes de revisión", value: countByState(piezas, "en_diseno"), tone: "warning" as const },
      { label: "Programadas", value: countByState(piezas, "programada"), tone: "signal" as const },
      { label: "Listas para publicar", value: countByState(piezas, "lista"), tone: "success" as const },
      { label: "Publicadas", value: countByState(piezas, "publicada"), tone: "default" as const }
    ],
    [piezas]
  );

  if (loading) {
    return <PageSkeleton rows={6} kpis={4} />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-line-soft pb-5">
        <div>
          <p className="text-sm font-label text-graphite">Marca y contenido</p>
          <h1 className="mt-1 font-title text-2xl text-carbon">El espacio de Blyndtek para comunicar mejor</h1>
          <p className="mt-2 max-w-2xl text-sm text-graphite">
            Hola, {nombreUsuario}. Desde acá podés ordenar la imagen de marca, coordinar canales y llevar cada pieza hasta su publicación.
          </p>
        </div>
        <Link
          href="/contenido"
          className="inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2 text-sm font-label text-white no-underline transition-colors duration-fast hover:bg-signal-hover"
        >
          <SparklesIcon size={17} />
          Abrir Content Studio
        </Link>
      </section>

      {error ? (
        <div className="rounded-md border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">{error}</div>
      ) : null}

      <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} padding="sm" className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-graphite">{metric.label}</span>
              <Badge variant={metric.tone}>{metric.value}</Badge>
            </div>
            <p className="mt-3 text-2xl font-title text-carbon">{metric.value}</p>
          </Card>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-title text-lg text-carbon">Tu espacio de trabajo</h2>
            <p className="mt-1 text-sm text-graphite">Las herramientas que Luli va a usar en el día a día.</p>
          </div>
          <ImageIcon className="text-signal" size={22} />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {accessCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} className="group no-underline">
                <Card padding="md" className="h-full min-w-0 transition-colors duration-fast group-hover:border-signal/30 group-hover:bg-signal-light/20">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal-light text-signal">
                      <Icon size={20} />
                    </span>
                    <ArrowRightIcon className="text-graphite transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-signal" size={18} />
                  </div>
                  <h3 className="mt-4 font-title text-base text-carbon">{card.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-graphite">{card.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-label text-signal underline underline-offset-2">
                    {card.action}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid min-w-0 gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <Card padding="none" className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
            <div>
              <h2 className="font-title text-base text-carbon">Próximo foco</h2>
              <p className="mt-1 text-sm text-graphite">El trabajo que más conviene mover hoy.</p>
            </div>
            <CheckCircleIcon className="text-success" size={21} />
          </div>
          {piezas.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState icon={FileTextIcon} titulo="Todavía no hay piezas de contenido" descripcion="Creá la primera pieza o generá el próximo plan semanal desde Content Studio." />
            </div>
          ) : (
            <div className="divide-y divide-line-soft">
              {piezas.filter((pieza) => pieza.estado === "en_diseno" || pieza.estado === "idea").slice(0, 4).map((pieza) => (
                <Link key={pieza.id} href="/contenido" className="flex items-center justify-between gap-4 px-5 py-3 no-underline transition-colors duration-fast hover:bg-paper">
                  <span className="min-w-0 truncate text-sm font-label text-carbon">{pieza.titulo}</span>
                  <Badge variant={pieza.estado === "en_diseno" ? "warning" : "default"}>{pieza.estado === "en_diseno" ? "Revisar" : "Idea"}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md" className="min-w-0 bg-signal-light/35">
          <p className="text-sm font-label text-signal">Criterio de trabajo</p>
          <h2 className="mt-2 font-title text-lg text-carbon">Una marca, varios canales, una sola dirección.</h2>
          <p className="mt-2 text-sm leading-6 text-graphite">
            Cada publicación debería reforzar la misma identidad: qué hace Blyndtek, para quién y cómo convierte trabajo complejo en una operación simple de entender y ejecutar.
          </p>
          <Link href="/contenido" className="mt-4 inline-flex items-center gap-2 text-sm font-label text-signal underline underline-offset-2">
            Revisar identidad y piezas <ArrowRightIcon size={16} />
          </Link>
        </Card>
      </section>
    </div>
  );
}
