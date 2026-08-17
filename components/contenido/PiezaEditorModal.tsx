"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ChevronDownIcon, ImageIcon, SparklesIcon, UploadIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { GenerarCompletoPiezaResult } from "@/lib/hooks/useContenido";
import type { JsonValue, PiezaContenido, PiezaContenidoEstado, PilarContenido } from "@/types/contenido";
import { getPiezaImagePathUrl, getPiezaImageUrl } from "@/components/contenido/PiezaCard";
import { PIEZA_ESTADO_LABELS } from "@/components/contenido/contenidoStyles";

type PiezaEditorModalProps = {
  isOpen: boolean;
  pieza: PiezaContenido | null;
  pilares: PilarContenido[];
  onClose: () => void;
  onSave: (piezaId: string, payload: Partial<PiezaContenido>) => Promise<void>;
  onUploadImage: (piezaId: string, file: File, slideIndex?: number | null) => Promise<void>;
  onGenerateComplete: (piezaId: string) => Promise<GenerarCompletoPiezaResult>;
  onPublish?: (piezaId: string, red: "instagram" | "linkedin") => Promise<void>;
  simple?: boolean;
};

type EditableSlide = {
  titulo_slide: string;
  texto: string;
};

const EDITABLE_ESTADOS: PiezaContenidoEstado[] = ["idea", "en_diseno", "lista", "programada"];

