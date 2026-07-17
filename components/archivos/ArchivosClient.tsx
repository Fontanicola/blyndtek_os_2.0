"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Spinner,
  Toast
} from "@/components/ui";
import {
  ClientesIcon,
  FinanzasIcon,
  OutboundIcon,
  ProyectosIcon,
  WikiIcon
} from "@/components/icons";
import {
  ChevronRightIcon,
  FileIcon as FileOutlineIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  LinkIcon,
  MoreVerticalIcon
} from "@/components/ui/icons";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useArchivos } from "@/lib/hooks/useArchivos";
import { useCarpetas } from "@/lib/hooks/useCarpetas";
import {
  formatArchivoSize,
  getArchivoKind,
  getSeccionLabel,
  isImageMime,
  sortCarpetasArchivos
} from "@/lib/archivos";
import { cn } from "@/lib/cn";
import { formatFecha } from "@/lib/utils/formatters";
import type { Archivo, Carpeta, CarpetaContenido, CarpetaConConteos, Seccion } from "@/types/archivos";
import type { Usuario } from "@/types/auth";

type ArchivosArea = Seccion | "papelera";
type ViewMode = "icons" | "list" | "gallery";
type EntryKind = "folder" | "file";

type Entry =
  | {
      kind: "folder";
      key: string;
      carpeta: CarpetaConConteos | Carpeta;
    }
  | {
      kind: "file";
      key: string;
      archivo: Archivo;
    };

type DragEntry = Entry;

type DropIntent = {
  targetKey: string;
  position: "before" | "after" | "inside";
} | null;

type SectionOption = {
  key: Seccion;
  label: string;
  icon: JSX.Element;
};

const sections: SectionOption[] = [
  { key: "clientes", label: "Clientes", icon: <ClientesIcon /> },
  { key: "proyectos", label: "Proyectos", icon: <ProyectosIcon /> },
  { key: "comercial", label: "Comercial", icon: <OutboundIcon /> },
  { key: "finanzas", label: "Finanzas", icon: <FinanzasIcon /> },
  { key: "general", label: "General", icon: <WikiIcon /> }
];

const initialRoots: Record<Seccion, CarpetaConConteos[]> = {
  clientes: [],
  proyectos: [],
  comercial: [],
  finanzas: [],
  general: []
};

function formatSectionName(value: ArchivosArea) {
  if (value === "papelera") {
    return "Papelera";
  }

  return getSeccionLabel(value);
}

function formatItemSubtitle(entry: Entry) {
  if (entry.kind === "folder") {
    if (hasConteos(entry.carpeta)) {
      return `${entry.carpeta.subcarpetas_count} subcarpeta${entry.carpeta.subcarpetas_count === 1 ? "" : "s"} · ${entry.carpeta.archivos_count} archivo${entry.carpeta.archivos_count === 1 ? "" : "s"}`;
    }

    return "Carpeta";
  }

  const size = formatArchivoSize(entry.archivo.tamanio_bytes);
  const modified = formatFecha(entry.archivo.created_at);
  return `${size} · ${modified}`;
}

function getEntryName(entry: Entry) {
  return entry.kind === "folder" ? entry.carpeta.nombre : entry.archivo.nombre;
}

function getEntryKey(kind: EntryKind, id: string) {
  return `${kind}:${id}`;
}

function ensureArray<T>(value: T[] | undefined | null) {
  return value ?? [];
}

function clampTextStyle(lines = 2) {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical" as const,
    WebkitLineClamp: lines,
    overflow: "hidden"
  };
}

function SectionIcon({ option }: { option: SectionOption }) {
  return <span className="text-carbon">{option.icon}</span>;
}

function FileGlyph({ archivo }: { archivo: Archivo }) {
  const kind = getArchivoKind(archivo.tipo_mime);
  const isSpreadsheet =
    archivo.tipo_mime?.includes("sheet") ||
    archivo.tipo_mime?.includes("spreadsheet") ||
    archivo.nombre.toLowerCase().endsWith(".csv") ||
    archivo.nombre.toLowerCase().endsWith(".xls") ||
    archivo.nombre.toLowerCase().endsWith(".xlsx");
  const isDocument =
    archivo.tipo_mime?.includes("word") ||
    archivo.tipo_mime?.includes("document") ||
    archivo.nombre.toLowerCase().endsWith(".doc") ||
    archivo.nombre.toLowerCase().endsWith(".docx");

  if (kind === "image") {
    return <ImageIcon className="h-6 w-6" />;
  }

  if (isSpreadsheet) {
    return <FileSpreadsheetIcon className="h-6 w-6" />;
  }

  if (kind === "pdf") {
    return <FileTextIcon className="h-6 w-6" />;
  }

  if (kind === "document" || isDocument) {
    return <FileTextIcon className="h-6 w-6" />;
  }

  return <FileOutlineIcon className="h-6 w-6" />;
}

function FolderGlyph() {
  return <FolderIcon className="h-6 w-6" />;
}

function LinkGlyph() {
  return <LinkIcon className="h-3 w-3" />;
}

function ActionDots() {
  return <MoreVerticalIcon className="h-4 w-4" />;
}

