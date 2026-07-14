"use client";

import { Button } from "@/components/ui";
import { formatFecha } from "@/lib/utils/formatters";
import { getWikiPreview } from "@/lib/wiki";
import { cn } from "@/lib/cn";
import type { WikiArticulo, WikiCategoria } from "@/types/wiki";

type WikiListaProps = {
  articulos: WikiArticulo[];
  categorias: WikiCategoria[];
  loading: boolean;
  selectedArticuloId: string | null;
  onSelectArticulo: (articulo: WikiArticulo) => void;
  onNewArticulo: () => void;
};

export function WikiLista({
  articulos,
  categorias,
  loading,
  selectedArticuloId,
  onSelectArticulo,
  onNewArticulo
}: WikiListaProps) {
  const categoriasMap = new Map(categorias.map((categoria) => [categoria.id, categoria.nombre]));

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex-shrink-0 border-b border-line-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-graphite">{articulos.length} artículos</p>
          <Button size="sm" onClick={onNewArticulo}>
            + Artículo
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="rounded-card border border-dashed border-line bg-paper p-4 text-sm text-graphite">
            Cargando artículos...
          </div>
        ) : articulos.length > 0 ? (
          <div>
            {articulos.map((articulo) => {
              const selected = selectedArticuloId === articulo.id;
              const categoriaNombre = articulo.categoria_id ? categoriasMap.get(articulo.categoria_id) : null;

              return (
                <button
                  key={articulo.id}
                  onClick={() => onSelectArticulo(articulo)}
                  className={cn(
                    "block w-full border-b border-[#EAECF0] px-3 py-3 text-left transition-colors duration-fast ease-fast last:border-b-0",
                    selected ? "rounded-component bg-signal-light" : "hover:bg-paper"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-label text-carbon">{articulo.titulo}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-graphite">
                        {getWikiPreview(articulo.contenido)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-graphite">
                    <span>{formatFecha(articulo.updated_at)}</span>
                    {categoriaNombre ? <span>· {categoriaNombre}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-card border border-dashed border-line bg-paper p-6 text-center">
            <p className="text-sm text-graphite">No hay artículos para esta vista.</p>
            <Button onClick={onNewArticulo}>Crear artículo</Button>
          </div>
        )}
      </div>
    </section>
  );
}
