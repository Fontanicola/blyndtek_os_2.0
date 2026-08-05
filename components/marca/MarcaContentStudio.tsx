"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, SavingIndicator } from "@/components/ui";
import { CalendarIcon, ImageIcon, InstagramIcon, LinkedinIcon, PlusIcon, StoriesIcon } from "@/components/ui/icons";
import { PiezaEditorModal } from "@/components/contenido/PiezaEditorModal";
import { getPiezaImageUrl } from "@/components/contenido/PiezaCard";
import { createPieza, fetchPilares, fetchPiezas, generarCompletoPieza, publicarPieza, subirImagenPieza, updatePieza } from "@/lib/hooks/useContenido";
import { createIntegracionSocial, fetchIdentidadSecciones, fetchIntegracionesSociales, saveIdentidadSecciones } from "@/lib/hooks/useMarcaOperacion";
import type { PiezaContenido, PilarContenido } from "@/types/contenido";
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

function StudioTile({ pieza, onOpen }: { pieza: PiezaContenido; onOpen: (pieza: PiezaContenido) => void }) {
  const imageUrl = getPiezaImageUrl(pieza);
  const story = pieza.plataforma === "instagram_story";
  return (
    <button type="button" onClick={() => onOpen(pieza)} className="group relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-left transition-colors duration-fast hover:border-signal hover:bg-signal-light/30">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={pieza.titulo} className="h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]" />
      ) : <div className="flex h-full items-center justify-center text-slate-400"><ImageIcon size={28} /></div>}
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent px-3 pb-3 pt-12 text-white opacity-0 transition-all duration-normal group-hover:translate-y-0 group-hover:opacity-100">
        <p className="truncate text-sm font-label">{pieza.titulo}</p>
        <p className="mt-1 text-xs text-white/80">{formatDate(pieza.fecha_programada)} · {story ? "Historia" : pieza.plataforma === "linkedin_post" ? "LinkedIn" : "Instagram"}</p>
      </div>
      <div className="absolute left-2 top-2 flex gap-1">
        <Badge variant={pieza.estado === "publicada" ? "success" : pieza.estado === "programada" ? "signal" : "default"}>{pieza.estado === "programada" ? "Programada" : pieza.estado === "publicada" ? "Publicada" : "Borrador"}</Badge>
      </div>
    </button>
  );
}

