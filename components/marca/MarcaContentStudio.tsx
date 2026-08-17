"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, RowActions, SavingIndicator } from "@/components/ui";
import { ImageIcon, InstagramIcon, LinkedinIcon, PencilIcon, PinIcon, PlusIcon, StoriesIcon, TrashIcon } from "@/components/ui/icons";
import { PiezaEditorModal } from "@/components/contenido/PiezaEditorModal";
import { PiezaWorkspaceModal } from "@/components/contenido/PiezaWorkspaceModal";
import { MarcaContenidoTimeline } from "@/components/marca/MarcaContenidoTimeline";
import { getPiezaImageUrl } from "@/components/contenido/PiezaCard";
import { createCanal, createPieza, deletePieza, fetchCanales, fetchFeedSlots, fetchPilares, fetchPiezas, generarCompletoPieza, publicarPieza, subirImagenPieza, updateFeedSlot, updatePieza } from "@/lib/hooks/useContenido";
import { createIntegracionSocial, fetchIdentidadSecciones, fetchIntegracionesSociales, saveIdentidadSecciones } from "@/lib/hooks/useMarcaOperacion";
import type { CanalContenido, FeedSlotContenido, PiezaContenido, PilarContenido, WorkspaceContenido } from "@/types/contenido";
import type { IntegracionSocial, MarcaIdentidadSeccion } from "@/types/contenidoOperacion";
import { cn } from "@/lib/cn";

type StudioTab = "feed" | "historias" | "calendario" | "identidad";
type SocialFilter = "instagram" | "linkedin";

type MarcaContentStudioProps = {
  initialTab?: StudioTab;
};

const sectionDefaults = [
  ["posicionamiento", "Posicionamiento", "Qué problema resolvemos, para quién y desde qué lugar de autoridad."],
  ["quienes-somos", "Quiénes somos", "Historia, equipo, experiencia y forma de trabajar."],
  ["que-hacemos", "Qué hacemos", "Servicios, capacidades y tipo de transformación que entregamos."],
  ["propuesta-valor", "Propuesta de valor", "Por qué una PyME debería elegir Blyndtek y qué cambia después."],
  ["tono", "Tono y personalidad", "Cómo habla Blyndtek, qué palabras usa y qué sensaciones debe transmitir."],
  ["prueba", "Prueba y autoridad", "Casos, resultados, aprendizajes, metodología y evidencia."],
  ["lineamientos", "Lineamientos editoriales", "Temas prioritarios, temas a evitar y reglas para mantener consistencia."]
] as const;

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function isInstagramFeed(pieza: PiezaContenido) {
  return pieza.plataforma === "instagram_feed" || pieza.plataforma === "linkedin_post";
}

