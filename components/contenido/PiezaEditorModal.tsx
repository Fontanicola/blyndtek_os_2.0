"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ImageIcon, UploadIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { PiezaContenido, PiezaContenidoEstado, PilarContenido } from "@/types/contenido";
import { getPiezaImageUrl } from "@/components/contenido/PiezaCard";
import { PIEZA_ESTADO_LABELS } from "@/components/contenido/contenidoStyles";

type PiezaEditorModalProps = {
  isOpen: boolean;
  pieza: PiezaContenido | null;
  pilares: PilarContenido[];
  onClose: () => void;
  onSave: (piezaId: string, payload: Partial<PiezaContenido>) => Promise<void>;
  onUploadImage: (piezaId: string, file: File) => Promise<void>;
};

const EDITABLE_ESTADOS: PiezaContenidoEstado[] = ["idea", "en_diseno", "lista", "programada"];

function normalizeHashtag(value: string) {
  const trimmed = value.trim().replace(/^#+/, "");
  return trimmed ? `#${trimmed}` : "";
}

export function PiezaEditorModal({ isOpen, pieza, pilares, onClose, onSave, onUploadImage }: PiezaEditorModalProps) {
  const [titulo, setTitulo] = useState("");
  const [pilarId, setPilarId] = useState("");
  const [caption, setCaption] = useState("");
  const [estado, setEstado] = useState<PiezaContenidoEstado>("idea");
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const readonlyState = pieza?.estado === "publicada" || pieza?.estado === "fallida";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!pieza) {
      return;
    }

    setTitulo(pieza.titulo ?? "");
    setPilarId(pieza.pilar_id ?? "");
    setCaption(pieza.caption ?? "");
    setEstado(pieza.estado);
    setFechaProgramada(pieza.fecha_programada ? pieza.fecha_programada.slice(0, 16) : "");
    setHashtags(Array.isArray(pieza.hashtags) ? pieza.hashtags : []);
    setTagInput("");
  }, [pieza]);

  const imageUrl = useMemo(() => (pieza ? getPiezaImageUrl(pieza) : null), [pieza]);

  function addTag(value: string) {
    const normalized = normalizeHashtag(value);
    if (!normalized) {
      return;
    }

    setHashtags((current) => {
      if (current.some((tag) => tag.toLowerCase() === normalized.toLowerCase())) {
        return current;
      }

      return [...current, normalized];
    });
    setTagInput("");
  }

  async function handleUpload(file: File | null | undefined) {
    if (!pieza || !file) {
      return;
    }

    setUploading(true);
    try {
      await onUploadImage(pieza.id, file);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!pieza) {
      return;
    }

    setSaving(true);
    try {
      await onSave(pieza.id, {
        titulo,
        pilar_id: pilarId || null,
        caption,
        hashtags,
        estado,
        fecha_programada: estado === "programada" && fechaProgramada ? new Date(fechaProgramada).toISOString() : null
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen && Boolean(pieza)} onClose={onClose} title="Editar pieza" size="xl">
      {!pieza ? null : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <label
              className={cn(
                "flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-card border border-dashed border-line bg-paper text-center text-graphite transition-colors duration-fast ease-fast hover:border-signal hover:bg-signal-light/40",
                uploading && "pointer-events-none opacity-60"
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleUpload(event.dataTransfer.files.item(0));
              }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={pieza.titulo} className="h-full w-full object-cover" />
              ) : (
                <div className="space-y-2">
                  <ImageIcon size={36} className="mx-auto" />
                  <p className="text-sm">Arrastrá una imagen o subila manualmente</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handleUpload(event.target.files?.[0])}
              />
            </label>
            <Button variant="secondary" className="w-full" loading={uploading} onClick={() => fileInputRef.current?.click()}>
              <UploadIcon size={16} />
              Subir imagen
            </Button>
          </div>

          <div className="space-y-4">
            <Input label="Título" value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Título interno de la pieza" />

            <label className="block">
              <span className="mb-1 block text-sm font-label text-carbon">Pilar</span>
              <select
                value={pilarId}
                onChange={(event) => setPilarId(event.target.value)}
                className="w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon outline-none transition-all duration-fast ease-fast focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                <option value="">Sin pilar</option>
                {pilares.map((pilar) => (
                  <option key={pilar.id} value={pilar.id}>
                    {pilar.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-label text-carbon">Caption</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Texto de publicación"
                className="min-h-[150px] w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon outline-none transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </label>

            <div>
              <span className="mb-2 block text-sm font-label text-carbon">Hashtags</span>
              <div className="flex flex-wrap items-center gap-2 rounded-component border border-line bg-white p-2">
                {hashtags.map((tag) => (
                  <span key={tag} className="inline-flex h-7 items-center gap-1 rounded-pill bg-paper px-2 text-xs font-label text-carbon">
                    {tag}
                    <button type="button" onClick={() => setHashtags((current) => current.filter((item) => item !== tag))}>
                      <XIcon size={13} />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  onBlur={() => addTag(tagInput)}
                  placeholder="#tag"
                  className="h-8 min-w-[120px] flex-1 bg-transparent px-1 text-sm text-carbon outline-none placeholder:text-graphite"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-label text-carbon">Estado</span>
                <select
                  value={estado}
                  disabled={readonlyState}
                  onChange={(event) => setEstado(event.target.value as PiezaContenidoEstado)}
                  className="w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon outline-none transition-all duration-fast ease-fast focus:border-signal focus:ring-2 focus:ring-signal/20 disabled:bg-paper disabled:text-graphite"
                >
                  {(readonlyState ? [estado] : EDITABLE_ESTADOS).map((item) => (
                    <option key={item} value={item}>
                      {PIEZA_ESTADO_LABELS[item]}
                    </option>
                  ))}
                </select>
                {readonlyState ? <p className="mt-1 text-xs text-graphite">Este estado es de solo lectura.</p> : null}
              </label>

              {estado === "programada" ? (
                <Input
                  label="Fecha programada"
                  type="datetime-local"
                  value={fechaProgramada}
                  onChange={(event) => setFechaProgramada(event.target.value)}
                />
              ) : (
                <div className="flex items-end">
                  <Badge variant="ghost">Sin programación</Badge>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSave()} loading={saving}>
                Guardar pieza
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
