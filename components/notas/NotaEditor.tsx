"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, Card, Modal } from "@/components/ui";
import { MenuIcon } from "@/components/icons";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { cn } from "@/lib/cn";
import {
  NOTA_ETIQUETA_COLOR_OPTIONS,
  getNotaEtiquetaColorClasses,
  sanitizeNotaTags
} from "@/lib/notas";
import type { CarpetaNota, Nota } from "@/types/notas";
import type { NotaEtiqueta, NotaEtiquetaColor } from "@/types/notasEtiquetas";
import type { NotaVinculoValue } from "./VincularEntidadSelect";
import { VincularEntidadSelect } from "./VincularEntidadSelect";

type NotaEditorProps = {
  nota: Nota | null;
  carpetas: CarpetaNota[];
  clientes: Array<{ id: string; empresa: string }>;
  proyectos: Array<{ id: string; nombre: string; clienteNombre?: string | null }>;
  leads: Array<{ id: string; empresa: string; canal?: string | null; etapa?: string | null }>;
  availableEtiquetas: NotaEtiqueta[];
  linkedEntityLabel: string | null;
  linkedEntityHref: string | null;
  isAdmin?: boolean;
  sharedUserIds?: string[];
  shareUsers?: Array<{ id: string; nombre: string }>;
  saving: boolean;
  onUpdateNota: (
    id: string,
    input: Partial<
      Pick<
        Nota,
        "titulo" | "contenido" | "carpeta_id" | "fijada" | "cliente_id" | "proyecto_id" | "lead_id" | "tags"
      >
    >
  ) => void | Promise<void>;
  onUpdateNotaInmediata: (
    id: string,
    input: Partial<
      Pick<
        Nota,
        "titulo" | "contenido" | "carpeta_id" | "fijada" | "cliente_id" | "proyecto_id" | "lead_id" | "tags"
      >
    >
  ) => void | Promise<void>;
  onToggleFijada: (id: string) => void | Promise<void>;
  onMoverPapelera: (id: string) => void | Promise<void>;
  onRestaurar: (id: string) => void | Promise<void>;
  onEliminarDefinitivo: (id: string) => void | Promise<void>;
  onDraftChange?: (partial: Partial<Nota>) => void;
  onCreateEtiqueta: (input: { nombre: string; color?: NotaEtiquetaColor | null }) => Promise<NotaEtiqueta>;
  onUpdateEtiquetaColor: (id: string, color: NotaEtiquetaColor) => Promise<NotaEtiqueta>;
  onUpdateNotaCompartidas?: (notaId: string, usuarioIds: string[]) => Promise<void>;
  imageUploadUrl?: string;
};

function PinIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M11.5 2.75 17.25 8.5l-2.25 1.25-3 3v4l-1.5 1.5-1-1 1.5-1.5v-4l-3-3L5 9.75 11.5 2.75Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M8 10.5a2.5 2.5 0 0 1 0-3.5l1.5-1.5a2.5 2.5 0 0 1 3.5 3.5L12.25 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.5a2.5 2.5 0 0 1 0 3.5l-1.5 1.5a2.5 2.5 0 1 1-3.5-3.5L7.75 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M6.25 8.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM13.75 8.25a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.75 15.25c0-2.1 1.7-3.75 3.75-3.75s3.75 1.65 3.75 3.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.75 15.25c.15-1.8 1.6-3.25 3.4-3.25 1.5 0 2.8.95 3.3 2.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusDot({ saving }: { saving: boolean }) {
  return (
    <span
      title={saving ? "Guardando..." : "Guardado"}
      className={cn("h-2.5 w-2.5 rounded-full", saving ? "animate-pulse bg-warning" : "bg-success")}
    />
  );
}