function StudioTile({ pieza, onOpen, onDelete, onWorkspace, onDragStart, onDrop, ratio = "square" }: { pieza: PiezaContenido; onOpen: (pieza: PiezaContenido) => void; onDelete: (pieza: PiezaContenido) => void; onWorkspace: (pieza: PiezaContenido) => void; onDragStart?: (pieza: PiezaContenido) => void; onDrop?: (pieza: PiezaContenido) => void; ratio?: "square" | "portrait" }) {
  const imageUrl = getPiezaImageUrl(pieza);
  const story = pieza.plataforma === "instagram_story";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(pieza)}
      draggable={Boolean(onDragStart)}
      onDragStart={() => onDragStart?.(pieza)}
      onDragOver={(event) => { if (onDrop) event.preventDefault(); }}
      onDrop={(event) => { event.preventDefault(); onDrop?.(pieza); }}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(pieza); } }}
      className={cn("group relative cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-left transition-colors duration-fast hover:border-signal hover:bg-signal-light/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30", ratio === "portrait" ? "aspect-[4/5]" : "aspect-square")}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={pieza.titulo} className="h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]" />
      ) : <div className="flex h-full items-center justify-center text-slate-400"><ImageIcon size={28} /></div>}
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent px-3 pb-3 pt-12 text-white opacity-0 transition-all duration-normal group-hover:translate-y-0 group-hover:opacity-100">
        <p className="truncate text-sm font-label">{pieza.titulo}</p>
        <p className="mt-1 text-xs text-white/80">{formatDate(pieza.fecha_programada)} · {story ? "Historia" : pieza.plataforma === "linkedin_post" ? "LinkedIn" : "Instagram"}</p>
      </div>
      <div className="absolute left-2 top-2 flex gap-1">
        <Badge variant={pieza.estado === "publicada" ? "success" : pieza.estado === "lista" || pieza.estado === "programada" ? "signal" : "default"}>{pieza.estado === "lista" || pieza.estado === "programada" ? "Aprobada" : pieza.estado === "publicada" ? "Publicada" : "Borrador"}</Badge>
        {pieza.feed_pineado ? <Badge variant="warning"><PinIcon size={12} /> Fijada</Badge> : null}
        {pieza.workspace_data && (pieza.workspace_data.strokes.length > 0 || pieza.workspace_data.texts.length > 0) ? <Badge variant="danger">Correcciones</Badge> : null}
      </div>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100" onClick={(event) => event.stopPropagation()}>
        <RowActions actions={[
          { kind: "edit", label: "Editar publicación", icon: <PencilIcon size={15} />, onClick: () => onOpen(pieza) },
          { kind: "edit", label: "Abrir Workspace", icon: <PencilIcon size={15} />, onClick: () => onWorkspace(pieza) },
          { kind: "edit", label: pieza.feed_pineado ? "Desfijar del feed" : "Fijar arriba", icon: <PinIcon size={15} />, onClick: () => onDrop?.(pieza) },
          { kind: "destructive", label: "Eliminar publicación", icon: <TrashIcon size={15} />, onClick: () => onDelete(pieza) }
        ]} />
      </div>
    </div>
  );
}

