"use client";

import { Button, Input } from "@/components/ui";
import { FolderIcon, NotasIcon, SearchIcon, TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { CarpetaNota } from "@/types/notas";
import type { NotaEtiqueta } from "@/types/notasEtiquetas";

type NotasSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  visibleCount: number;
  carpetas: Array<CarpetaNota & { cantidad_notas: number }>;
  availableEtiquetas: NotaEtiqueta[];
  selectedFolderId: string | null;
  selectedTag: string | null;
  activeView: "todas" | "papelera" | "carpeta";
  onSelectAll: () => void;
  onSelectTrash: () => void;
  onSelectFolder: (folderId: string) => void;
  onSelectTag: (tag: string | null) => void;
  onCreateFolder: () => void;
  onCreateNota: () => void;
};

export function NotasSidebar({
  search,
  onSearchChange,
  visibleCount,
  carpetas,
  availableEtiquetas,
  selectedFolderId,
  selectedTag,
  activeView,
  onSelectAll,
  onSelectTrash,
  onSelectFolder,
  onSelectTag,
  onCreateFolder,
  onCreateNota
}: NotasSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex-shrink-0 border-b border-line-soft p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar notas"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            leftIcon={<SearchIcon />}
            className="min-w-0 flex-1"
          />
          <Button size="sm" onClick={onCreateNota}>
            + Nota
          </Button>
        </div>
        <p className="mt-2 text-xs text-graphite">{visibleCount} visibles</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          <div className="space-y-2">
            <button
              type="button"
              onClick={onSelectAll}
              className={cn(
                "flex w-full items-center gap-3 rounded-component px-3 py-2 text-left transition-colors duration-fast ease-fast",
                activeView === "todas" ? "bg-signal-light text-carbon" : "hover:bg-paper"
              )}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-component bg-white text-signal shadow-soft">
                <NotasIcon />
              </span>
              <span className="text-sm font-label">Todas las notas</span>
            </button>
          </div>

          <div className="space-y-2">
            {carpetas.length > 0 ? (
              carpetas.map((carpeta) => {
                const selected = activeView === "carpeta" && carpeta.id === selectedFolderId;

                return (
                  <button
                    key={carpeta.id}
                    type="button"
                    onClick={() => onSelectFolder(carpeta.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-component px-3 py-2 text-left transition-colors duration-fast ease-fast",
                      selected ? "bg-signal-light text-carbon" : "hover:bg-paper"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-component bg-white text-warning shadow-soft">
                        <FolderIcon />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-label">{carpeta.nombre}</span>
                        <span className="block text-xs text-graphite">
                          {carpeta.cantidad_notas} nota{carpeta.cantidad_notas === 1 ? "" : "s"}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-card border border-dashed border-line bg-paper px-3 py-4 text-sm text-graphite">
                No hay carpetas todavía.
              </div>
            )}

            <button
              type="button"
              onClick={onCreateFolder}
              className="flex w-full items-center gap-3 rounded-component px-3 py-2 text-left text-sm font-label text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-component border border-dashed border-line bg-white text-graphite">
                +
              </span>
              <span>+ Nueva carpeta</span>
            </button>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-label uppercase tracking-[0.16em] text-graphite">Etiquetas</h3>
              <Button variant="ghost" size="sm" onClick={() => onSelectTag(null)}>
                Todas
              </Button>
            </div>

            {availableEtiquetas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableEtiquetas.slice(0, 24).map((tag) => {
                  const selected = selectedTag === tag.nombre;

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onSelectTag(selected ? null : tag.nombre)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-xs font-label transition-colors duration-fast ease-fast",
                        selected
                          ? "border-signal bg-signal-light text-signal"
                          : "border-line-soft bg-paper text-graphite hover:bg-white"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          tag.color === "default"
                            ? "bg-graphite"
                            : tag.color === "amarillo"
                              ? "bg-warning"
                              : tag.color === "rosa"
                                ? "bg-[#DB2777]"
                                : tag.color === "celeste"
                                  ? "bg-signal"
                                  : tag.color === "verde"
                                    ? "bg-success"
                                    : "bg-[#7C3AED]"
                        )}
                      />
                      {tag.nombre}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-line bg-paper px-3 py-4 text-sm text-graphite">
                Todavía no hay etiquetas.
              </div>
            )}
          </section>

          <div className="border-t border-line-soft pt-4">
            <button
              type="button"
              onClick={onSelectTrash}
              className={cn(
                "flex w-full items-center gap-3 rounded-component px-3 py-2 text-left transition-colors duration-fast ease-fast",
                activeView === "papelera" ? "bg-signal-light text-carbon" : "hover:bg-paper"
              )}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-component bg-white text-danger shadow-soft">
                <TrashIcon />
              </span>
              <span className="text-sm font-label">Papelera</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
