"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Modal, Toast } from "@/components/ui";
import { NotasSidebar } from "./NotasSidebar";
import { NotasLista } from "./NotasLista";
import { NotaEditor } from "./NotaEditor";
import { VincularEntidadSelect, type NotaVinculoValue } from "./VincularEntidadSelect";
import { useNotas } from "@/lib/hooks/useNotas";
import { useCarpetasNotas } from "@/lib/hooks/useCarpetasNotas";
import { useClientes } from "@/lib/hooks/useClientes";
import { useProyectos } from "@/lib/hooks/useProyectos";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInboundLeads } from "@/lib/hooks/useInboundLeads";
import { getLinkedNotaEntity, sortNotas } from "@/lib/notas";
import type { Nota } from "@/types/notas";

type NotasView = "todas" | "papelera" | "carpeta";
type MobileMode = "sidebar" | "lista" | "editor";
type LinkedEntityInfo = {
  label: string;
  href: string;
};

function buildLinkedEntityInfo(
  nota: Nota,
  clientes: Array<{ id: string; empresa: string }>,
  proyectos: Array<{ id: string; nombre: string; clienteNombre?: string | null }>,
  leads: Array<{ id: string; empresa: string; canal?: string | null; etapa?: string | null }>
): LinkedEntityInfo | null {
  const linked = getLinkedNotaEntity(nota);

  if (!linked) {
    return null;
  }

  if (linked.tipo === "cliente") {
    const cliente = clientes.find((item) => item.id === linked.id);
    return {
      label: cliente ? cliente.empresa : "Cliente vinculado",
      href: `/clientes?cliente_id=${linked.id}`
    };
  }

  if (linked.tipo === "proyecto") {
    const proyecto = proyectos.find((item) => item.id === linked.id);
    return {
      label: proyecto ? (proyecto.clienteNombre ? `${proyecto.nombre} · ${proyecto.clienteNombre}` : proyecto.nombre) : "Proyecto vinculado",
      href: `/proyectos?project_id=${linked.id}`
    };
  }

  const lead = leads.find((item) => item.id === linked.id);
  return {
    label: lead ? lead.empresa : "Lead vinculado",
    href: `/inbound?lead_id=${linked.id}`
  };
}