function getEntryTone(entry: Entry) {
  if (entry.kind === "folder") {
    return "bg-warning-light text-warning";
  }

  if (isImageMime(entry.archivo.tipo_mime)) {
    return "bg-white text-carbon";
  }

  const kind = getArchivoKind(entry.archivo.tipo_mime);
  const isSpreadsheet =
    entry.archivo.tipo_mime?.includes("sheet") ||
    entry.archivo.tipo_mime?.includes("spreadsheet") ||
    entry.archivo.nombre.toLowerCase().endsWith(".csv") ||
    entry.archivo.nombre.toLowerCase().endsWith(".xls") ||
    entry.archivo.nombre.toLowerCase().endsWith(".xlsx");
  const isDocument =
    entry.archivo.tipo_mime?.includes("word") ||
    entry.archivo.tipo_mime?.includes("document") ||
    entry.archivo.nombre.toLowerCase().endsWith(".doc") ||
    entry.archivo.nombre.toLowerCase().endsWith(".docx");

  if (isSpreadsheet) {
    return "bg-success-light text-success";
  }

  if (kind === "pdf") {
    return "bg-danger-light text-danger";
  }

  if (kind === "document" || isDocument) {
    return "bg-signal-light text-signal";
  }

  return "bg-paper text-graphite";
}

function sortSidebarFolders(folderList: CarpetaConConteos[]) {
  return [...folderList].sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre));
}

function hasConteos(folder: CarpetaConConteos | Carpeta): folder is CarpetaConConteos {
  return "subcarpetas_count" in folder;
}

function usePersistentViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>("icons");

  useEffect(() => {
    const saved = window.localStorage.getItem("archivos-view-mode");

    if (saved === "icons" || saved === "list" || saved === "gallery") {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("archivos-view-mode", viewMode);
  }, [viewMode]);

  return [viewMode, setViewMode] as const;
}

async function fetchSectionRoots(section: Seccion) {
  const response = await fetch(`/api/carpetas?seccion=${section}`);
  const payload = (await response.json()) as { data?: CarpetaConConteos[]; error?: string };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudieron cargar las carpetas.");
  }

  return payload.data;
}

async function fetchCarpetaContenido(id: string) {
  const response = await fetch(`/api/carpetas/${id}`);
  const payload = (await response.json()) as { data?: CarpetaContenido; error?: string };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudo cargar la carpeta.");
  }

  return payload.data;
}