export function MarcaContentStudio({ initialTab = "feed" }: MarcaContentStudioProps) {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [socialFilter, setSocialFilter] = useState<SocialFilter>("instagram");
  const [piezas, setPiezas] = useState<PiezaContenido[]>([]);
  const [pilares, setPilares] = useState<PilarContenido[]>([]);
  const [selected, setSelected] = useState<PiezaContenido | null>(null);
  const [sections, setSections] = useState<MarcaIdentidadSeccion[]>([]);
  const [integraciones, setIntegraciones] = useState<IntegracionSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState<"idle" | "saving" | "saved">("idle");
  const [connecting, setConnecting] = useState<"instagram" | "linkedin" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [pieces, pillars, identity, social] = await Promise.all([fetchPiezas(), fetchPilares(), fetchIdentidadSecciones().catch(() => []), fetchIntegracionesSociales().catch(() => [])]);
      setPiezas(pieces);
      setPilares(pillars);
      setSections(identity.length ? identity : sectionDefaults.map(([clave, titulo]) => ({ id: clave, marca_id: "", clave, titulo, contenido: "", orden: 0, visible: true, updated_by: null, created_at: "", updated_at: "" })));
      setIntegraciones(social);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const feedPieces = useMemo(() => piezas.filter((pieza) => isInstagramFeed(pieza) && (socialFilter === "instagram" ? pieza.plataforma === "instagram_feed" : pieza.plataforma === "linkedin_post")), [piezas, socialFilter]);
  const storyPieces = useMemo(() => piezas.filter((pieza) => pieza.plataforma === "instagram_story"), [piezas]);
  const scheduled = useMemo(() => piezas.filter((pieza) => pieza.fecha_programada).sort((a, b) => String(a.fecha_programada).localeCompare(String(b.fecha_programada))), [piezas]);

  async function handleCreate(platform: "instagram_feed" | "instagram_story" | "linkedin_post") {
    const created = await createPieza({ plataforma: platform, tipo_pieza: platform === "instagram_story" ? "historia" : null, titulo: platform === "instagram_story" ? "Nueva historia" : "Nueva publicación" });
    await load();
    setSelected(created);
  }

  async function handleSave(id: string, payload: Partial<PiezaContenido>) {
    await updatePieza(id, payload);
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
        {tab === "feed" ? <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => void handleCreate("linkedin_post")}><LinkedinIcon size={16} /> Nueva en LinkedIn</Button><Button size="sm" onClick={() => void handleCreate("instagram_feed")}><PlusIcon size={16} /> Nueva publicación</Button></div> : null}
        {tab === "historias" ? <Button size="sm" onClick={() => void handleCreate("instagram_story")}><PlusIcon size={16} /> Nueva historia</Button> : null}
      </div>}

      {tab === "feed" ? <section className="space-y-5">
        <Card padding="md" className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-signal-light">
              <Image src="/Favicon_Blyndtek.svg" alt="Blyndtek" fill className="object-contain p-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-title text-lg text-carbon">blyndtek</h2><Badge variant="success">Cuenta profesional</Badge></div>
              <div className="mt-3 flex gap-5 text-sm text-carbon"><span><strong className="font-title">{feedPieces.length}</strong> publicaciones</span><span><strong className="font-title">Blyndtek</strong> marca</span><span><strong className="font-title">Orgánico</strong> canal</span></div>
            </div>
          </div>
          <div className="mt-4"><p className="font-title text-sm text-carbon">Blyndtek · Automatización para PyMEs</p><p className="mt-1 text-sm leading-5 text-graphite">Consultoría tecnológica, IA y automatización. Medimos tu operación y te mostramos en números cuánto estás perdiendo.</p><p className="mt-1 text-sm text-signal">blyndtek.com</p></div>
        </Card>
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-label text-signal">Vista editorial</p><h2 className="font-title text-xl text-carbon">Feed de {socialFilter === "instagram" ? "Instagram" : "LinkedIn"}</h2><p className="mt-1 text-sm text-graphite">Hacé click en cualquier publicación para abrir su lab y editarla.</p></div><div className="flex flex-wrap gap-2"><div className="flex gap-1 rounded-md border border-slate-200 bg-white p-1"><button type="button" onClick={() => setSocialFilter("instagram")} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-label", socialFilter === "instagram" ? "bg-signal text-white" : "text-slate-600 hover:bg-slate-50")}><InstagramIcon size={15} /> Instagram</button><button type="button" onClick={() => setSocialFilter("linkedin")} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-label", socialFilter === "linkedin" ? "bg-signal text-white" : "text-slate-600 hover:bg-slate-50")}><LinkedinIcon size={15} /> LinkedIn</button></div><Button size="sm" onClick={() => void handleCreate(socialFilter === "instagram" ? "instagram_feed" : "linkedin_post")}><PlusIcon size={16} /> Nueva publicación</Button></div></div>
        {feedPieces.length === 0 ? <EmptyState icon={ImageIcon} titulo="Todavía no hay publicaciones" descripcion="Creá la primera publicación para empezar a ordenar el feed de la marca." accion={{ label: "Crear publicación", onClick: () => void handleCreate(socialFilter === "instagram" ? "instagram_feed" : "linkedin_post") }} /> : <div className="mx-auto grid max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200">{feedPieces.map((pieza) => <StudioTile key={pieza.id} pieza={pieza} onOpen={setSelected} />)}</div>}
      </section> : null}

      {tab === "historias" ? <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-label text-signal">Laboratorio vertical</p><h2 className="font-title text-xl text-carbon">Historias listas para ejecutar</h2><p className="mt-1 text-sm text-graphite">Organizá secuencias, textos y horarios de historias desde un único lugar.</p></div><Button size="sm" onClick={() => void handleCreate("instagram_story")}><PlusIcon size={16} /> Nueva historia</Button></div>{storyPieces.length === 0 ? <EmptyState icon={StoriesIcon} titulo="Todavía no hay historias" descripcion="Creá una historia para empezar a armar la secuencia de Instagram." accion={{ label: "Crear historia", onClick: () => void handleCreate("instagram_story") }} /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{storyPieces.map((pieza) => <div key={pieza.id} className="aspect-[9/16]"><StudioTile pieza={pieza} onOpen={setSelected} /></div>)}</div>}</section> : null}

      {tab === "calendario" ? <section className="space-y-4"><div><p className="text-sm font-label text-signal">Agenda editorial</p><h2 className="font-title text-xl text-carbon">Calendario de publicaciones</h2><p className="mt-1 text-sm text-graphite">La fecha que editás en cada pieza es la misma que se refleja acá.</p></div>{scheduled.length === 0 ? <EmptyState icon={CalendarIcon} titulo="No hay publicaciones programadas" descripcion="Asigná una fecha desde el lab de cualquier pieza para verla en la agenda." /> : <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">{scheduled.map((pieza) => <button key={pieza.id} type="button" onClick={() => setSelected(pieza)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-sm font-label text-carbon">{pieza.titulo}</span><span className="mt-1 block text-xs text-graphite">{formatDate(pieza.fecha_programada)} · {pieza.plataforma === "linkedin_post" ? "LinkedIn" : pieza.plataforma === "instagram_story" ? "Historia" : "Instagram"}</span></span><Badge variant={pieza.estado === "publicada" ? "success" : "signal"}>{pieza.estado === "publicada" ? "Publicada" : "Programada"}</Badge></button>)}</div>}</section> : null}

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

      <PiezaEditorModal isOpen={Boolean(selected)} pieza={selected} pilares={pilares} onClose={() => setSelected(null)} onSave={handleSave} onUploadImage={async (id, file, index) => { await subirImagenPieza(id, file, index); await load(); }} onGenerateComplete={async (id) => { const result = await generarCompletoPieza(id); await load(); return result; }} onPublish={async (id, red) => { await publicarPieza(id, red); await load(); }} />
    </div>
  );
}
