"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getNotaPreview, getNotaEtiquetaColorClasses } from "@/lib/notas";
import { formatFecha } from "@/lib/utils/formatters";
import type { CarpetaNota, Nota } from "@/types/notas";
import type { NotaEtiqueta } from "@/types/notasEtiquetas";

type NotasListaProps = {
  notas: Nota[];
  carpetas: CarpetaNota[];
  etiquetas: NotaEtiqueta[];
  loading: boolean;
  selectedNotaId: string | null;
  onSelectNota: (nota: Nota) => void;
  onNewNota: () => void;
};

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M11.5 2.75 17.25 8.5l-2.25 1.25-3 3v4l-1.5 1.5-1-1 1.5-1.5v-4l-3-3L5 9.75 11.5 2.75Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NotasLista({
  notas,
  carpetas,
  etiquetas,
  loading,
  selectedNotaId,
  onSelectNota,
  onNewNota
}: NotasListaProps) {
  const carpetasMap = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta.nombre]));
  const etiquetasMap = new Map(etiquetas.map((etiqueta) => [etiqueta.nombre, etiqueta]));

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex-shrink-0 border-b border-line-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-graphite">{notas.length} notas</p>
          <Button size="sm" onClick={onNewNota}>
            + Nota
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="rounded-card border border-dashed border-line bg-paper p-4 text-sm text-graphite">
            Cargando notas...
          </div>
        ) : notas.length > 0 ? (
          <div>
            {notas.map((nota) => {
              const selected = selectedNotaId === nota.id;
              const carpetaNombre = nota.carpeta_id ? carpetasMap.get(nota.carpeta_id) : null;

              return (
                <button
                  key={nota.id}
                  onClick={() => onSelectNota(nota)}
                  className={cn(
                    "block w-full border-b border-[#EAECF0] px-3 py-3 text-left transition-colors duration-fast ease-fast last:border-b-0",
                    selected ? "rounded-component bg-signal-light" : "hover:bg-paper"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-label text-carbon">{nota.titulo}</p>
                        {nota.fijada ? (
                          <span className="inline-flex items-center text-signal" title="Nota fijada">
                            <PinIcon />
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-graphite">
                        {getNotaPreview(nota.contenido)}
                      </p>
                    </div>
                  </div>

                  {nota.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {nota.tags.slice(0, 4).map((tag) => {
                        const etiqueta = etiquetasMap.get(tag);
                        const colorClasses = getNotaEtiquetaColorClasses(etiqueta?.color);

                        return (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 rounded-pill bg-white/80 px-2 py-0.5 text-[11px] text-graphite shadow-soft"
                          >
                            <span className={cn("h-2 w-2 rounded-full", colorClasses.dotClass)} />
                            <span className="max-w-[10rem] truncate">{tag}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-graphite">
                    <span>{formatFecha(nota.updated_at)}</span>
                    {carpetaNombre ? <span>· {carpetaNombre}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-card border border-dashed border-line bg-paper p-6 text-center">
            <p className="text-sm text-graphite">No hay notas para esta vista.</p>
            <Button onClick={onNewNota}>Crear nota</Button>
          </div>
        )}
      </div>
    </section>
  );
}