function EntryMenu({
  open,
  onToggle,
  onRename,
  onMove,
  onShare,
  onDelete,
  onDownload,
  hideRename = false,
  hideDelete = false,
  hideShare = false
}: {
  open: boolean;
  onToggle: () => void;
  onRename: () => void;
  onMove: () => void;
  onShare?: () => void;
  onDelete: () => void;
  onDownload?: () => void;
  hideRename?: boolean;
  hideDelete?: boolean;
  hideShare?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [alignLeft, setAlignLeft] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updateAlignment = () => {
      const rect = triggerRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setAlignLeft(rect.right + 208 > window.innerWidth);
    };

    updateAlignment();
    window.addEventListener("resize", updateAlignment);

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        onToggle();
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => {
      window.removeEventListener("resize", updateAlignment);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [onToggle, open]);

  return (
    <div ref={rootRef} className="absolute right-2 top-2 z-20" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-component text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-carbon"
      >
        <ActionDots />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-9 w-48 overflow-hidden rounded-card border border-line-soft bg-white shadow-modal",
            alignLeft ? "right-0" : "left-0"
          )}
        >
          {!hideRename ? (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onRename();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
            >
              Renombrar
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onToggle();
              onMove();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
          >
            Mover
          </button>
          {onShare && !hideShare ? (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onShare();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
            >
              Compartir con usuario
            </button>
          ) : null}
          {onDownload ? (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onDownload();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
            >
              Descargar
            </button>
          ) : null}
          {!hideDelete ? (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onDelete();
              }}
              className="block w-full px-3 py-2 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
            >
              Eliminar
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FolderPickerModal({
  isOpen,
  onClose,
  section,
  onPick,
  title
}: {
  isOpen: boolean;
  onClose: () => void;
  section: Seccion;
  onPick: (folderId: string | null) => void;
  title: string;
}) {
  const { carpetas, carpeta, loading, fetchCarpetas, fetchCarpeta } = useCarpetas();
  const [trail, setTrail] = useState<Carpeta[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTrail([]);
    setSelectedFolderId(null);
    void fetchCarpetas(section, null);
  }, [fetchCarpetas, isOpen, section]);

  useEffect(() => {
    if (!isOpen || trail.length === 0) {
      return;
    }

    const current = trail[trail.length - 1];
    if (!current) {
      return;
    }

    void fetchCarpeta(current.id);
  }, [fetchCarpeta, isOpen, trail]);

  const currentFolders: Array<CarpetaConConteos | Carpeta> = trail.length > 0 ? carpeta?.subcarpetas ?? [] : carpetas;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setTrail([]);
                setSelectedFolderId(null);
                void fetchCarpetas(section, null);
              }}
              className="rounded-pill bg-paper px-3 py-1.5 font-label text-carbon transition-colors duration-fast ease-fast hover:bg-signal-light"
            >
              {getSeccionLabel(section)}
            </button>
            {trail.map((folder, index) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  const nextTrail = trail.slice(0, index + 1);
                  setTrail(nextTrail);
                  setSelectedFolderId(folder.id);
                }}
                className="rounded-pill bg-paper px-3 py-1.5 font-label text-carbon transition-colors duration-fast ease-fast hover:bg-signal-light"
              >
                {folder.nombre}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedFolderId(null);
              onPick(null);
            }}
          >
            Usar raíz
          </Button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto rounded-card border border-line-soft bg-paper p-3">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-graphite">
              <Spinner size="sm" />
              <span>Cargando carpetas...</span>
            </div>
          ) : currentFolders.length > 0 ? (
            <div className="space-y-2">
              {currentFolders
                .slice()
                .sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre))
                .map((folder) => {
                  const selected = selectedFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-component border border-line-soft bg-white px-3 py-2",
                        selected && "bg-signal-light"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setTrail((current) => [...current, folder as Carpeta]);
                          setSelectedFolderId(folder.id);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <FolderGlyph />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-label text-carbon">{folder.nombre}</span>
                          {hasConteos(folder) ? (
                            <span className="block text-xs text-graphite">
                              {folder.subcarpetas_count} subcarpeta{folder.subcarpetas_count === 1 ? "" : "s"} ·{" "}
                              {folder.archivos_count} archivo{folder.archivos_count === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </span>
                      </button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          onPick(folder.id);
                        }}
                      >
                        Elegir
                      </Button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-line bg-white px-4 py-6 text-sm text-graphite">
              No hay carpetas en esta ubicación.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onPick(selectedFolderId);
            }}
          >
            Seleccionar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ArchivosClient() {
  const carpetaHook = useCarpetas();
  const {
    papelera,
    fetchPapelera,
    subirArchivo,
    renombrarArchivo,
    eliminarArchivo,
    moverArchivo
  } = useArchivos();
  const [viewMode, setViewMode] = usePersistentViewMode();
  const [selectedArea, setSelectedArea] = useState<ArchivosArea>("clientes");
  const [expandedSections, setExpandedSections] = useState<Record<Seccion, boolean>>({
    clientes: true,
    proyectos: false,
    comercial: false,
    finanzas: false,
    general: false
  });
  const [sectionRoots, setSectionRoots] = useState<Record<Seccion, CarpetaConConteos[]>>(initialRoots);
  const [currentContent, setCurrentContent] = useState<CarpetaContenido | null>(null);
  const [currentFolderTrail, setCurrentFolderTrail] = useState<Carpeta[]>([]);
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [editingEntryKey, setEditingEntryKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [draggingEntry, setDraggingEntry] = useState<DragEntry | null>(null);
  const [dropIntent, setDropIntent] = useState<DropIntent>(null);
  const [moveTarget, setMoveTarget] = useState<{
    kind: EntryKind;
    id: string;
    section: Seccion;
    title: string;
  } | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [shareUsers, setShareUsers] = useState<Array<Pick<Usuario, "id" | "nombre" | "rol" | "foto_url">>>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: "success" | "info" | "warning" | "error" }>({
    visible: false,
    message: "",
    type: "info"
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedSection = selectedArea === "papelera" ? "clientes" : selectedArea;

  const sectionItems = sections;
  const currentRootFolders = useMemo(() => sectionRoots[selectedSection] ?? [], [sectionRoots, selectedSection]);
  const currentFolders = useMemo(
    () => (currentFolderTrail.length > 0 ? ensureArray(currentContent?.subcarpetas) : currentRootFolders),
    [currentContent, currentFolderTrail.length, currentRootFolders]
  );
  const currentFiles = useMemo(
    () => (currentFolderTrail.length > 0 ? ensureArray(currentContent?.archivos) : []),
    [currentContent, currentFolderTrail.length]
  );
  const isTrash = selectedArea === "papelera";

  const visibleEntries = useMemo(() => {
    if (isTrash) {
      return papelera.map((archivo) => ({ kind: "file" as const, key: getEntryKey("file", archivo.id), archivo }));
    }

    const merged = sortCarpetasArchivos(currentFolders, currentFiles);

    return merged.map((item) =>
      "seccion" in item
        ? { kind: "folder" as const, key: getEntryKey("folder", item.id), carpeta: item }
        : { kind: "file" as const, key: getEntryKey("file", item.id), archivo: item }
    );
  }, [currentFiles, currentFolders, isTrash, papelera]);

  const breadcrumbs = useMemo(() => {
    if (isTrash) {
      return [{ key: "papelera", label: "Papelera", onClick: () => setSelectedArea("papelera") }];
    }

    const items = [
      {
        key: `section:${selectedArea}`,
        label: formatSectionName(selectedArea),
        onClick: () => {
          setSelectedArea(selectedSection);
          setCurrentFolderTrail([]);
          setCurrentContent(null);
        }
      }
    ];

    currentFolderTrail.forEach((folder, index) => {
      items.push({
        key: folder.id,
        label: folder.nombre,
        onClick: () => {
          const nextTrail = currentFolderTrail.slice(0, index + 1);
          setCurrentFolderTrail(nextTrail);
        }
      });
    });

    return items;
  }, [currentFolderTrail, isTrash, selectedArea, selectedSection]);

  function pushToast(message: string, type: "success" | "info" | "warning" | "error" = "info") {
    setToast({ visible: true, message, type });
  }

  function hideToast() {
    setToast((current) => ({ ...current, visible: false }));
  }

  async function refreshRoots(section: Seccion) {
    const roots = await fetchSectionRoots(section);
    setSectionRoots((current) => ({ ...current, [section]: roots }));
    return roots;
  }

  async function refreshCurrentContent() {
    if (currentFolderTrail.length > 0) {
      const folder = currentFolderTrail[currentFolderTrail.length - 1];
      if (folder) {
        const data = await fetchCarpetaContenido(folder.id);
        setCurrentContent(data);
      }
      return;
    }

    await refreshRoots(selectedSection);
  }

  function getCurrentEntryList() {
    return visibleEntries;
  }

  function buildReorderedEntries(dragged: DragEntry, targetKey: string, position: "before" | "after" | "inside") {
    if (position === "inside") {
      return null;
    }

    const entries = getCurrentEntryList();
    const targetIndex = entries.findIndex((entry) => entry.key === targetKey);
    const draggedIndex = entries.findIndex((entry) => entry.key === dragged.key);

    if (targetIndex < 0 || draggedIndex < 0 || targetIndex === draggedIndex) {
      return null;
    }

    const next = entries.filter((entry) => entry.key !== dragged.key);
    const targetEntry = next.find((entry) => entry.key === targetKey);

    if (!targetEntry) {
      return null;
    }

    const insertIndex = next.findIndex((entry) => entry.key === targetKey) + (position === "after" ? 1 : 0);
    next.splice(insertIndex, 0, dragged);
    return next.map((entry) => ({ kind: entry.kind, id: entry.kind === "folder" ? entry.carpeta.id : entry.archivo.id }));
  }

  async function persistReorder(entries: Array<{ kind: EntryKind; id: string }>) {
    const response = await fetch("/api/archivos/reorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ entries })
    });
    const payload = (await response.json()) as { success?: boolean; error?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? "No se pudo reordenar.");
    }
  }

  async function openFolder(folder: CarpetaConConteos | Carpeta, mode: "root" | "child") {
    setSelectedArea(folder.seccion);
    setSelectedEntryKey(getEntryKey("folder", folder.id));
    setOpenMenuKey(null);

    if (mode === "root") {
      setCurrentFolderTrail([folder as Carpeta]);
      const data = await fetchCarpetaContenido(folder.id);
      setCurrentContent(data);
      return;
    }

    setCurrentFolderTrail((current) => {
      const nextTrail = [...current, folder as Carpeta];
      void (async () => {
        const data = await fetchCarpetaContenido(folder.id);
        setCurrentContent(data);
      })();
      return nextTrail;
    });
  }

  async function goToSection(section: Seccion) {
    setSelectedArea(section);
    setSelectedEntryKey(null);
    setOpenMenuKey(null);
    setCurrentFolderTrail([]);
    setCurrentContent(null);
    await refreshRoots(section);
  }

  async function goToTrash() {
    setSelectedArea("papelera");
    setSelectedEntryKey(null);
    setOpenMenuKey(null);
    setCurrentFolderTrail([]);
    setCurrentContent(null);
    await fetchPapelera();
  }

  async function handleCreateFolder() {
    if (!createFolderName.trim() || isTrash) {
      return;
    }

    try {
      await carpetaHook.createCarpeta({
        nombre: createFolderName.trim(),
        seccion: selectedSection,
        carpeta_padre_id: currentFolderTrail.at(-1)?.id ?? null
      });
      setCreateFolderName("");
      setCreateFolderOpen(false);
      await refreshRoots(selectedSection);
      await refreshCurrentContent();
      pushToast("Carpeta creada correctamente.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo crear la carpeta.", "error");
    }
  }

  async function handleRenameEntry(entry: Entry) {
    const nextName = editingName.trim();

    if (!nextName) {
      pushToast("El nombre no puede quedar vacío.", "warning");
      return;
    }

    try {
      if (entry.kind === "folder") {
        await carpetaHook.renombrarCarpeta(entry.carpeta.id, { nombre: nextName });
      } else {
        await renombrarArchivo(entry.archivo.id, { nombre: nextName });
      }

      setEditingEntryKey(null);
      setEditingName("");
      await refreshRoots(selectedSection);
      await refreshCurrentContent();
      if (isTrash) {
        await fetchPapelera();
      }
      pushToast("Elemento renombrado.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo renombrar.", "error");
    }
  }

  async function handleDeleteEntry(entry: Entry) {
    const firstConfirm = window.confirm(
      entry.kind === "folder" ? `¿Eliminar la carpeta "${entry.carpeta.nombre}"?` : `¿Enviar "${entry.archivo.nombre}" a la papelera?`
    );

    if (!firstConfirm) {
      return;
    }

    try {
      if (entry.kind === "folder") {
        await carpetaHook.eliminarCarpeta(entry.carpeta.id);
      } else {
        await eliminarArchivo(entry.archivo.id);
      }

      await refreshRoots(selectedSection);
      await refreshCurrentContent();
      if (isTrash) {
        await fetchPapelera();
      }
      pushToast(entry.kind === "folder" ? "Carpeta eliminada." : "Archivo enviado a papelera.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo eliminar.", "error");
    }
  }

  function handleOpenArchivo(archivo: Archivo) {
    window.open(`/api/archivos/${archivo.id}/descargar`, "_blank", "noopener,noreferrer");
  }

  async function handleDownload(archivo: Archivo) {
    window.open(`/api/archivos/${archivo.id}/descargar?descargar=true`, "_blank", "noopener,noreferrer");
  }

  async function handleShareFolder(usuarioId: string) {
    if (!shareTarget) {
      return;
    }

    try {
      setShareLoading(true);
      const response = await fetch(`/api/carpetas/${shareTarget.id}/compartir`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ usuario_id: usuarioId })
      });
      const payload = (await response.json()) as { data?: unknown; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo compartir la carpeta.");
      }

      pushToast("Carpeta compartida correctamente.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo compartir la carpeta.", "error");
    } finally {
      setShareLoading(false);
    }
  }

  async function handleMoveConfirmed(targetFolderId: string | null) {
    if (!moveTarget) {
      return;
    }

    try {
      if (moveTarget.kind === "folder") {
        await carpetaHook.moverCarpeta(moveTarget.id, { nueva_carpeta_padre_id: targetFolderId });
      } else {
        await moverArchivo(moveTarget.id, { nueva_carpeta_id: targetFolderId });
      }

      setMoveTarget(null);
      await refreshRoots(selectedSection);
      await refreshCurrentContent();
      if (isTrash) {
        await fetchPapelera();
      }
      pushToast("Elemento movido correctamente.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo mover.", "error");
    }
  }

  function handleDragStart(entry: Entry) {
    setDraggingEntry(entry);
  }

  function handleDragEnd() {
    setDraggingEntry(null);
    setDropIntent(null);
    setIsDragging(false);
  }

  function handleDragOverEntry(event: DragEvent<HTMLElement>, entry: Entry) {
    if (!draggingEntry || draggingEntry.key === entry.key) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;

    if (entry.kind === "folder" && ratio > 0.25 && ratio < 0.75) {
      setDropIntent({ targetKey: entry.key, position: "inside" });
      return;
    }

    setDropIntent({ targetKey: entry.key, position: ratio < 0.5 ? "before" : "after" });
  }

  async function handleDropEntry(entry: Entry) {
    if (!draggingEntry || draggingEntry.key === entry.key) {
      return;
    }

    const draggedEntry = draggingEntry;
    const intent = dropIntent;
    setDropIntent(null);
    setDraggingEntry(null);

    if (!intent) {
      return;
    }

    try {
      if (intent.position === "inside" && entry.kind === "folder") {
        if (draggedEntry.kind === "folder") {
          await carpetaHook.moverCarpeta(draggedEntry.carpeta.id, { nueva_carpeta_padre_id: entry.carpeta.id });
        } else {
          await moverArchivo(draggedEntry.archivo.id, { nueva_carpeta_id: entry.carpeta.id });
        }
      } else {
        const reordered = buildReorderedEntries(draggedEntry, intent.targetKey, intent.position);

        if (reordered) {
          await persistReorder(reordered);
        }
      }

      await refreshRoots(selectedSection);
      await refreshCurrentContent();
      if (isTrash) {
        await fetchPapelera();
      }
      pushToast("Elemento actualizado.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo reordenar.", "error");
    }
  }

  async function handleUploadFiles(files: FileList | File[]) {
    if (isTrash) {
      return;
    }

    const carpetaId = currentFolderTrail.at(-1)?.id ?? null;
    if (!carpetaId) {
      pushToast("Abrí una carpeta para subir archivos.", "warning");
      return;
    }

    const fileArray = Array.from(files);
    if (fileArray.length === 0) {
      return;
    }

    setUploading(fileArray.map((file) => file.name));

    try {
      for (const file of fileArray) {
        await subirArchivo(file, carpetaId);
      }

      await refreshCurrentContent();
      await fetchPapelera();
      pushToast("Archivo(s) subido(s) correctamente.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "No se pudo subir el archivo.", "error");
    } finally {
      setUploading([]);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await Promise.all(
          sections.map(async (section) => [section.key, await fetchSectionRoots(section.key)] as const)
        );

        setSectionRoots(Object.fromEntries(loaded) as Record<Seccion, CarpetaConConteos[]>);
      } finally {
        setInitialLoading(false);
      }
    })();
    void fetchPapelera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedArea === "papelera") {
      void fetchPapelera();
      return;
    }

    void refreshRoots(selectedSection);
  }, [fetchPapelera, selectedArea, selectedSection]);

  useEffect(() => {
    if (!shareTarget) {
      setShareUsers([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setShareLoading(true);
        const response = await fetch("/api/usuarios");
        const payload = (await response.json()) as { data?: Array<Pick<Usuario, "id" | "nombre" | "rol" | "foto_url">>; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudieron cargar los usuarios.");
        }

        if (!cancelled) {
          setShareUsers(payload.data.filter((usuario) => usuario.rol !== "admin"));
        }
      } catch (error) {
        if (!cancelled) {
          pushToast(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.", "error");
        }
      } finally {
        if (!cancelled) {
          setShareLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shareTarget]);

  useEffect(() => {
    if (currentFolderTrail.length === 0) {
      setCurrentContent(null);
      return;
    }

    const folder = currentFolderTrail[currentFolderTrail.length - 1];
    if (!folder) {
      setCurrentContent(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const data = await fetchCarpetaContenido(folder.id);
      if (!cancelled) {
        setCurrentContent(data);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentFolderTrail]);

  const currentEntries = visibleEntries;

  function renderEmptyState() {
    if (initialLoading) {
      return (
        <Card padding="lg" className="border border-dashed border-line bg-paper text-center text-sm text-graphite">
          <div className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            <span>Cargando archivos...</span>
          </div>
        </Card>
      );
    }

    if (isTrash) {
      return <div className="py-10 text-center text-sm text-graphite">Papelera vacía.</div>;
    }

    return <div className="py-10 text-center text-sm text-graphite">Carpeta vacía.</div>;
  }

  function renderGridItems(mode: ViewMode) {
    const baseClass =
      mode === "gallery"
        ? "grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-3"
        : "grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6";

    return (
      <div className={baseClass}>
        {currentEntries.map((entry) =>
          entry.kind === "folder" ? (
            <EntryCard
              key={entry.key}
              entry={entry}
              mode={mode}
              selected={selectedEntryKey === entry.key}
              openMenuKey={openMenuKey}
              setOpenMenuKey={setOpenMenuKey}
              editingEntryKey={editingEntryKey}
              editingName={editingName}
              setEditingEntryKey={setEditingEntryKey}
              setEditingName={setEditingName}
              onSelect={async () => {
                setSelectedEntryKey(entry.key);
                await openFolder(entry.carpeta, currentFolderTrail.length === 0 ? "root" : "child");
              }}
              onRename={() => {
                setEditingEntryKey(entry.key);
                setEditingName(entry.carpeta.nombre);
              }}
              onMove={() => {
                setMoveTarget({
                  kind: "folder",
                  id: entry.carpeta.id,
                  section: entry.carpeta.seccion,
                  title: entry.carpeta.nombre
                });
              }}
              onShare={() => {
                setShareTarget({
                  id: entry.carpeta.id,
                  title: entry.carpeta.nombre
                });
              }}
              onDelete={() => void handleDeleteEntry(entry)}
              onDragStart={() => handleDragStart(entry)}
              onDragOver={(event) => handleDragOverEntry(event, entry)}
              onDrop={() => void handleDropEntry(entry)}
              onDragEnd={handleDragEnd}
              dropState={dropIntent?.targetKey === entry.key ? dropIntent.position : null}
              hideRename={entry.carpeta.es_automatica}
            />
          ) : (
            <EntryCard
              key={entry.key}
              entry={entry}
              mode={mode}
              selected={selectedEntryKey === entry.key}
              openMenuKey={openMenuKey}
              setOpenMenuKey={setOpenMenuKey}
              editingEntryKey={editingEntryKey}
              editingName={editingName}
              setEditingEntryKey={setEditingEntryKey}
              setEditingName={setEditingName}
              onSelect={() => {
                setSelectedEntryKey(entry.key);
                handleOpenArchivo(entry.archivo);
              }}
              onRename={() => {
                setEditingEntryKey(entry.key);
                setEditingName(entry.archivo.nombre);
              }}
              onMove={() => {
                setMoveTarget({
                  kind: "file",
                  id: entry.archivo.id,
                  section: selectedSection,
                  title: entry.archivo.nombre
                });
              }}
              onDelete={() => void handleDeleteEntry(entry)}
              onDownload={() => void handleDownload(entry.archivo)}
              onDragStart={() => handleDragStart(entry)}
              onDragOver={(event) => handleDragOverEntry(event, entry)}
              onDrop={() => void handleDropEntry(entry)}
              onDragEnd={handleDragEnd}
              dropState={dropIntent?.targetKey === entry.key ? dropIntent.position : null}
            />
          )
        )}
      </div>
    );
  }

  function renderListItems() {
    return (
      <div className="overflow-hidden rounded-card border border-line-soft bg-white">
        <div className="grid grid-cols-[minmax(0,1.7fr)_120px_120px_150px_56px] border-b border-line-soft bg-paper px-4 py-3 text-xs font-label uppercase tracking-[0.16em] text-graphite">
          <span>Nombre</span>
          <span>Tipo</span>
          <span>Tamaño</span>
          <span>Modificado</span>
          <span aria-hidden="true" />
        </div>

        <div className="divide-y divide-line-soft">
          {currentEntries.map((entry) => {
            const isFolder = entry.kind === "folder";
            const key = entry.key;
            const dropState = dropIntent?.targetKey === key ? dropIntent.position : null;

            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                draggable={editingEntryKey !== key}
                onClick={async () => {
                  if (editingEntryKey === key) {
                    return;
                  }

                  setSelectedEntryKey(key);
                  if (isFolder) {
                    await openFolder(entry.carpeta, currentFolderTrail.length === 0 ? "root" : "child");
                    return;
                  }

                  handleOpenArchivo(entry.archivo);
                }}
                onKeyDown={async (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (editingEntryKey === key) {
                      return;
                    }
                    setSelectedEntryKey(key);
                    if (isFolder) {
                      await openFolder(entry.carpeta, currentFolderTrail.length === 0 ? "root" : "child");
                      return;
                    }

                    handleOpenArchivo(entry.archivo);
                  }
                }}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", key);
                  event.dataTransfer.effectAllowed = "move";
                  handleDragStart(entry);
                }}
                onDragOver={(event) => handleDragOverEntry(event, entry)}
                onDrop={async () => {
                  await handleDropEntry(entry);
                }}
                onDragEnd={handleDragEnd}
                className={cn(
                  "grid grid-cols-[minmax(0,1.7fr)_120px_120px_150px_56px] items-center gap-3 px-4 py-3 transition-colors duration-fast ease-fast hover:bg-paper",
                  selectedEntryKey === key && "bg-signal-light",
                  dropState && "ring-2 ring-signal"
                )}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    {isFolder ? (
                      <FolderGlyph />
                    ) : (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-graphite">
                        <FileGlyph archivo={entry.archivo} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      {editingEntryKey === key ? (
                        <div className="space-y-2">
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            autoFocus
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleRenameEntry(entry);
                              }
                              if (event.key === "Escape") {
                                setEditingEntryKey(null);
                                setEditingName("");
                              }
                            }}
                            onBlur={() => {
                              if (editingEntryKey === key) {
                                void handleRenameEntry(entry);
                              }
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => void handleRenameEntry(entry)}>
                              Guardar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEntryKey(null);
                                setEditingName("");
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="block min-w-0 text-left"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedEntryKey(key);
                            if (isFolder) {
                              void openFolder(entry.carpeta, currentFolderTrail.length === 0 ? "root" : "child");
                              return;
                            }

                            handleOpenArchivo(entry.archivo);
                          }}
                        >
                          <span className="flex items-center gap-2 text-sm font-label text-carbon">
                            <span className="truncate">{getEntryName(entry)}</span>
                            {isFolder && entry.carpeta.es_automatica ? <LinkGlyph /> : null}
                          </span>
                          <span className="block text-xs text-graphite">{formatItemSubtitle(entry)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-sm text-graphite">{isFolder ? "Carpeta" : entry.archivo.tipo_mime ?? "Archivo"}</span>
                <span className="text-sm text-graphite">{isFolder ? "—" : formatArchivoSize(entry.archivo.tamanio_bytes)}</span>
                <span className="text-sm text-graphite">{isFolder ? formatFecha(entry.carpeta.created_at) : formatFecha(entry.archivo.created_at)}</span>

                <div className="relative flex justify-end">
                  <EntryMenu
                    open={openMenuKey === key}
                    onToggle={() => setOpenMenuKey((current) => (current === key ? null : key))}
                    onRename={() => {
                      setEditingEntryKey(key);
                      setEditingName(getEntryName(entry));
                    }}
                    onMove={() => {
                      setMoveTarget(
                        entry.kind === "folder"
                          ? {
                              kind: "folder",
                              id: entry.carpeta.id,
                              section: entry.carpeta.seccion,
                              title: entry.carpeta.nombre
                            }
                          : {
                              kind: "file",
                              id: entry.archivo.id,
                              section: selectedSection,
                              title: entry.archivo.nombre
                          }
                      );
                    }}
                    onShare={
                      entry.kind === "folder"
                        ? () => {
                            setShareTarget({
                              id: entry.carpeta.id,
                              title: entry.carpeta.nombre
                            });
                          }
                        : undefined
                    }
                    onDelete={() => void handleDeleteEntry(entry)}
                    onDownload={entry.kind === "file" ? () => void handleDownload(entry.archivo) : undefined}
                    hideRename={entry.kind === "folder" && entry.carpeta.es_automatica}
                    hideDelete={entry.kind === "folder" && entry.carpeta.es_automatica}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-card bg-white shadow-card">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {sectionItems.map((option) => {
                const active = selectedArea === option.key;
                const expanded = expandedSections[option.key];
                const roots = sortSidebarFolders(sectionRoots[option.key] ?? []);

                return (
                  <div key={option.key} className="space-y-1">
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-component px-2 py-1.5 transition-colors duration-fast ease-fast",
                        active ? "bg-signal-light" : "hover:bg-paper"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => void goToSection(option.key)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <SectionIcon option={option} />
                        <span className="truncate text-sm font-label text-carbon">{option.label}</span>
                        <Badge variant="ghost" className="ml-auto">
                          {roots.length}
                        </Badge>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSections((current) => ({ ...current, [option.key]: !current[option.key] }))
                        }
                        className="rounded-component p-1 text-graphite transition-colors duration-fast ease-fast hover:bg-white hover:text-carbon"
                      >
                        <ChevronRightIcon className={cn("h-4 w-4 transition-transform duration-fast ease-fast", expanded && "rotate-90")} />
                      </button>
                    </div>

                    {expanded && roots.length > 0 ? (
                      <div className="space-y-1 pl-7">
                        {roots.map((carpeta) => (
                          <button
                            key={carpeta.id}
                            type="button"
                            onClick={() => void openFolder(carpeta, "root")}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-component px-2 py-1.5 text-left transition-colors duration-fast ease-fast",
                              currentFolderTrail[0]?.id === carpeta.id ? "bg-signal-light" : "hover:bg-paper"
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-carbon">{carpeta.nombre}</span>
                            {carpeta.es_automatica ? <LinkGlyph /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-line-soft p-3">
            <button
              type="button"
              onClick={() => void goToTrash()}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-component px-3 py-2 text-left transition-colors duration-fast ease-fast",
                isTrash ? "bg-signal-light text-carbon" : "hover:bg-paper"
              )}
            >
              <span className="text-sm font-label">Papelera</span>
              <Badge variant="default">{papelera.length}</Badge>
            </button>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden rounded-card bg-white shadow-card">
          <div className="flex min-h-0 flex-nowrap items-center justify-between gap-3 border-b border-line-soft p-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm text-graphite">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.key} className="flex min-w-0 items-center gap-2">
                  {index > 0 ? <span className="text-graphite/60">›</span> : null}
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className={cn(
                      "max-w-[12rem] truncate rounded-pill px-2.5 py-1 font-label transition-colors duration-fast ease-fast hover:bg-paper",
                      index === breadcrumbs.length - 1 ? "bg-paper text-carbon" : "text-graphite"
                    )}
                  >
                    {crumb.label}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="inline-flex rounded-pill bg-paper p-1">
                {[
                  { key: "icons" as const, label: "Íconos" },
                  { key: "list" as const, label: "Lista" },
                  { key: "gallery" as const, label: "Galería" }
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setViewMode(option.key)}
                    className={cn(
                      "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
                      viewMode === option.key ? "bg-white text-carbon shadow-soft" : "text-graphite hover:text-carbon"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreateFolderOpen(true)}
                disabled={isTrash}
              >
                + Nueva carpeta
              </Button>

              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTrash || currentFolderTrail.length === 0}
              >
                Subir archivo
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto p-4 transition-colors duration-fast ease-fast",
              isDragging && "bg-signal-light/20"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isTrash && currentFolderTrail.length > 0) {
                setIsDragging(true);
              }
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (!isTrash && currentFolderTrail.length > 0) {
                void handleUploadFiles(event.dataTransfer.files);
              }
            }}
          >
            {currentFolderTrail.length > 0 && !isTrash ? (
              <div
                className={cn(
                  "mb-4 rounded-card border-2 border-dashed px-4 py-5 transition-colors duration-fast ease-fast",
                  isDragging ? "border-signal bg-signal-light/20" : "border-line bg-paper"
                )}
                onClick={() => fileInputRef.current?.click()}
              />
            ) : null}

            {uploading.length > 0 ? (
              <Card padding="md" className="mb-4 flex items-center gap-3 border border-line-soft bg-paper text-sm text-graphite">
                <Spinner size="sm" />
                <span>Subiendo {uploading.length} archivo{uploading.length === 1 ? "" : "s"}...</span>
              </Card>
            ) : null}
            {currentEntries.length > 0
              ? viewMode === "list"
                ? renderListItems()
                : renderGridItems(viewMode)
              : renderEmptyState()}
          </div>
        </main>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            void handleUploadFiles(event.target.files);
          }
          event.currentTarget.value = "";
        }}
      />

      <Modal isOpen={createFolderOpen} onClose={() => setCreateFolderOpen(false)} title="Nueva carpeta" size="sm">
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={createFolderName}
            onChange={(event) => setCreateFolderName(event.target.value)}
            placeholder="Nueva carpeta"
          />
          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button variant="ghost" onClick={() => setCreateFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreateFolder()} loading={carpetaHook.loading}>
              Crear carpeta
            </Button>
          </div>
        </div>
      </Modal>

      {moveTarget ? (
        <FolderPickerModal
          isOpen={Boolean(moveTarget)}
          onClose={() => setMoveTarget(null)}
          section={moveTarget.section}
          title={`Mover ${moveTarget.title}`}
          onPick={(folderId) => {
            void handleMoveConfirmed(folderId);
          }}
        />
      ) : null}

      <Modal
        isOpen={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        title={shareTarget ? `Compartir "${shareTarget.title}"` : "Compartir carpeta"}
        size="md"
      >
        <div className="space-y-4">
          <div className="max-h-[52vh] overflow-y-auto rounded-card border border-line-soft bg-paper p-3">
            {shareLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-graphite">
                <Spinner size="sm" />
                <span>Cargando usuarios...</span>
              </div>
            ) : shareUsers.length > 0 ? (
              <div className="space-y-2">
                {shareUsers.map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => void handleShareFolder(usuario.id)}
                    className="flex w-full items-center gap-3 rounded-component border border-line-soft bg-white px-3 py-2 text-left transition-colors duration-fast ease-fast hover:bg-paper"
                  >
                    <UserAvatar name={usuario.nombre} fotoUrl={usuario.foto_url} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-label text-carbon">{usuario.nombre}</span>
                      <span className="block text-xs text-graphite">{usuario.rol}</span>
                    </span>
                    <Badge variant="ghost">Compartir</Badge>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-line-soft bg-white px-4 py-8 text-sm text-graphite">
                No hay usuarios disponibles para compartir.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button variant="ghost" onClick={() => setShareTarget(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </div>
  );
}

function EntryCard({
  entry,
  mode,
  selected,
  openMenuKey,
  setOpenMenuKey,
  editingEntryKey,
  editingName,
  setEditingEntryKey,
  setEditingName,
  onSelect,
  onRename,
  onMove,
  onShare,
  onDelete,
  onDownload,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dropState,
  hideRename = false,
  hideDelete = false
}: {
  entry: Entry;
  mode: ViewMode;
  selected: boolean;
  openMenuKey: string | null;
  setOpenMenuKey: (value: string | null) => void;
  editingEntryKey: string | null;
  editingName: string;
  setEditingEntryKey: (value: string | null) => void;
  setEditingName: (value: string) => void;
  onSelect: () => void;
  onRename: () => void;
  onMove: () => void;
  onShare?: () => void;
  onDelete: () => void;
  onDownload?: () => void;
  onDragStart: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  dropState: "before" | "after" | "inside" | null;
  hideRename?: boolean;
  hideDelete?: boolean;
}) {
  const isFolder = entry.kind === "folder";
  const name = getEntryName(entry);
  const key = entry.key;
  const toneClass = getEntryTone(entry);

  const cardClass =
    mode === "gallery"
      ? "min-h-[210px]"
      : mode === "list"
        ? ""
        : "min-h-[220px]";

  if (mode === "list") {
    return null;
  }

  return (
    <div
      draggable={editingEntryKey !== key}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (editingEntryKey === key) {
          return;
        }

        onSelect();
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", key);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(event);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (editingEntryKey !== key) {
            void onSelect();
          }
        }
      }}
      className="group relative"
    >
      <EntryMenu
        open={openMenuKey === key}
        onToggle={() => setOpenMenuKey(openMenuKey === key ? null : key)}
        onRename={onRename}
        onMove={onMove}
        onShare={onShare}
        onDelete={onDelete}
        onDownload={onDownload}
        hideRename={hideRename}
        hideDelete={hideDelete}
      />

      <div className="space-y-2">
        <div
          className={cn(
            "relative flex w-full items-center justify-center overflow-hidden rounded-card border border-line-soft shadow-card transition-all duration-fast ease-fast hover:shadow-modal",
            toneClass,
            selected && "ring-2 ring-signal/20",
            dropState && "ring-2 ring-signal",
            cardClass
          )}
        >
          {isFolder ? (
            <span className={cn(mode === "gallery" ? "inline-flex h-16 w-16 items-center justify-center" : "inline-flex h-12 w-12 items-center justify-center")}>
              <FolderGlyph />
            </span>
          ) : isImageMime(entry.archivo.tipo_mime) && mode === "gallery" ? (
            <Image
              src={`/api/archivos/${entry.archivo.id}/descargar`}
              alt={entry.archivo.nombre}
              fill
              unoptimized
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="rounded-card object-cover"
            />
          ) : (
            <span className={cn(mode === "gallery" ? "inline-flex h-16 w-16 items-center justify-center" : "inline-flex h-10 w-10 items-center justify-center")}>
              <FileGlyph archivo={entry.archivo} />
            </span>
          )}
        </div>

        {editingEntryKey === key ? (
          <div className="space-y-2">
            <Input
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onRename();
                }
                if (event.key === "Escape") {
                  setEditingEntryKey(null);
                  setEditingName("");
                }
              }}
              onBlur={() => {
                if (editingEntryKey === key) {
                  void onRename();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void onRename()}>
                Guardar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingEntryKey(null);
                  setEditingName("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onDoubleClick={() => {
              setEditingEntryKey(key);
              setEditingName(name);
            }}
            onClick={() => onSelect()}
            className="block w-full text-left"
          >
            <span className="block text-center text-sm font-label text-carbon" style={clampTextStyle(2)}>
              {name}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