export function MarcaContentStudio({ initialTab = "feed" }: MarcaContentStudioProps) {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [socialFilter, setSocialFilter] = useState<SocialFilter>("instagram");
  const [piezas, setPiezas] = useState<PiezaContenido[]>([]);
  const [canales, setCanales] = useState<CanalContenido[]>([]);
  const [feedSlots, setFeedSlots] = useState<FeedSlotContenido[]>([]);
  const [pilares, setPilares] = useState<PilarContenido[]>([]);
  const [selected, setSelected] = useState<PiezaContenido | null>(null);
  const [workspacePieza, setWorkspacePieza] = useState<PiezaContenido | null>(null);
  const [draggedPieza, setDraggedPieza] = useState<PiezaContenido | null>(null);
  const [sections, setSections] = useState<MarcaIdentidadSeccion[]>([]);
  const [integraciones, setIntegraciones] = useState<IntegracionSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState<"idle" | "saving" | "saved">("idle");
  const [connecting, setConnecting] = useState<"instagram" | "linkedin" | null>(null);

  async function load(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const [pieces, pillars, identity, social, channelList, instagramSlots, linkedinSlots] = await Promise.all([fetchPiezas(), fetchPilares(), fetchIdentidadSecciones().catch(() => []), fetchIntegracionesSociales().catch(() => []), fetchCanales(), fetchFeedSlots("instagram_feed").catch(() => []), fetchFeedSlots("linkedin_post").catch(() => [])]);
      setPiezas(pieces);
      setCanales(channelList);
      setFeedSlots([...instagramSlots, ...linkedinSlots]);
      setPilares(pillars);
      setSections(identity.length ? identity : sectionDefaults.map(([clave, titulo]) => ({ id: clave, marca_id: "", clave, titulo, contenido: "", orden: 0, visible: true, updated_by: null, created_at: "", updated_at: "" })));
      setIntegraciones(social);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => { void load(true); }, []);

  const feedPieces = useMemo(() => piezas.filter((pieza) => isInstagramFeed(pieza) && (socialFilter === "instagram" ? pieza.plataforma === "instagram_feed" : pieza.plataforma === "linkedin_post")).sort((a, b) => Number(b.feed_pineado) - Number(a.feed_pineado) || (a.feed_orden ?? Number.MAX_SAFE_INTEGER) - (b.feed_orden ?? Number.MAX_SAFE_INTEGER) || a.created_at.localeCompare(b.created_at)), [piezas, socialFilter]);
  const storyPieces = useMemo(() => piezas.filter((pieza) => pieza.plataforma === "instagram_story"), [piezas]);
  async function handleCreate(platform: "instagram_feed" | "instagram_story" | "linkedin_post") {
    const created = await createPieza({ plataforma: platform, tipo_pieza: platform === "instagram_story" ? "historia" : null, titulo: platform === "instagram_story" ? "Nueva historia" : "Nueva publicación" });
    await load();
    setSelected(created);
  }

  async function handleCreateFromTimeline(canal: CanalContenido, date: Date) {
    const created = await createPieza({ plataforma: canal.plataforma, tipo_pieza: canal.plataforma === "instagram_story" ? "historia" : null, titulo: "Nueva pieza", fecha_programada: `${date.toISOString().slice(0, 10)}T09:00` });
    await load();
    setSelected(created);
  }

  async function handleAddChannel() {
    const name = window.prompt("Nombre del nuevo canal");
    if (!name?.trim()) return;
    await createCanal({ nombre: name.trim() });
    await load();
  }

  async function handleSave(id: string, payload: Partial<PiezaContenido>) {
    await updatePieza(id, payload);
    await load();
  }

  async function handleDelete(pieza: PiezaContenido) {
    if (!window.confirm(`¿Eliminar la publicación "${pieza.titulo}"?`)) return;
    await deletePieza(pieza.id);
    if (selected?.id === pieza.id) setSelected(null);
    await load();
  }

  async function handleReorder(target: PiezaContenido) {
    if (!draggedPieza || draggedPieza.id === target.id) return;
    const ordered = [...feedPieces];
    const from = ordered.findIndex((item) => item.id === draggedPieza.id);
    const to = ordered.findIndex((item) => item.id === target.id);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    if (!moved) return;
    ordered.splice(to, 0, moved);
    const sourceDate = feedSlots.find((slot) => slot.slot_orden === from)?.fecha_programada ?? ordered[from]?.fecha_programada ?? null;
    const targetDate = feedSlots.find((slot) => slot.slot_orden === to)?.fecha_programada ?? ordered[to]?.fecha_programada ?? null;
    await Promise.all(ordered.map((item, index) => updatePieza(item.id, { feed_orden: index, ...(item.id === moved.id ? { fecha_programada: targetDate, estado: targetDate ? "programada" : item.estado } : item.id === target.id ? { fecha_programada: sourceDate, estado: sourceDate ? "programada" : item.estado } : {}) })));
    setDraggedPieza(null);
    await load();
  }

  async function handleSlotDate(index: number, value: string) {
    try {
      const saved = await updateFeedSlot({ plataforma: socialFilter === "instagram" ? "instagram_feed" : "linkedin_post", slot_orden: index, fecha_programada: value || null });
      setFeedSlots((current) => [...current.filter((slot) => slot.slot_orden !== index || slot.plataforma !== saved.plataforma), saved].sort((a, b) => a.slot_orden - b.slot_orden));
    } catch (error) { window.alert(error instanceof Error ? error.message : "No se pudo guardar el horario del cuadrante."); }
  }

  async function handleTogglePin(pieza: PiezaContenido) {
    if (!pieza.feed_pineado && feedPieces.filter((item) => item.feed_pineado).length >= 3) {
      window.alert("Podés fijar hasta 3 publicaciones arriba del feed.");
      return;
    }
    await updatePieza(pieza.id, { feed_pineado: !pieza.feed_pineado });
    await load();
  }

  async function handleWorkspaceSave(data: WorkspaceContenido) {
    if (!workspacePieza) return;
    await updatePieza(workspacePieza.id, { workspace_data: data });
    setWorkspacePieza(null);
    await load();
  }

  async function saveIdentity() {
    setSavingIdentity("saving");
    try {
      await saveIdentidadSecciones(sections.map(({ clave, titulo, contenido }) => ({ clave, titulo, contenido })));
      setSavingIdentity("saved");
    } catch {
      setSavingIdentity("idle");
    }
  }

  async function connect(red: "instagram" | "linkedin") {
    const name = window.prompt(`Nombre de la cuenta de ${red === "instagram" ? "Instagram" : "LinkedIn"}`);
    if (!name) return;
    setConnecting(red);
    try {
      await createIntegracionSocial({ red, nombre_cuenta: name });
      await load();
    } finally {
      setConnecting(null);
    }
  }

  if (loading) return <div className="space-y-4"><div className="h-10 animate-pulse rounded-md bg-slate-100" /><div className="grid grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="aspect-square animate-pulse rounded-md bg-slate-100" />)}</div></div>;

  return (
    <div className="space-y-5">
      {initialTab ? null : <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-1">
          {(["feed", "historias", "calendario", "identidad"] as StudioTab[]).map((item) => {
            const labels = { feed: "Feed", historias: "Historias", calendario: "Calendario", identidad: "Identidad de marca" };
            return <button key={item} type="button" onClick={() => setTab(item)} className={cn("rounded-md px-3 py-2 text-sm font-label transition-colors duration-fast", tab === item ? "bg-signal text-white" : "text-slate-600 hover:bg-slate-100")}>{labels[item]}</button>;
          })}
        </div>
        {tab === "historias" ? <Button size="sm" onClick={() => void handleCreate("instagram_story")}><PlusIcon size={16} /> Nueva historia</Button> : null}
      </div>}

      {tab === "feed" ? <section className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-end gap-2"><div className="flex gap-1 rounded-md border border-slate-200 bg-white p-1"><button type="button" onClick={() => setSocialFilter("instagram")} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-label", socialFilter === "instagram" ? "bg-signal text-white" : "text-slate-600 hover:bg-slate-50")}><InstagramIcon size={15} /> Instagram</button><button type="button" onClick={() => setSocialFilter("linkedin")} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-label", socialFilter === "linkedin" ? "bg-signal text-white" : "text-slate-600 hover:bg-slate-50")}><LinkedinIcon size={15} /> LinkedIn</button></div></div>
        <div className="grid grid-cols-3 gap-4">
          {feedPieces.map((pieza, index) => <div key={pieza.id} className="space-y-2"><label className="block"><input aria-label={`Fecha de publicación ${index + 1}`} type="datetime-local" value={(feedSlots.find((slot) => slot.slot_orden === index && slot.plataforma === (socialFilter === "instagram" ? "instagram_feed" : "linkedin_post"))?.fecha_programada ?? pieza.fecha_programada ?? "").slice(0, 16)} onChange={(event) => void handleSlotDate(index, event.target.value)} className="w-full rounded border border-line bg-white px-2 py-1 text-[11px] text-carbon" /></label><StudioTile ratio="portrait" pieza={pieza} onOpen={setSelected} onDelete={handleDelete} onWorkspace={setWorkspacePieza} onDragStart={setDraggedPieza} onDrop={(target) => void (draggedPieza ? handleReorder(target) : handleTogglePin(target))} /></div>)}
          <button type="button" onClick={() => void handleCreate(socialFilter === "instagram" ? "instagram_feed" : "linkedin_post")} className="flex aspect-[4/5] items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:border-signal hover:bg-signal-light/30 hover:text-signal" aria-label="Agregar publicación"><PlusIcon size={32} /></button>
        </div>
      </section> : null}

      {tab === "historias" ? <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-label text-signal">Laboratorio vertical</p><h2 className="font-title text-xl text-carbon">Historias listas para ejecutar</h2><p className="mt-1 text-sm text-graphite">Organizá secuencias, textos y horarios de historias desde un único lugar.</p></div><Button size="sm" onClick={() => void handleCreate("instagram_story")}><PlusIcon size={16} /> Nueva historia</Button></div>{storyPieces.length === 0 ? <EmptyState icon={StoriesIcon} titulo="Todavía no hay historias" descripcion="Creá una historia para empezar a armar la secuencia de Instagram." accion={{ label: "Crear historia", onClick: () => void handleCreate("instagram_story") }} /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{storyPieces.map((pieza) => <div key={pieza.id} className="aspect-[9/16]"><StudioTile pieza={pieza} onOpen={setSelected} onDelete={handleDelete} onWorkspace={setWorkspacePieza} /></div>)}</div>}</section> : null}

      {tab === "calendario" ? <MarcaContenidoTimeline canales={canales} piezas={piezas} feedSlots={feedSlots} onOpen={setSelected} onCreate={(canal, date) => void handleCreateFromTimeline(canal, date)} onAddChannel={() => void handleAddChannel()} /> : null}

      {tab === "identidad" ? (
        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Card padding="md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-label text-signal">Manual vivo</p>
                <h2 className="font-title text-xl text-carbon">Identidad de Blyndtek</h2>
                <p className="mt-1 text-sm text-graphite">Un documento editable para que todas las publicaciones hablen con la misma voz.</p>
              </div>
              <SavingIndicator estado={savingIdentity} />
            </div>
            <div className="mt-5 space-y-4">
              {sections.map((section) => (
                <label key={section.clave} className="block">
                  <span className="mb-1 block text-sm font-label text-carbon">{section.titulo}</span>
                  <textarea
                    value={section.contenido}
                    onChange={(event) => setSections((current) => current.some((item) => item.clave === section.clave)
                      ? current.map((item) => item.clave === section.clave ? { ...item, contenido: event.target.value } : item)
                      : [...current, { ...section, contenido: event.target.value }])}
                    placeholder="Definí este aspecto de la marca..."
                    className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20"
                  />
                </label>
              ))}
            </div>
            <Button className="mt-5" onClick={() => void saveIdentity()}>Guardar identidad</Button>
          </Card>
          <Card padding="md">
            <p className="text-sm font-label text-signal">Canales</p>
            <h3 className="mt-1 font-title text-lg text-carbon">Publicación directa</h3>
            <p className="mt-2 text-sm leading-6 text-graphite">Luli puede publicar sin aprobación previa. Conectá las cuentas profesionales cuando estén listas para habilitar las APIs.</p>
            <div className="mt-5 space-y-3">
              {(["instagram", "linkedin"] as const).map((red) => {
                const connected = integraciones.find((item) => item.red === red && item.activa);
                return (
                  <div key={red} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3">
                    <span className="flex items-center gap-2 text-sm font-label text-carbon">
                      {red === "instagram" ? <InstagramIcon size={18} /> : <LinkedinIcon size={18} />}
                      {connected?.nombre_cuenta ?? (red === "instagram" ? "Instagram" : "LinkedIn")}
                    </span>
                    <Button variant="secondary" size="sm" loading={connecting === red} onClick={() => void connect(red)}>{connected ? "Editar" : "Conectar"}</Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      ) : null}

      <PiezaEditorModal simple isOpen={Boolean(selected)} pieza={selected} pilares={pilares} onClose={() => setSelected(null)} onSave={handleSave} onUploadImage={async (id, file, index) => { await subirImagenPieza(id, file, index); await load(); }} onGenerateComplete={async (id) => { const result = await generarCompletoPieza(id); await load(); return result; }} onPublish={async (id, red) => { await publicarPieza(id, red); await load(); }} />
      <PiezaWorkspaceModal pieza={workspacePieza} isOpen={Boolean(workspacePieza)} onClose={() => setWorkspacePieza(null)} onSave={handleWorkspaceSave} />
    </div>
  );
}
