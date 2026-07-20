"use client";

import { Button, EmptyState, Input } from "@/components/ui";
import { BookOpenIcon, SearchIcon } from "@/components/ui/icons";
import type { WikiCategoria } from "@/types/wiki";

type WikiCategoriaConConteo = WikiCategoria & { cantidad_articulos: number };

type WikiSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  categorias: WikiCategoriaConConteo[];
  selectedCategoryId: string | null;
  onSelectAll: () => void;
  onSelectCategory: (categoryId: string) => void;
  onCreateCategory: () => void;
};

export function WikiSidebar({
  search,
  onSearchChange,
  categorias,
  selectedCategoryId,
  onSelectAll,
  onSelectCategory,
  onCreateCategory
}: WikiSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div className="border-b border-line-soft p-4">
        <Input
          placeholder="Buscar artículos"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          leftIcon={<SearchIcon />}
        />
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-label uppercase tracking-[0.16em] text-graphite">Categorías</h3>
            <Button variant="secondary" size="sm" onClick={onCreateCategory}>
              + Categoría
            </Button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onSelectAll}
              className={[
                "flex w-full items-center justify-between gap-3 rounded-component px-3 py-2 text-left transition-colors duration-fast ease-fast",
                !selectedCategoryId ? "bg-signal-light text-carbon" : "hover:bg-paper"
              ].join(" ")}
            >
              <span className="text-sm font-label">Todos los artículos</span>
              {!selectedCategoryId ? <span className="text-xs font-label text-signal">Activos</span> : null}
            </button>

            {categorias.length > 0 ? (
              categorias.map((categoria) => {
                const selected = categoria.id === selectedCategoryId;

                return (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => onSelectCategory(categoria.id)}
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-component px-3 py-2 text-left transition-colors duration-fast ease-fast",
                      selected ? "bg-signal-light text-carbon" : "hover:bg-paper"
                    ].join(" ")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-label">{categoria.nombre}</span>
                      <span className="block text-xs text-graphite">
                        {categoria.cantidad_articulos} artículo{categoria.cantidad_articulos === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <EmptyState
                icon={BookOpenIcon}
                titulo="No hay categorías todavía"
                descripcion="Creá categorías para ordenar los artículos de la wiki."
                className="min-h-[130px]"
              />
            )}
          </div>
        </section>

      </div>
    </aside>
  );
}