function normalizeHashtag(value: string) {
  const trimmed = value.trim().replace(/^#+/, "");
  return trimmed ? `#${trimmed}` : "";
}

function asRecord(value: JsonValue | null): Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function hasRenderableGuion(pieza: PiezaContenido | null) {
  if (!pieza || pieza.plataforma !== "instagram_feed") {
    return false;
  }

  const guion = asRecord(pieza.guion);
  return Array.isArray(guion.slides) || typeof guion.texto_principal === "string";
}

function getEditableSlides(pieza: PiezaContenido | null): EditableSlide[] {
  if (!pieza) return [];
  const guion = asRecord(pieza.guion);
  if (!Array.isArray(guion.slides)) return [];
  return guion.slides.map((slide) => {
    const record = asRecord(slide);
    return {
      titulo_slide: typeof record.titulo_slide === "string" ? record.titulo_slide : "",
      texto: typeof record.texto === "string" ? record.texto : ""
    };
  });
}

export function PiezaEditorModal({
  isOpen,
  pieza,
  pilares,
  onClose,
  onSave,
  onUploadImage,
  onGenerateComplete,
  onPublish
  , simple = false
}: PiezaEditorModalProps) {
  const [titulo, setTitulo] = useState("");
  const [pilarId, setPilarId] = useState("");
  const [caption, setCaption] = useState("");
  const [estado, setEstado] = useState<PiezaContenidoEstado>("idea");
  const [fechaProgramada, setFechaProgramada] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [slides, setSlides] = useState<EditableSlide[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [selectedGeneratedImage, setSelectedGeneratedImage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const readonlyState = pieza?.estado === "publicada" || pieza?.estado === "fallida";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceSlideInputRef = useRef<HTMLInputElement | null>(null);

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
    setSlides(getEditableSlides(pieza));
    setTagInput("");
    setGeneratedPrompt(pieza.prompt_fondo ?? "");
    setPromptOpen(false);
    setGenerationError(null);
    setSelectedGeneratedImage(Array.isArray(pieza.imagenes_generadas) ? pieza.imagenes_generadas[0] ?? null : null);
  }, [pieza]);

  const imageUrl = useMemo(() => (pieza ? getPiezaImageUrl(pieza) : null), [pieza]);
  const generatedImages = useMemo(() => (Array.isArray(pieza?.imagenes_generadas) ? pieza.imagenes_generadas : []), [pieza]);
  const selectedGeneratedImageUrl = useMemo(
    () => (pieza && selectedGeneratedImage ? getPiezaImagePathUrl(pieza.id, selectedGeneratedImage) : null),
    [pieza, selectedGeneratedImage]
  );

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

  async function handleReplaceSelectedGeneratedImage(file: File | null | undefined) {
    if (!pieza || !file || !selectedGeneratedImage) {
      return;
    }

    const slideIndex = generatedImages.findIndex((path) => path === selectedGeneratedImage);
    if (slideIndex < 0) {
      return;
    }

    setUploading(true);
    try {
      await onUploadImage(pieza.id, file, slideIndex);
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
      const currentGuion = asRecord(pieza.guion);
      const nextGuion = slides.length > 0
        ? { ...currentGuion, slides: slides.map((slide) => ({ titulo_slide: slide.titulo_slide, texto: slide.texto })) }
        : pieza.guion;

      await onSave(pieza.id, {
        titulo,
        caption,
        ...(simple ? { estado: fechaProgramada ? "programada" : "idea", fecha_programada: fechaProgramada || null } : {
          pilar_id: pilarId || null,
          hashtags,
          estado,
          fecha_programada: estado === "programada" && fechaProgramada ? fechaProgramada : null,
          guion: nextGuion
        })
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateComplete() {
    if (!pieza) {
      return;
    }

    setGenerating(true);
    setGenerationError(null);
    try {
      const result = await onGenerateComplete(pieza.id);
      setSelectedGeneratedImage(result.imagenes_generadas[0] ?? null);
      setGeneratedPrompt(result.prompt_fondo ?? "");
      setEstado(result.pieza.estado);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar la pieza.";
      setGenerationError(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove() {
    if (!pieza) {
      return;
    }

    setSaving(true);
    try {
      await onSave(pieza.id, { estado: "lista" });
      setEstado("lista");
      window.alert("Lista para publicar — subila desde tu celular cuando quieras.");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPublished() {
    if (!pieza) {
      return;
    }

    setSaving(true);
    try {
      await onSave(pieza.id, { estado: "publicada" });
      setEstado("publicada");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!pieza || !onPublish) return;
    setPublishing(true);
    try {
      await onPublish(pieza.id, pieza.plataforma === "linkedin_post" ? "linkedin" : "instagram");
      onClose();
    } finally {
      setPublishing(false);
    }
  }

  const showRevisionActions = pieza?.estado === "en_diseno";
  const showMarkPublished = pieza?.estado === "lista" && (pieza.plataforma === "instagram_reel" || pieza.plataforma === "instagram_story");

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

            {!simple && showRevisionActions ? (
              <div className="rounded-card border border-line-soft bg-success-light p-4">
                <h3 className="font-title text-base text-carbon">Revisión pendiente</h3>
                <p className="mt-1 text-xs leading-relaxed text-graphite">
                  Esta pieza fue generada automáticamente. Aprobala, regenerala o cambiá una imagen puntual.
                </p>
                <div className="mt-4 grid gap-2">
                  <Button
                    className="bg-success text-white hover:bg-success/90"
                    loading={saving}
                    onClick={() => void handleApprove()}
                  >
                    Aprobar
                  </Button>
                  <Button variant="secondary" loading={generating} onClick={() => void handleGenerateComplete()}>
                    <SparklesIcon size={16} />
                    Regenerar
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={generatedImages.length === 0 || !selectedGeneratedImage}
                    loading={uploading}
                    onClick={() => replaceSlideInputRef.current?.click()}
                  >
                    <UploadIcon size={16} />
                    Cambiar imagen seleccionada
                  </Button>
                  <input
                    ref={replaceSlideInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void handleReplaceSelectedGeneratedImage(event.target.files?.[0])}
                  />
                </div>
              </div>
            ) : null}

            {!simple && showMarkPublished ? (
              <Button variant="secondary" className="w-full" loading={saving} onClick={() => void handleMarkPublished()}>
                Marcar como publicado
              </Button>
            ) : null}

            {!simple && onPublish && pieza.estado === "lista" && (pieza.plataforma === "instagram_feed" || pieza.plataforma === "instagram_story" || pieza.plataforma === "linkedin_post") ? (
              <Button className="w-full" loading={publishing} onClick={() => void handlePublish()}>
                Publicar ahora en {pieza.plataforma === "linkedin_post" ? "LinkedIn" : "Instagram"}
              </Button>
            ) : null}

            {!simple && hasRenderableGuion(pieza) ? (
              <div className="rounded-card border border-line-soft bg-white p-4 shadow-subtle">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-title text-base text-carbon">Generar</h3>
                    <p className="mt-1 text-xs leading-relaxed text-graphite">
                      Crea el fondo y renderiza el texto real encima, listo para revisar.
                    </p>
                  </div>
                  <SparklesIcon size={18} className="mt-0.5 text-signal" />
                </div>

                <Button className="w-full" loading={generating} onClick={() => void handleGenerateComplete()}>
                  <SparklesIcon size={16} />
                  {generatedImages.length > 0 ? "Regenerar" : "Generar"}
                </Button>
                {generating ? <p className="mt-2 text-xs text-graphite">Generando...</p> : null}
                {generationError ? <p className="mt-2 text-xs font-label text-danger">{generationError}</p> : null}

                {generatedImages.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {selectedGeneratedImageUrl ? (
                      <div className="overflow-hidden rounded-component border border-line-soft bg-paper">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedGeneratedImageUrl} alt="Slide generado" className="aspect-[4/5] w-full object-cover" />
                      </div>
                    ) : null}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {generatedImages.map((path, index) => {
                        const active = path === selectedGeneratedImage;
                        return (
                          <button
                            key={path}
                            type="button"
                            onClick={() => setSelectedGeneratedImage(path)}
                            className={cn(
                              "relative h-20 w-16 shrink-0 overflow-hidden rounded-component border bg-paper transition-colors duration-fast ease-fast",
                              active ? "border-signal" : "border-line-soft hover:border-signal/60"
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getPiezaImagePathUrl(pieza.id, path)} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" />
                            <span className="absolute bottom-1 right-1 rounded-pill bg-white/90 px-1.5 text-[10px] font-label text-carbon">
                              {index + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {generatedPrompt || pieza.guion ? (
                  <div className="mt-4 rounded-component border border-line-soft bg-paper">
                    <button
                      type="button"
                      onClick={() => setPromptOpen((current) => !current)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-label text-carbon"
                    >
                      Ver detalle técnico
                      <ChevronDownIcon
                        size={16}
                        className={cn("text-graphite transition-transform duration-fast ease-fast", promptOpen && "rotate-180")}
                      />
                    </button>
                    {promptOpen ? (
                      <div className="space-y-3 border-t border-line-soft px-3 py-3 text-xs leading-relaxed text-graphite">
                        {generatedPrompt ? (
                          <div>
                            <p className="mb-1 font-label text-carbon">Prompt de fondo</p>
                            <p>{generatedPrompt}</p>
                          </div>
                        ) : null}
                        {pieza.guion ? (
                          <div>
                            <p className="mb-1 font-label text-carbon">Guion usado</p>
                            <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-base text-xs text-graphite">
                              {JSON.stringify(pieza.guion, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <Input label="Título" value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Título interno de la pieza" />

            {!simple ? <label className="block">
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
            </label> : null}

            {!simple && pieza.plataforma === "instagram_feed" && slides.length > 0 ? (
              <section className="rounded-md border border-line-soft bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-title text-base text-carbon">Slides del carrusel</h3>
                    <p className="mt-1 text-xs text-graphite">Editá el contenido real de cada slide. El orden se conserva en el render y en el feed.</p>
                  </div>
                  <Badge variant="ghost">{slides.length} slides</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {slides.map((slide, index) => (
                    <div key={`slide-${index}`} className="rounded-md border border-line-soft bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-label text-graphite">Slide {index + 1}</span>
                        {slides.length > 1 ? (
                          <button type="button" onClick={() => setSlides((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-graphite transition-colors duration-fast hover:text-danger" aria-label={`Eliminar slide ${index + 1}`}>
                            <XIcon size={15} />
                          </button>
                        ) : null}
                      </div>
                      <Input label="Título del slide" value={slide.titulo_slide} onChange={(event) => setSlides((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, titulo_slide: event.target.value } : item))} />
                      <textarea value={slide.texto} onChange={(event) => setSlides((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, texto: event.target.value } : item))} placeholder="Texto del slide" className="mt-3 min-h-20 w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20" />
                    </div>
                  ))}
                </div>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => setSlides((current) => [...current, { titulo_slide: "", texto: "" }])}>
                  Agregar slide
                </Button>
              </section>
            ) : null}

            <label className="block">
              <span className="mb-1 block text-sm font-label text-carbon">Caption</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Texto de publicación"
                className="min-h-[150px] w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon outline-none transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </label>

            {!simple ? <div>
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
            </div> : null}

            {!simple ? <div className="grid gap-4 sm:grid-cols-2">
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
            </div> : <Input label="Fecha y hora de publicación" type="datetime-local" value={fechaProgramada} onChange={(event) => setFechaProgramada(event.target.value)} />}

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
