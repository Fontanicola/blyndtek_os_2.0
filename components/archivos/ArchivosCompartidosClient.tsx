"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Spinner, Toast } from "@/components/ui";
import {
  FileIcon as FileOutlineGlyph,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon as FolderGlyphIcon,
  ImageIcon
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { formatArchivoSize, getArchivoKind, getSeccionLabel, sortCarpetasArchivos } from "@/lib/archivos";
import { useCarpetas } from "@/lib/hooks/useCarpetas";
import { formatFecha } from "@/lib/utils/formatters";
import type { Archivo, Carpeta, CarpetaContenido } from "@/types/archivos";
import type { Usuario } from "@/types/auth";

type ArchivosCompartidosClientProps = {
  usuario: Pick<Usuario, "id" | "nombre" | "rol">;
};

function FolderIcon() {
  return <FolderGlyphIcon className="h-5 w-5" />;
}

function FileIcon({ archivo }: { archivo: Archivo }) {
  const kind = getArchivoKind(archivo.tipo_mime);

  if (kind === "image") {
    return <ImageIcon className="h-5 w-5" />;
  }

  if (kind === "pdf") {
    return <FileTextIcon className="h-5 w-5" />;
  }

  if (archivo.nombre.toLowerCase().endsWith(".csv") || archivo.nombre.toLowerCase().endsWith(".xls") || archivo.nombre.toLowerCase().endsWith(".xlsx")) {
    return <FileSpreadsheetIcon className="h-5 w-5" />;
  }

  if (kind === "document") {
    return <FileTextIcon className="h-5 w-5" />;
  }

  return <FileOutlineGlyph className="h-5 w-5" />;
}

function formatLabel(folder: Carpeta) {
  return `${getSeccionLabel(folder.seccion)} · ${folder.es_automatica ? "Vinculada" : "Compartida"}`;
}

export function ArchivosCompartidosClient({ usuario }: ArchivosCompartidosClientProps) {
  const { fetchCarpetasCompartidas, fetchCarpeta } = useCarpetas();
  const [sharedFolders, setSharedFolders] = useState<Carpeta[]>([]);
  const [currentFolder, setCurrentFolder] = useState<CarpetaContenido | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "info" | "warning" | "error" }>({
    visible: false,
    message: "",
    type: "info"
  });

  const visibleEntries = useMemo(() => {
    if (!currentFolder) {
      return sharedFolders.map((carpeta) => ({ kind: "folder" as const, carpeta }));
    }

    return sortCarpetasArchivos(currentFolder.subcarpetas, currentFolder.archivos).map((entry) =>
      "seccion" in entry ? { kind: "folder" as const, carpeta: entry } : { kind: "file" as const, archivo: entry }
    );
  }, [currentFolder, sharedFolders]);

  function pushToast(message: string, type: "success" | "info" | "warning" | "error" = "info") {
    setToast({ visible: true, message, type });
  }

  function hideToast() {
    setToast((current) => ({ ...current, visible: false }));
  }

  async function loadSharedFolders() {
    setLoading(true);

    try {
      const folders = await fetchCarpetasCompartidas();
      setSharedFolders(folders);
      return folders;
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudieron cargar las carpetas compartidas.", "error");
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function openFolder(folder: Carpeta) {
    setBusy(true);
    setSelectedFolderId(folder.id);

    try {
      const data = await fetchCarpeta(folder.id);
      setCurrentFolder(data);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo abrir la carpeta.", "error");
    } finally {
      setBusy(false);
    }
  }

  function openFile(archivo: Archivo) {
    window.open(`/api/archivos/${archivo.id}/descargar`, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    void loadSharedFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-card bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-line-soft p-4">
            <div>
              <h2 className="text-lg font-title text-carbon">Carpetas compartidas</h2>
              <p className="text-sm text-graphite">{usuario.nombre}</p>
            </div>
            <Badge variant="default">{sharedFolders.length}</Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center gap-2 rounded-card border border-line-soft bg-paper px-4 py-4 text-sm text-graphite">
                <Spinner size="sm" />
                <span>Cargando carpetas...</span>
              </div>
            ) : sharedFolders.length > 0 ? (
              <div className="space-y-2">
                {sharedFolders.map((folder) => {
                  const active = selectedFolderId === folder.id;

                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => void openFolder(folder)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-component border border-line-soft px-3 py-2 text-left transition-colors duration-fast ease-fast",
                        active ? "bg-signal-light" : "hover:bg-paper"
                      )}
                    >
                      <FolderIcon />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-label text-carbon">{folder.nombre}</span>
                        <span className="block text-xs text-graphite">{formatLabel(folder)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-line-soft bg-paper px-4 py-8 text-sm text-graphite">
                No hay carpetas compartidas todavía.
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden rounded-card bg-white shadow-card">
          <div className="flex min-h-0 flex-wrap items-center justify-between gap-3 border-b border-line-soft p-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm text-graphite">
              <button
                type="button"
                onClick={() => {
                  setCurrentFolder(null);
                  setSelectedFolderId(null);
                }}
                className="rounded-pill bg-paper px-3 py-1.5 font-label text-carbon transition-colors duration-fast ease-fast hover:bg-signal-light"
              >
                Compartidas
              </button>
              {currentFolder ? (
                <>
                  <span className="text-graphite/60">›</span>
                  <span className="max-w-[16rem] truncate rounded-pill bg-paper px-3 py-1.5 font-label text-carbon">
                    {currentFolder.carpeta.nombre}
                  </span>
                </>
              ) : null}
            </div>

            <Button variant="ghost" size="sm" onClick={() => void loadSharedFolders()}>
              Refrescar
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {busy ? (
              <div className="flex items-center gap-2 rounded-card border border-line-soft bg-paper px-4 py-4 text-sm text-graphite">
                <Spinner size="sm" />
                <span>Abriendo carpeta...</span>
              </div>
            ) : currentFolder ? (
              visibleEntries.length > 0 ? (
                <div className="space-y-2">
                  {visibleEntries.map((entry) =>
                    entry.kind === "folder" ? (
                      <button
                        key={entry.carpeta.id}
                        type="button"
                        onClick={() => void openFolder(entry.carpeta)}
                        className="flex w-full items-center gap-3 rounded-card border border-line-soft bg-white px-4 py-3 text-left transition-colors duration-fast ease-fast hover:bg-paper"
                      >
                        <FolderIcon />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-label text-carbon">{entry.carpeta.nombre}</span>
                          <span className="block text-xs text-graphite">{formatLabel(entry.carpeta)}</span>
                        </span>
                      </button>
                    ) : (
                      <button
                        key={entry.archivo.id}
                        type="button"
                        onClick={() => openFile(entry.archivo)}
                        className="flex w-full items-center gap-3 rounded-card border border-line-soft bg-white px-4 py-3 text-left transition-colors duration-fast ease-fast hover:bg-paper"
                      >
                        <FileIcon archivo={entry.archivo} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-label text-carbon">{entry.archivo.nombre}</span>
                          <span className="block text-xs text-graphite">
                            {formatArchivoSize(entry.archivo.tamanio_bytes)} · {formatFecha(entry.archivo.created_at)}
                          </span>
                        </span>
                      </button>
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-card border border-dashed border-line-soft bg-paper px-4 py-10 text-center text-sm text-graphite">
                  Carpeta vacía.
                </div>
              )
            ) : (
              <div className="rounded-card border border-dashed border-line-soft bg-paper px-4 py-10 text-center text-sm text-graphite">
                Elegí una carpeta compartida para ver su contenido.
              </div>
            )}
          </div>
        </main>
      </div>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </div>
  );
}
