"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { MenuIcon } from "@/components/icons";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import type { WikiArticulo, WikiCategoria } from "@/types/wiki";

type WikiEditorProps = {
  articulo: WikiArticulo | null;
  categorias: WikiCategoria[];
  saving: boolean;
  onUpdateArticulo: (id: string, input: Partial<Pick<WikiArticulo, "titulo" | "contenido" | "categoria_id" | "orden">>) => void | Promise<void>;
  onDeleteArticulo: (id: string) => void | Promise<void>;
};

export function WikiEditor({
  articulo,
  categorias,
  saving,
  onUpdateArticulo,
  onDeleteArticulo
}: WikiEditorProps) {
  const [titleDraft, setTitleDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!articulo) {
      setTitleDraft("");
      return;
    }

    setTitleDraft(articulo.titulo);
  }, [articulo]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (!articulo) {
    return (
      <Card padding="lg" className="flex h-full min-h-0 items-center justify-center border border-dashed border-line">
        <p className="text-sm text-graphite">Seleccioná un artículo o creá uno nuevo.</p>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex-shrink-0 border-b border-line-soft pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <input
              value={titleDraft}
              onChange={(event) => {
                const next = event.target.value;
                setTitleDraft(next);
                void onUpdateArticulo(articulo.id, { titulo: next });
              }}
              placeholder="Título del artículo"
              className="w-full border-0 bg-transparent p-0 text-xl font-title text-carbon outline-none placeholder:text-graphite focus:ring-0"
            />

            <div className="space-y-1">
              <label className="block text-xs font-label uppercase tracking-[0.16em] text-graphite">Categoría</label>
              <select
                value={articulo.categoria_id ?? ""}
                onChange={(event) => {
                  const next = event.target.value || null;
                  void onUpdateArticulo(articulo.id, { categoria_id: next });
                }}
                className="h-9 w-full max-w-sm rounded-component border border-line bg-white px-3 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              >
                <option value="">Sin categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={saving ? "warning" : "success"}>{saving ? "Guardando..." : "Guardado"}</Badge>

            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-component text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
                title="Más acciones"
              >
                <MenuIcon />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-card border border-line-soft bg-white shadow-modal">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void onDeleteArticulo(articulo.id);
                    }}
                    className="flex w-full items-center px-4 py-3 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
                  >
                    Eliminar artículo
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <RichTextEditor
        content={articulo.contenido}
        onChange={(content) => {
          void onUpdateArticulo(articulo.id, { contenido: content });
        }}
        placeholder="Empezá a escribir..."
        className="pt-0"
      />
    </Card>
  );
}
