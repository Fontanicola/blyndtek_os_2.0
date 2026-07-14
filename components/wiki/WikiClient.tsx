"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Input, Modal } from "@/components/ui";
import { WikiSidebar } from "./WikiSidebar";
import { WikiLista } from "./WikiLista";
import { WikiEditor } from "./WikiEditor";
import { useWiki } from "@/lib/hooks/useWiki";
import type { WikiArticulo } from "@/types/wiki";

type MobileMode = "sidebar" | "lista" | "editor";

export function WikiClient() {
  const searchParams = useSearchParams();
  const initialArticuloId = searchParams.get("articulo_id");

  const {
    categorias,
    articulos,
    loadingCategorias,
    loadingArticulos,
    saving,
    error,
    fetchCategorias,
    fetchArticulos,
    fetchArticulo,
    createCategoria,
    createArticulo,
    updateArticulo,
    deleteArticulo
  } = useWiki();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileMode, setMobileMode] = useState<MobileMode>("sidebar");
  const [selectedArticuloDraft, setSelectedArticuloDraft] = useState<WikiArticulo | null>(null);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "info" | "warning" | "error";
  }>({
    visible: false,
    message: "",
    type: "success"
  });

  const searchFilters = useMemo(() => {
    const buscar = search.trim() || null;

    if (buscar) {
      return { buscar };
    }

    if (selectedCategoryId) {
      return { categoria_id: selectedCategoryId };
    }

    return {};
  }, [search, selectedCategoryId]);

  const selectedArticulo = selectedArticuloDraft;

  const fetchCategoriasRef = useRef(fetchCategorias);

  useEffect(() => {
    fetchCategoriasRef.current = fetchCategorias;
  }, [fetchCategorias]);

  useEffect(() => {
    void fetchCategoriasRef.current();
  }, []);

  useEffect(() => {
    void fetchArticulos(searchFilters);
  }, [fetchArticulos, searchFilters]);

  useEffect(() => {
    if (!initialArticuloId) {
      return;
    }

    let cancelled = false;

    void fetchArticulo(initialArticuloId)
      .then((articulo) => {
        if (cancelled) {
          return;
        }

        setSelectedArticuloDraft(articulo);
        if (articulo.categoria_id) {
          setSelectedCategoryId(articulo.categoria_id);
        }
        setMobileMode("editor");
      })
      .catch(() => {
        if (!cancelled) {
          setToast({
            visible: true,
            message: "No se pudo abrir el artículo solicitado.",
            type: "warning"
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchArticulo, initialArticuloId]);

  useEffect(() => {
    if (selectedArticuloDraft) {
      return;
    }

    if (articulos.length > 0) {
      setSelectedArticuloDraft(articulos[0] ?? null);
      setMobileMode("editor");
    }
  }, [articulos, selectedArticuloDraft]);

  useEffect(() => {
    if (!createCategoryOpen) {
      return;
    }

    setCategoryName("");
  }, [createCategoryOpen]);

  async function handleCreateArticulo() {
    try {
      const created = await createArticulo({
        titulo: "Nuevo artículo",
        categoria_id: selectedCategoryId
      });

      setSelectedArticuloDraft(created);
      setMobileMode("editor");
      setToast({
        visible: true,
        message: "Artículo creado correctamente.",
        type: "success"
      });
    } catch (error) {
      setToast({
        visible: true,
        message: error instanceof Error ? error.message : "No se pudo crear el artículo.",
        type: "error"
      });
    }
  }

  async function handleCreateCategory() {
    if (!categoryName.trim()) {
      return;
    }

    setCreatingCategory(true);

    try {
      const created = await createCategoria({ nombre: categoryName.trim() });
      setCategoryName("");
      setCreateCategoryOpen(false);
      setSelectedCategoryId(created.id);
      setToast({
        visible: true,
        message: "Categoría creada correctamente.",
        type: "success"
      });
    } catch (error) {
      setToast({
        visible: true,
        message: error instanceof Error ? error.message : "No se pudo crear la categoría.",
        type: "error"
      });
    } finally {
      setCreatingCategory(false);
    }
  }

  return (
    <div className="h-full min-h-0 space-y-4">
      {error ? <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="grid h-[calc(100vh-220px)] min-h-[640px] gap-4 lg:grid-cols-[300px_360px_minmax(0,1fr)]">
        <div className={mobileMode === "sidebar" ? "flex h-full min-h-0 flex-col lg:flex" : "hidden lg:flex"}>
          <WikiSidebar
            search={search}
            onSearchChange={setSearch}
            categorias={categorias}
            selectedCategoryId={selectedCategoryId}
            onSelectAll={() => {
              setSearch("");
              setSelectedCategoryId(null);
              setMobileMode("lista");
            }}
            onSelectCategory={(categoryId) => {
              setSearch("");
              setSelectedCategoryId(categoryId);
              setMobileMode("lista");
            }}
            onCreateCategory={() => setCreateCategoryOpen(true)}
          />
        </div>

        <div className={mobileMode === "lista" ? "flex h-full min-h-0 flex-col lg:flex" : "hidden lg:flex"}>
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileMode("sidebar")}>
                ← Categorías
              </Button>
            </div>

            <WikiLista
              articulos={articulos}
              categorias={categorias}
              loading={loadingCategorias || loadingArticulos}
              selectedArticuloId={selectedArticulo?.id ?? null}
              onSelectArticulo={(articulo) => {
                setSelectedArticuloDraft(articulo);
                setMobileMode("editor");
              }}
              onNewArticulo={() => void handleCreateArticulo()}
            />
          </div>
        </div>

        <div className={mobileMode === "editor" ? "flex h-full min-h-0 flex-col lg:flex" : "hidden lg:flex"}>
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileMode("lista")}>
                ← Lista
              </Button>
            </div>

            <WikiEditor
              articulo={selectedArticulo}
              categorias={categorias}
              saving={saving}
              onUpdateArticulo={(id, input) => void updateArticulo(id, input)}
              onDeleteArticulo={async (id) => {
                await deleteArticulo(id);
                setSelectedArticuloDraft((current) => (current?.id === id ? null : current));
                setToast({
                  visible: true,
                  message: "Artículo eliminado.",
                  type: "success"
                });
              }}
            />
          </div>
        </div>
      </div>

      <Modal isOpen={createCategoryOpen} onClose={() => setCreateCategoryOpen(false)} title="Nueva categoría" size="sm">
        <div className="space-y-4">
          <Input label="Nombre" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button variant="ghost" onClick={() => setCreateCategoryOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreateCategory()} loading={creatingCategory}>
              Crear categoría
            </Button>
          </div>
        </div>
      </Modal>

      {toast.visible ? (
        <div className="fixed bottom-6 right-6 z-50">
          <Badge variant={toast.type === "error" ? "danger" : toast.type === "warning" ? "warning" : "success"}>
            {toast.message}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
