"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { PinIcon } from "@/components/ui/icons";
import { getNotaPreview, getNotaEtiquetaColorClasses } from "@/lib/notas";
import { formatFecha } from "@/lib/utils/formatters";
import { useRouter } from "next/navigation";
import type { Nota } from "@/types/notas";
import type { NotaEtiqueta } from "@/types/notasEtiquetas";

type NotaEntidadTipo = "cliente" | "proyecto" | "lead";

type NotasVinculadasSectionProps = {
  entityType: NotaEntidadTipo;
  entityId: string;
  entityLabel: string;
  href: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export function NotasVinculadasSection({ entityType, entityId, entityLabel, href }: NotasVinculadasSectionProps) {
  const router = useRouter();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [etiquetas, setEtiquetas] = useState<NotaEtiqueta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadNotas() {
      setLoading(true);

      try {
        const searchParams = new URLSearchParams({
          papelera: "false",
          [`${entityType}_id`]: entityId
        });

        const [notasResponse, etiquetasResponse] = await Promise.all([
          fetch(`/api/notas?${searchParams.toString()}`),
          fetch("/api/notas-etiquetas")
        ]);
        const notasPayload = (await notasResponse.json()) as ApiResponse<Nota[]>;
        const etiquetasPayload = (await etiquetasResponse.json()) as ApiResponse<NotaEtiqueta[]>;

        if (!notasResponse.ok || !notasPayload.data) {
          throw new Error(notasPayload.error ?? "No se pudieron cargar las notas vinculadas.");
        }

        if (!etiquetasResponse.ok || !etiquetasPayload.data) {
          throw new Error(etiquetasPayload.error ?? "No se pudieron cargar las etiquetas.");
        }

        if (!cancelled) {
          setNotas(notasPayload.data);
          setEtiquetas(etiquetasPayload.data);
        }
      } catch {
        if (!cancelled) {
          setNotas([]);
          setEtiquetas([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotas();

    return () => {
      cancelled = true;
    };
  }, [entityId, entityType]);

  const etiquetaMap = useMemo(() => new Map(etiquetas.map((item) => [item.nombre, item])), [etiquetas]);
  const emptyMessage = useMemo(() => {
    return `Aún no hay notas vinculadas a ${entityLabel}.`;
  }, [entityLabel]);

  async function handleCreateNota() {
    setCreating(true);

    try {
      const response = await fetch("/api/notas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          titulo: `Nota de ${entityLabel}`,
          [`${entityType}_id`]: entityId
        })
      });
      const payload = (await response.json()) as ApiResponse<Nota>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear la nota.");
      }

      router.push(`/notas?nota_id=${payload.data.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card padding="md" className="space-y-4 border border-line-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-title text-carbon">Notas vinculadas</h3>
          <p className="mt-1 text-xs text-graphite">{entityLabel}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void handleCreateNota()} loading={creating}>
          + Nota
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-graphite">Cargando notas...</p>
      ) : notas.length > 0 ? (
        <div className="space-y-2">
          {notas.map((nota) => (
            <button
              key={nota.id}
              type="button"
              onClick={() => router.push(`/notas?nota_id=${nota.id}`)}
              className="w-full rounded-card border border-line-soft bg-white p-3 text-left transition-colors duration-fast ease-fast hover:shadow-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-label text-carbon">{nota.titulo}</p>
                {nota.fijada ? (
                  <span className="inline-flex items-center text-signal" title="Nota fijada">
                    <PinIcon />
                  </span>
                ) : null}
              </div>
              {nota.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {nota.tags.slice(0, 4).map((tag) => {
                    const etiqueta = etiquetaMap.get(tag);
                    const colorClasses = getNotaEtiquetaColorClasses(etiqueta?.color);

                    return (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-pill bg-white/80 px-2 py-0.5 text-[11px] text-graphite shadow-soft"
                      >
                        <span className={`h-2 w-2 rounded-full ${colorClasses.dotClass}`} />
                        <span className="max-w-[10rem] truncate">{tag}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-graphite">{getNotaPreview(nota.contenido)}</p>
              <p className="mt-2 text-xs text-graphite">{formatFecha(nota.updated_at)}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-line bg-paper p-4 text-sm text-graphite">
          {emptyMessage}
        </div>
      )}

      <Link href={href} className="inline-flex text-sm text-signal transition-colors duration-fast ease-fast hover:underline">
        Ir a la ficha →
      </Link>
    </Card>
  );
}