function IconButton({
  active,
  onClick,
  children,
  title
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-component transition-colors duration-fast ease-fast",
        active ? "bg-signal-light text-signal" : "text-graphite hover:bg-paper hover:text-carbon"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function NotaEditor({
  nota,
  carpetas,
  clientes,
  proyectos,
  leads,
  availableEtiquetas,
  linkedEntityLabel,
  linkedEntityHref,
  isAdmin = false,
  sharedUserIds = [],
  shareUsers = [],
  saving,
  onUpdateNota,
  onUpdateNotaInmediata,
  onToggleFijada,
  onMoverPapelera,
  onRestaurar,
  onEliminarDefinitivo,
  onDraftChange,
  onCreateEtiqueta,
  onUpdateEtiquetaColor,
  onUpdateNotaCompartidas,
  imageUploadUrl = "/api/notas/imagenes/upload"
}: NotaEditorProps) {
  const [titleDraft, setTitleDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareDraft, setShareDraft] = useState<string[]>(sharedUserIds);
  const [linkDraft, setLinkDraft] = useState<NotaVinculoValue>({ tipo: "ninguna", id: null });
  const [folderDraft, setFolderDraft] = useState<string>("");
  const [editingColorTag, setEditingColorTag] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tagInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!nota) {
      setTitleDraft("");
      setTagsDraft([]);
      setTagInput("");
      setAddingTag(false);
      setFolderDraft("");
      setLinkDraft({ tipo: "ninguna", id: null });
      setEditingColorTag(null);
      return;
    }

    setTitleDraft(nota.titulo);
    setTagsDraft(Array.isArray(nota.tags) ? nota.tags : []);
    setTagInput("");
    setAddingTag(false);
    setFolderDraft(nota.carpeta_id ?? "");
    setShareDraft(sharedUserIds);
    setLinkDraft(
      nota.cliente_id
        ? { tipo: "cliente", id: nota.cliente_id }
        : nota.proyecto_id
          ? { tipo: "proyecto", id: nota.proyecto_id }
          : nota.lead_id
            ? { tipo: "lead", id: nota.lead_id }
            : { tipo: "ninguna", id: null }
    );
  }, [nota, sharedUserIds]);

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

  useEffect(() => {
    if (addingTag) {
      tagInputRef.current?.focus();
    }
  }, [addingTag]);

  useEffect(() => {
    if (shareModalOpen) {
      setShareDraft(sharedUserIds);
    }
  }, [shareModalOpen, sharedUserIds]);

  const tagSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    const current = new Set(tagsDraft.map((tag) => tag.toLowerCase()));

    if (!query) {
      return availableEtiquetas.filter((tag) => !current.has(tag.nombre.toLowerCase())).slice(0, 8);
    }

    return availableEtiquetas
      .filter((tag) => tag.nombre.toLowerCase().includes(query) && !current.has(tag.nombre.toLowerCase()))
      .slice(0, 8);
  }, [availableEtiquetas, tagInput, tagsDraft]);

  if (!nota) {
    return (
      <Card padding="lg" className="flex h-full min-h-0 items-center justify-center border border-dashed border-line">
        <p className="text-sm text-graphite">Seleccioná una nota o creá una nueva.</p>
      </Card>
    );
  }

  const notaId = nota.id;

  function commitTags(nextTags: string[]) {
    const sanitized = sanitizeNotaTags(nextTags);
    setTagsDraft(sanitized);
    onDraftChange?.({ tags: sanitized });
    void onUpdateNotaInmediata(notaId, { tags: sanitized });
  }

  async function handleAddTag(rawValue: string) {
    const value = rawValue.trim();
    if (!value) {
      setAddingTag(false);
      setTagInput("");
      return;
    }

    if (tagsDraft.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setAddingTag(false);
      setTagInput("");
      return;
    }

    const existing = availableEtiquetas.find((item) => item.nombre.toLowerCase() === value.toLowerCase());
    if (existing) {
      commitTags([...tagsDraft, existing.nombre]);
      setAddingTag(false);
      setTagInput("");
      return;
    }

    const created = await onCreateEtiqueta({ nombre: value });
    commitTags([...tagsDraft, created.nombre]);
    setAddingTag(false);
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    commitTags(tagsDraft.filter((item) => item !== tag));
  }

  async function handleTagColorChange(tag: string, color: NotaEtiquetaColor) {
    const etiqueta = availableEtiquetas.find((item) => item.nombre === tag);

    if (etiqueta) {
      await onUpdateEtiquetaColor(etiqueta.id, color);
      setEditingColorTag(null);
      return;
    }

    await onCreateEtiqueta({ nombre: tag, color });
    setEditingColorTag(null);
  }

  return (
    <Card padding="lg" className="flex h-full min-h-0 flex-col overflow-hidden border border-line-soft bg-white shadow-card">
      <div className="flex-shrink-0 border-b border-line-soft pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <input
              value={titleDraft}
              onChange={(event) => {
                const next = event.target.value;
                setTitleDraft(next);
                onDraftChange?.({ titulo: next });
                void onUpdateNota(notaId, { titulo: next });
              }}
              placeholder="Título de la nota"
              className="w-full border-0 bg-transparent p-0 text-xl font-title text-carbon outline-none placeholder:text-graphite focus:ring-0"
            />

            <div className="flex flex-wrap items-center gap-2">
              {linkedEntityLabel && linkedEntityHref ? (
                <Link
                  href={linkedEntityHref}
                  className="inline-flex items-center rounded-pill bg-signal-light px-2.5 py-1 text-xs font-label text-signal transition-colors duration-fast ease-fast hover:bg-white"
                >
                  <LinkIcon />
                  <span className="ml-1">{linkedEntityLabel}</span>
                </Link>
              ) : null}

              <StatusDot saving={saving} />

              {isAdmin && sharedUserIds.length > 0 ? (
                <span
                  title={`Compartida con ${sharedUserIds.length} usuario${sharedUserIds.length === 1 ? "" : "s"}`}
                  className="inline-flex items-center text-signal"
                >
                  <PeopleIcon />
                </span>
              ) : null}

              <div className="ml-auto flex items-center gap-1">
                <IconButton
                  active={nota.fijada}
                  onClick={() => {
                    void onToggleFijada(notaId);
                    onDraftChange?.({ fijada: !nota.fijada });
                  }}
                  title={nota.fijada ? "Quitar fijada" : "Fijar nota"}
                >
                  <PinIcon filled={nota.fijada} />
                </IconButton>

                <div ref={menuRef} className="relative">
                  <IconButton onClick={() => setMenuOpen((current) => !current)} title="Más acciones">
                    <MenuIcon />
                  </IconButton>

                  {menuOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-card border border-line-soft bg-white shadow-modal">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setShareModalOpen(true);
                          }}
                          className="flex w-full items-center px-4 py-3 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                        >
                          Compartir con...
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setLinkModalOpen(true);
                        }}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                      >
                        Vincular entidad
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setFolderModalOpen(true);
                        }}
                        className="flex w-full items-center px-4 py-3 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                      >
                        Mover a carpeta
                      </button>
                      {nota.en_papelera ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onDraftChange?.({ en_papelera: false, eliminada_at: null });
                            void onRestaurar(notaId);
                          }}
                          className="flex w-full items-center px-4 py-3 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                        >
                          Restaurar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onDraftChange?.({
                              en_papelera: true,
                              eliminada_at: new Date().toISOString()
                            });
                            void onMoverPapelera(notaId);
                          }}
                          className="flex w-full items-center px-4 py-3 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                        >
                          Mover a papelera
                        </button>
                      )}
                      {nota.en_papelera ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            void onEliminarDefinitivo(notaId);
                          }}
                          className="flex w-full items-center px-4 py-3 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
                        >
                          Eliminar definitivamente
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tagsDraft.map((tag) => {
                const etiqueta = availableEtiquetas.find((item) => item.nombre === tag);
                const colorClasses = getNotaEtiquetaColorClasses(etiqueta?.color);

                return (
                  <div key={tag} className="relative">
                    <span className="inline-flex items-center gap-1 rounded-pill bg-white/85 px-2 py-1 text-xs font-label text-carbon shadow-soft">
                      <button
                        type="button"
                        aria-label={`Cambiar color de ${tag}`}
                        onClick={() => setEditingColorTag((current) => (current === tag ? null : tag))}
                        className={cn("h-2 w-2 rounded-full", colorClasses.dotClass)}
                      />
                      <span className="max-w-[10rem] truncate">{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-graphite transition-colors duration-fast ease-fast hover:text-danger"
                        aria-label={`Quitar tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>

                    {editingColorTag === tag ? (
                      <div className="absolute left-0 top-full z-20 mt-2 rounded-card border border-line-soft bg-white p-2 shadow-modal">
                        <div className="flex items-center gap-2">
                          {NOTA_ETIQUETA_COLOR_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              title={option.label}
                              onClick={() => void handleTagColorChange(tag, option.value)}
                              className={cn(
                                "h-5 w-5 rounded-full border transition-transform duration-fast ease-fast hover:scale-110",
                                option.value === "default" ? "border-line-soft bg-paper" : option.swatchClass
                              )}
                            >
                              <span className="sr-only">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {addingTag ? (
                <div className="relative min-w-[180px] flex-1">
                  <input
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleAddTag(tagInput);
                      }

                      if (event.key === "Escape") {
                        setAddingTag(false);
                        setTagInput("");
                      }
                    }}
                    onBlur={() => {
                      if (!tagInput.trim()) {
                        setAddingTag(false);
                      }
                    }}
                    placeholder="Tag"
                    className="h-8 w-full rounded-component border border-line bg-white px-3 text-sm text-carbon outline-none transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:ring-2 focus:ring-signal/20"
                  />

                  {tagInput.trim() && tagSuggestions.length > 0 ? (
                    <div className="absolute left-0 top-full z-10 mt-2 w-full overflow-hidden rounded-card border border-line-soft bg-white shadow-modal">
                      {tagSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => void handleAddTag(suggestion.nombre)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                        >
                          <span className={cn("h-2 w-2 rounded-full", getNotaEtiquetaColorClasses(suggestion.color).dotClass)} />
                          <span className="truncate">{suggestion.nombre}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setAddingTag(true)}>
                  + tag
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <RichTextEditor
        content={nota.contenido}
        onChange={(content) => {
          onDraftChange?.({ contenido: content });
          void onUpdateNota(notaId, { contenido: content });
        }}
        placeholder="Empezá a escribir..."
        className="pt-0"
        imageUploadUrl={imageUploadUrl}
      />

      <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Vincular entidad" size="md">
        <VincularEntidadSelect
          value={linkDraft}
          onChange={(next) => setLinkDraft(next)}
          clientes={clientes}
          proyectos={proyectos}
          leads={leads}
        />

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-line-soft pt-4">
          <Button variant="ghost" onClick={() => setLinkModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              const next =
                linkDraft.tipo === "ninguna"
                  ? { cliente_id: null, proyecto_id: null, lead_id: null }
                  : linkDraft.tipo === "cliente"
                    ? { cliente_id: linkDraft.id, proyecto_id: null, lead_id: null }
                    : linkDraft.tipo === "proyecto"
                      ? { cliente_id: null, proyecto_id: linkDraft.id, lead_id: null }
                      : { cliente_id: null, proyecto_id: null, lead_id: linkDraft.id };

              onDraftChange?.(next);
              void onUpdateNota(notaId, next);
              setLinkModalOpen(false);
            }}
          >
            Guardar vínculo
          </Button>
        </div>
      </Modal>

      <Modal isOpen={folderModalOpen} onClose={() => setFolderModalOpen(false)} title="Mover a carpeta" size="sm">
        <div className="space-y-4">
          <select
            value={folderDraft}
            onChange={(event) => setFolderDraft(event.target.value)}
            className="h-10 w-full rounded-component border border-line bg-white px-3 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          >
            <option value="">Sin carpeta</option>
            {carpetas.map((carpeta) => (
              <option key={carpeta.id} value={carpeta.id}>
                {carpeta.nombre}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setFolderModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const next = folderDraft || null;
                onDraftChange?.({ carpeta_id: next });
                void onUpdateNotaInmediata(notaId, { carpeta_id: next });
                setFolderModalOpen(false);
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} title="Compartir con..." size="md">
        <div className="space-y-4">
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {shareUsers.length > 0 ? (
              shareUsers.map((user) => {
                const checked = shareDraft.includes(user.id);

                return (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 rounded-component border border-line-soft px-3 py-2 text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setShareDraft((current) =>
                          current.includes(user.id)
                            ? current.filter((item) => item !== user.id)
                            : [...current, user.id]
                        )
                      }
                      className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
                    />
                    <span className="min-w-0 flex-1 truncate font-label">{user.nombre}</span>
                  </label>
                );
              })
            ) : (
              <div className="rounded-card border border-dashed border-line bg-paper px-3 py-4 text-sm text-graphite">
                No hay usuarios comerciales activos para compartir.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button variant="ghost" onClick={() => setShareModalOpen(false)}>
              Cancelar
            </Button>
              <Button
              onClick={async () => {
                try {
                  await onUpdateNotaCompartidas?.(notaId, shareDraft);
                  setShareModalOpen(false);
                } catch {
                  // El error se expone desde el hook; mantenemos el modal abierto.
                }
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