export function NotasClient() {
  const searchParams = useSearchParams();
  const initialNotaId = searchParams.get("nota_id");

  const {
    notas,
    etiquetas,
    loading: notasLoading,
    saving: notasSaving,
    error: notasError,
    fetchNotas,
    fetchNota,
    createNota,
    createEtiqueta,
    updateEtiquetaColor,
    updateNota,
    updateNotaInmediata,
    toggleFijada,
    eliminarNota,
    restaurarNota,
    eliminarDefinitivo
  } = useNotas();
  const carpetasHook = useCarpetasNotas();
  const clientesHook = useClientes();
  const proyectosHook = useProyectos();
  const leadsOutboundHook = useLeads();
  const leadsInboundHook = useInboundLeads();

  const [activeView, setActiveView] = useState<NotasView>("todas");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileMode, setMobileMode] = useState<MobileMode>("sidebar");
  const [selectedNotaDraft, setSelectedNotaDraft] = useState<Nota | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFolderId, setNewFolderId] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<NotaVinculoValue>({ tipo: "ninguna", id: null });
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingNota, setCreatingNota] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "info" | "warning" | "error";
  }>({
    visible: false,
    message: "",
    type: "success"
  });

  const allLeads = useMemo(
    () => [...leadsOutboundHook.leads, ...leadsInboundHook.leads],
    [leadsInboundHook.leads, leadsOutboundHook.leads]
  );

  const clienteOptions = useMemo(
    () => clientesHook.clientes.map((cliente) => ({ id: cliente.id, empresa: cliente.empresa })),
    [clientesHook.clientes]
  );

  const proyectoOptions = useMemo(
    () =>
      proyectosHook.proyectos.map((proyecto) => ({
        id: proyecto.id,
        nombre: proyecto.nombre,
        clienteNombre:
          clientesHook.clientes.find((cliente) => cliente.id === proyecto.cliente_id)?.empresa ?? null
      })),
    [clientesHook.clientes, proyectosHook.proyectos]
  );

  const searchFilters = useMemo(() => {
    const buscar = search.trim() || null;

    if (activeView === "papelera") {
      return { papelera: true, buscar, tag: selectedTag };
    }

    if (activeView === "carpeta" && selectedFolderId) {
      return { carpeta_id: selectedFolderId, papelera: false, buscar, tag: selectedTag };
    }

    return { papelera: false, buscar, tag: selectedTag };
  }, [activeView, search, selectedFolderId, selectedTag]);

  const selectedNota = selectedNotaDraft;

  const selectedNotaInfo = useMemo(() => {
    if (!selectedNota) {
      return null;
    }

    return buildLinkedEntityInfo(selectedNota, clienteOptions, proyectoOptions, allLeads);
  }, [allLeads, clienteOptions, proyectoOptions, selectedNota]);

  useEffect(() => {
    void fetchNotas(searchFilters);
  }, [fetchNotas, searchFilters]);

  useEffect(() => {
    if (!initialNotaId) {
      return;
    }

    let cancelled = false;

    void fetchNota(initialNotaId)
      .then((nota) => {
        if (cancelled) {
          return;
        }

        setSelectedNotaDraft(nota);
        setActiveView(nota.en_papelera ? "papelera" : nota.carpeta_id ? "carpeta" : "todas");
        if (nota.carpeta_id) {
          setSelectedFolderId(nota.carpeta_id);
        }
        setMobileMode("editor");
      })
      .catch(() => {
        if (!cancelled) {
          setToast({
            visible: true,
            message: "No se pudo abrir la nota solicitada.",
            type: "warning"
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchNota, initialNotaId]);

  useEffect(() => {
    if (selectedNotaDraft) {
      return;
    }

    if (notas.length > 0) {
      setSelectedNotaDraft(notas[0] ?? null);
      setMobileMode("editor");
    }
  }, [notas, selectedNotaDraft]);

  useEffect(() => {
    setNewFolderId(activeView === "carpeta" ? selectedFolderId : null);
  }, [activeView, selectedFolderId]);

  useEffect(() => {
    if (!createOpen) {
      return;
    }

    setNewTitle("");
    setNewFolderId(activeView === "carpeta" ? selectedFolderId : null);
    setNewLink({ tipo: "ninguna", id: null });
  }, [activeView, createOpen, selectedFolderId]);

  useEffect(() => {
    if (!folderOpen) {
      return;
    }

    setFolderName("");
  }, [folderOpen]);

  async function handleCreateNota() {
    if (newLink.tipo !== "ninguna" && !newLink.id) {
      setToast({
        visible: true,
        message: "Seleccioná una entidad para el vínculo o dejalo sin vínculo.",
        type: "warning"
      });
      return;
    }

    const linkPayload =
      newLink.tipo === "ninguna"
        ? { cliente_id: null, proyecto_id: null, lead_id: null }
        : newLink.tipo === "cliente"
          ? { cliente_id: newLink.id, proyecto_id: null, lead_id: null }
          : newLink.tipo === "proyecto"
            ? { cliente_id: null, proyecto_id: newLink.id, lead_id: null }
            : { cliente_id: null, proyecto_id: null, lead_id: newLink.id };

    setCreatingNota(true);

    try {
      const created = await createNota({
        titulo: newTitle.trim() || "Nueva nota",
        carpeta_id: newFolderId,
        ...linkPayload
      });

      setCreateOpen(false);
      setActiveView(newFolderId ? "carpeta" : "todas");
      if (newFolderId) {
        setSelectedFolderId(newFolderId);
      }
      setSelectedNotaDraft(created);
      setMobileMode("editor");
      setToast({
        visible: true,
        message: "Nota creada correctamente.",
        type: "success"
      });
    } catch (error) {
      setToast({
        visible: true,
        message: error instanceof Error ? error.message : "No se pudo crear la nota.",
        type: "error"
      });
    } finally {
      setCreatingNota(false);
    }
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) {
      return;
    }

    setCreatingFolder(true);

    try {
      await carpetasHook.createCarpeta({ nombre: folderName.trim() });
      setFolderName("");
      setFolderOpen(false);
      setToast({
        visible: true,
        message: "Carpeta creada.",
        type: "success"
      });
    } catch (error) {
      setToast({
        visible: true,
        message: error instanceof Error ? error.message : "No se pudo crear la carpeta.",
        type: "error"
      });
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleSaveDraft(partial: Partial<Nota>) {
    if (!selectedNotaDraft) {
      return;
    }

    setSelectedNotaDraft((current) => (current ? { ...current, ...partial } : current));
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {notasError || carpetasHook.error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {notasError ?? carpetasHook.error}
        </div>
      ) : null}

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[280px_360px_minmax(0,1fr)]">
        <div className={mobileMode === "sidebar" ? "flex h-full min-h-0 min-w-0 flex-col lg:flex" : "hidden lg:flex"}>
          <NotasSidebar
            search={search}
            onSearchChange={setSearch}
            visibleCount={notas.length}
            carpetas={carpetasHook.carpetas}
            selectedFolderId={selectedFolderId}
            selectedTag={selectedTag}
            activeView={activeView}
            availableEtiquetas={etiquetas}
            onSelectAll={() => {
              setActiveView("todas");
              setSelectedFolderId(null);
              setSelectedTag(null);
              setMobileMode("lista");
            }}
            onSelectTrash={() => {
              setActiveView("papelera");
              setSelectedFolderId(null);
              setSelectedTag(null);
              setMobileMode("lista");
            }}
            onSelectFolder={(folderId) => {
              setActiveView("carpeta");
              setSelectedFolderId(folderId);
              setSelectedTag(null);
              setMobileMode("lista");
            }}
            onSelectTag={(tag) => {
              setActiveView("todas");
              setSelectedFolderId(null);
              setSelectedTag(tag);
              setMobileMode("lista");
            }}
            onCreateFolder={() => setFolderOpen(true)}
            onCreateNota={() => setCreateOpen(true)}
          />
        </div>

        <div className={mobileMode === "lista" ? "flex h-full min-h-0 min-w-0 flex-col lg:flex" : "hidden lg:flex"}>
          <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
            <div className="lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileMode("sidebar")}>
                ← Carpetas
              </Button>
            </div>

            <NotasLista
              notas={sortNotas(notas)}
            carpetas={carpetasHook.carpetas}
            loading={notasLoading}
            selectedNotaId={selectedNotaDraft?.id ?? null}
            etiquetas={etiquetas}
            onSelectNota={(nota) => {
              setSelectedNotaDraft(nota);
              setMobileMode("editor");
              }}
              onNewNota={() => setCreateOpen(true)}
            />
          </div>
        </div>

        <div className={mobileMode === "editor" ? "flex h-full min-h-0 min-w-0 flex-col lg:flex" : "hidden lg:flex"}>
          <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
            <div className="lg:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileMode("lista")}>
                ← Lista
              </Button>
            </div>

            <NotaEditor
              nota={selectedNota}
              carpetas={carpetasHook.carpetas}
              clientes={clienteOptions}
              proyectos={proyectoOptions}
              leads={allLeads}
              availableEtiquetas={etiquetas}
              linkedEntityLabel={selectedNotaInfo?.label ?? null}
              linkedEntityHref={selectedNotaInfo?.href ?? null}
              saving={notasSaving}
              onUpdateNota={(id, input) => void updateNota(id, input)}
              onUpdateNotaInmediata={(id, input) => void updateNotaInmediata(id, input)}
              onToggleFijada={(id) => void toggleFijada(id)}
              onMoverPapelera={(id) => void eliminarNota(id)}
              onRestaurar={(id) => void restaurarNota(id)}
              onEliminarDefinitivo={(id) => void eliminarDefinitivo(id)}
              onDraftChange={handleSaveDraft}
              onCreateEtiqueta={createEtiqueta}
              onUpdateEtiquetaColor={updateEtiquetaColor}
              imageUploadUrl="/api/notas/imagenes/upload"
            />
          </div>
        </div>
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nueva nota" size="md">
        <div className="space-y-4">
          <Input
            label="Título"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Nueva nota"
          />

          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Carpeta</label>
            <select
              value={newFolderId ?? ""}
              onChange={(event) => setNewFolderId(event.target.value || null)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="">Sin carpeta</option>
              {carpetasHook.carpetas.map((carpeta) => (
                <option key={carpeta.id} value={carpeta.id}>
                  {carpeta.nombre}
                </option>
              ))}
            </select>
          </div>

          <VincularEntidadSelect
            value={newLink}
            onChange={setNewLink}
            clientes={clienteOptions}
            proyectos={proyectoOptions}
            leads={allLeads}
          />

          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                void handleCreateNota();
              }}
              loading={creatingNota}
            >
              Crear nota
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={folderOpen} onClose={() => setFolderOpen(false)} title="Nueva carpeta" size="sm">
        <div className="space-y-4">
          <Input label="Nombre" value={folderName} onChange={(event) => setFolderName(event.target.value)} />
          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button variant="ghost" onClick={() => setFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreateFolder()} loading={creatingFolder}>
              Crear carpeta
            </Button>
          </div>
        </div>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </div>
  );
}
