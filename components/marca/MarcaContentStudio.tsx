"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  RowActions,
  SavingIndicator,
} from "@/components/ui";
import {
  FileTextIcon,
  ImageIcon,
  InstagramIcon,
  LinkedinIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  StoriesIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { PiezaEditorModal } from "@/components/contenido/PiezaEditorModal";
import { PiezaWorkspaceModal } from "@/components/contenido/PiezaWorkspaceModal";
import { MarcaContenidoTimeline } from "@/components/marca/MarcaContenidoTimeline";
import { getPiezaImageUrl } from "@/components/contenido/PiezaCard";
import {
  createCanal,
  createPieza,
  deletePieza,
  fetchCanales,
  fetchFeedSlots,
  fetchPilares,
  fetchPiezas,
  generarCompletoPieza,
  publicarPieza,
  subirImagenPieza,
  updatePieza,
} from "@/lib/hooks/useContenido";
import {
  createIntegracionSocial,
  fetchIdentidadSecciones,
  fetchIntegracionesSociales,
  saveIdentidadSecciones,
} from "@/lib/hooks/useMarcaOperacion";
import type {
  CanalContenido,
  FeedSlotContenido,
  PiezaContenido,
  PilarContenido,
  WorkspaceContenido,
} from "@/types/contenido";
import type {
  IntegracionSocial,
  MarcaIdentidadSeccion,
} from "@/types/contenidoOperacion";
import { cn } from "@/lib/cn";

type StudioTab = "feed" | "historias" | "calendario" | "identidad";
type SocialFilter = "instagram" | "linkedin";
type InstagramFeedData = {
  capability: {
    connected: boolean;
    canPublish: boolean;
    missingPermissions: string[];
    accountId: string | null;
  };
  connection: { last_sync_at: string | null; last_error: string | null } | null;
  media: Array<{
    id: string;
    caption: string | null;
    media_type: string | null;
    media_product_type: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    permalink: string | null;
    posted_at: string | null;
    like_count: number;
    comments_count: number;
    synced_at: string;
  }>;
};

type MarcaContentStudioProps = {
  initialTab?: StudioTab;
  initialSocialFilter?: SocialFilter;
};

const sectionDefaults = [
  [
    "posicionamiento",
    "Posicionamiento",
    "Qué problema resolvemos, para quién y desde qué lugar de autoridad.",
  ],
  [
    "quienes-somos",
    "Quiénes somos",
    "Historia, equipo, experiencia y forma de trabajar.",
  ],
  [
    "que-hacemos",
    "Qué hacemos",
    "Servicios, capacidades y tipo de transformación que entregamos.",
  ],
  [
    "propuesta-valor",
    "Propuesta de valor",
    "Por qué una PyME debería elegir Blyndtek y qué cambia después.",
  ],
  [
    "tono",
    "Tono y personalidad",
    "Cómo habla Blyndtek, qué palabras usa y qué sensaciones debe transmitir.",
  ],
  [
    "prueba",
    "Prueba y autoridad",
    "Casos, resultados, aprendizajes, metodología y evidencia.",
  ],
  [
    "lineamientos",
    "Lineamientos editoriales",
    "Temas prioritarios, temas a evitar y reglas para mantener consistencia.",
  ],
] as const;

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function startOfWeek(value: Date) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function weekKey(value: Date) {
  return startOfWeek(value).toISOString().slice(0, 10);
}

function isInstagramFeed(pieza: PiezaContenido) {
  return (
    pieza.plataforma === "instagram_feed" ||
    pieza.plataforma === "linkedin_post"
  );
}

function StudioTile({
  pieza,
  onOpen,
  onDelete,
  onWorkspace,
  onDragStart,
  onDrop,
  ratio = "square",
}: {
  pieza: PiezaContenido;
  onOpen: (pieza: PiezaContenido) => void;
  onDelete: (pieza: PiezaContenido) => void;
  onWorkspace: (pieza: PiezaContenido) => void;
  onDragStart?: (pieza: PiezaContenido) => void;
  onDrop?: (pieza: PiezaContenido) => void;
  ratio?: "square" | "portrait";
}) {
  const imageUrl = getPiezaImageUrl(pieza);
  const story = pieza.plataforma === "instagram_story";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(pieza)}
      draggable={Boolean(onDragStart)}
      onDragStart={() => onDragStart?.(pieza)}
      onDragOver={(event) => {
        if (onDrop) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(pieza);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(pieza);
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-left transition-colors duration-fast hover:border-signal hover:bg-signal-light/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30",
        ratio === "portrait" ? "aspect-[4/5]" : "aspect-square",
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={pieza.titulo}
          className="h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">
          <ImageIcon size={28} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent px-3 pb-3 pt-12 text-white opacity-0 transition-all duration-normal group-hover:translate-y-0 group-hover:opacity-100">
        <p className="truncate text-sm font-label">{pieza.titulo}</p>
        <p className="mt-1 text-xs text-white/80">
          {formatDate(pieza.fecha_programada)} ·{" "}
          {story
            ? "Historia"
            : pieza.plataforma === "linkedin_post"
              ? "LinkedIn"
              : "Instagram"}
        </p>
      </div>
      <div className="absolute left-2 top-2 flex gap-1">
        {pieza.estado === "idea" || pieza.estado === "en_diseno" ? (
          <span title="Borrador" aria-label="Borrador">
            <Badge variant="default">
              <FileTextIcon size={13} />
            </Badge>
          </span>
        ) : null}
        {pieza.estado === "lista" || pieza.estado === "programada" ? (
          <span title="Aprobada" aria-label="Aprobada">
            <Badge variant="signal">✓</Badge>
          </span>
        ) : null}
        {pieza.estado === "publicada" ? (
          <span title="Publicada" aria-label="Publicada">
            <Badge variant="success">✓</Badge>
          </span>
        ) : null}
        {pieza.estado === "fallida" ? (
          <span
            title={pieza.meta_error || "Falló la publicación"}
            aria-label="Fallida"
          >
            <Badge variant="danger">!</Badge>
          </span>
        ) : null}
        {pieza.feed_pineado ? (
          <span title="Fijada arriba" aria-label="Fijada arriba">
            <Badge variant="warning">
              <PinIcon size={13} />
            </Badge>
          </span>
        ) : null}
        {pieza.workspace_data &&
        (pieza.workspace_data.strokes.length > 0 ||
          pieza.workspace_data.texts.length > 0) ? (
          <Badge variant="danger">Correcciones</Badge>
        ) : null}
      </div>
      <div
        className="absolute right-2 top-2 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={(event) => event.stopPropagation()}
      >
        <RowActions
          actions={[
            {
              kind: "edit",
              label: "Editar publicación",
              icon: <PencilIcon size={15} />,
              onClick: () => onOpen(pieza),
            },
            {
              kind: "edit",
              label: "Abrir Workspace",
              icon: <PencilIcon size={15} />,
              onClick: () => onWorkspace(pieza),
            },
            {
              kind: "edit",
              label: pieza.feed_pineado ? "Desfijar del feed" : "Fijar arriba",
              icon: <PinIcon size={15} />,
              onClick: () => onDrop?.(pieza),
            },
            {
              kind: "destructive",
              label: "Eliminar publicación",
              icon: <TrashIcon size={15} />,
              onClick: () => onDelete(pieza),
            },
          ]}
        />
      </div>
    </div>
  );
}

export function MarcaContentStudio({
  initialTab = "feed",
  initialSocialFilter = "instagram",
}: MarcaContentStudioProps) {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [socialFilter] = useState<SocialFilter>(initialSocialFilter);
  const [piezas, setPiezas] = useState<PiezaContenido[]>([]);
  const [canales, setCanales] = useState<CanalContenido[]>([]);
  const [feedSlots, setFeedSlots] = useState<FeedSlotContenido[]>([]);
  const [pilares, setPilares] = useState<PilarContenido[]>([]);
  const [selected, setSelected] = useState<PiezaContenido | null>(null);
  const [workspacePieza, setWorkspacePieza] = useState<PiezaContenido | null>(
    null,
  );
  const [draggedPieza, setDraggedPieza] = useState<PiezaContenido | null>(null);
  const [sections, setSections] = useState<MarcaIdentidadSeccion[]>([]);
  const [integraciones, setIntegraciones] = useState<IntegracionSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [connecting, setConnecting] = useState<"instagram" | "linkedin" | null>(
    null,
  );
  const [manualWeeks, setManualWeeks] = useState<
    Record<SocialFilter, string[]>
  >({ instagram: [], linkedin: [] });
  const [currentWeekOverrides, setCurrentWeekOverrides] = useState<
    Record<SocialFilter, string | null>
  >({ instagram: null, linkedin: null });
  const [draggingWeekMarker, setDraggingWeekMarker] = useState(false);
  const [feedView, setFeedView] = useState<"planner" | "published">("planner");
  const [instagramFeed, setInstagramFeed] = useState<InstagramFeedData | null>(
    null,
  );

  async function load(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const [
        pieces,
        pillars,
        identity,
        social,
        channelList,
        instagramSlots,
        linkedinSlots,
        instagramData,
      ] = await Promise.all([
        fetchPiezas(),
        fetchPilares(),
        fetchIdentidadSecciones().catch(() => []),
        fetchIntegracionesSociales().catch(() => []),
        fetchCanales(),
        fetchFeedSlots("instagram_feed").catch(() => []),
        fetchFeedSlots("linkedin_post").catch(() => []),
        fetch("/api/marca/instagram/feed")
          .then(async (response) => {
            const payload = (await response.json()) as {
              data?: InstagramFeedData;
            };
            return response.ok ? (payload.data ?? null) : null;
          })
          .catch(() => null),
      ]);
      setPiezas(pieces);
      setCanales(channelList);
      setFeedSlots([...instagramSlots, ...linkedinSlots]);
      setPilares(pillars);
      setSections(
        identity.length
          ? identity
          : sectionDefaults.map(([clave, titulo]) => ({
              id: clave,
              marca_id: "",
              clave,
              titulo,
              contenido: "",
              orden: 0,
              visible: true,
              updated_by: null,
              created_at: "",
              updated_at: "",
            })),
      );
      setIntegraciones(social);
      setInstagramFeed(instagramData);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("blyndtek-marca-feed-weeks");
      if (saved)
        setManualWeeks(JSON.parse(saved) as Record<SocialFilter, string[]>);
      const savedMarker = window.localStorage.getItem(
        "blyndtek-marca-current-week",
      );
      if (savedMarker)
        setCurrentWeekOverrides(
          JSON.parse(savedMarker) as Record<SocialFilter, string | null>,
        );
    } catch {
      // La planificación visual puede continuar aunque el almacenamiento local no esté disponible.
    }
  }, []);

  const feedPieces = useMemo(
    () =>
      piezas
        .filter(
          (pieza) =>
            isInstagramFeed(pieza) &&
            (socialFilter === "instagram"
              ? pieza.plataforma === "instagram_feed"
              : pieza.plataforma === "linkedin_post"),
        )
        .sort(
          (a, b) =>
            Number(b.feed_pineado) - Number(a.feed_pineado) ||
            (a.feed_orden ?? Number.MAX_SAFE_INTEGER) -
              (b.feed_orden ?? Number.MAX_SAFE_INTEGER) ||
            a.created_at.localeCompare(b.created_at),
        ),
    [piezas, socialFilter],
  );
  const pinnedFeedPieces = useMemo(
    () => feedPieces.filter((pieza) => pieza.feed_pineado),
    [feedPieces],
  );
  const unpinnedFeedPieces = useMemo(
    () => feedPieces.filter((pieza) => !pieza.feed_pineado),
    [feedPieces],
  );
  const storyPieces = useMemo(
    () => piezas.filter((pieza) => pieza.plataforma === "instagram_story"),
    [piezas],
  );
  const currentWeek = weekKey(new Date());
  const activeFeedPlatform =
    socialFilter === "instagram" ? "instagram_feed" : "linkedin_post";
  const feedWeeks = useMemo(() => {
    const dates = unpinnedFeedPieces.map((pieza) => {
      return pieza.fecha_programada
        ? weekKey(new Date(pieza.fecha_programada))
        : null;
    });
    const keys = new Set<string>(manualWeeks[socialFilter] ?? []);
    dates.forEach((date) => {
      if (date) keys.add(date);
    });
    const undatedCount = dates.filter((date) => !date).length;
    for (let index = 0; index < Math.ceil(undatedCount / 3); index += 1) {
      keys.add(`sin-fecha-${index}`);
    }
    return Array.from(keys).sort((a, b) => {
      const aUndated = a.startsWith("sin-fecha");
      const bUndated = b.startsWith("sin-fecha");
      if (aUndated !== bUndated) return aUndated ? 1 : -1;
      return aUndated ? a.localeCompare(b) : b.localeCompare(a);
    });
  }, [manualWeeks, socialFilter, unpinnedFeedPieces]);
  const feedPiecesByWeek = useMemo(() => {
    const assignments = new Map<string, PiezaContenido[]>();
    let undatedIndex = 0;
    unpinnedFeedPieces.forEach((pieza) => {
      const key = pieza.fecha_programada
        ? weekKey(new Date(pieza.fecha_programada))
        : `sin-fecha-${Math.floor(undatedIndex / 3)}`;
      if (!pieza.fecha_programada) undatedIndex += 1;
      assignments.set(key, [...(assignments.get(key) ?? []), pieza]);
    });
    return assignments;
  }, [unpinnedFeedPieces]);
  const selectedCurrentWeek = currentWeekOverrides[socialFilter] ?? currentWeek;
  const currentWeekIndex = feedWeeks.findIndex(
    (week) => week === selectedCurrentWeek,
  );
  const displayCurrentWeekIndex =
    currentWeekIndex >= 0 ? currentWeekIndex : feedWeeks.length > 0 ? 0 : -1;

  function moveCurrentWeek(targetIndex: number) {
    if (feedWeeks.length === 0) return;
    const targetWeek = feedWeeks[Math.min(targetIndex, feedWeeks.length - 1)];
    if (!targetWeek) return;
    setCurrentWeekOverrides((current) => {
      const next = { ...current, [socialFilter]: targetWeek };
      window.localStorage.setItem(
        "blyndtek-marca-current-week",
        JSON.stringify(next),
      );
      return next;
    });
  }

  function handleWeekMarkerDragOver(event: React.DragEvent<HTMLElement>) {
    if (!draggingWeekMarker) return;
    event.preventDefault();
    const edge = 120;
    const speed = 18;
    if (event.clientY < edge)
      window.scrollBy({ top: -speed, behavior: "auto" });
    if (event.clientY > window.innerHeight - edge)
      window.scrollBy({ top: speed, behavior: "auto" });
  }

  function handleCreateWeek(afterWeek?: string) {
    const suggested = afterWeek
      ? new Date(
          new Date(`${afterWeek}T12:00:00`).getTime() - 7 * 24 * 60 * 60 * 1000,
        )
      : startOfWeek(new Date());
    const value = window.prompt(
      "Inicio de la semana (AAAA-MM-DD)",
      weekKey(suggested),
    );
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const normalized = weekKey(new Date(`${value}T12:00:00`));
    setManualWeeks((current) => {
      const next = {
        ...current,
        [socialFilter]: Array.from(
          new Set([...(current[socialFilter] ?? []), normalized]),
        ),
      };
      window.localStorage.setItem(
        "blyndtek-marca-feed-weeks",
        JSON.stringify(next),
      );
      return next;
    });
  }
  async function handleCreate(
    platform: "instagram_feed" | "instagram_story" | "linkedin_post",
  ) {
    const created = await createPieza({
      plataforma: platform,
      tipo_pieza: platform === "instagram_story" ? "historia" : null,
      titulo:
        platform === "instagram_story" ? "Nueva historia" : "Nueva publicación",
    });
    await load();
    setSelected(created);
  }

  async function handleCreateFromTimeline(canal: CanalContenido, date: Date) {
    const created = await createPieza({
      plataforma: canal.plataforma,
      tipo_pieza: canal.plataforma === "instagram_story" ? "historia" : null,
      titulo: "Nueva pieza",
      fecha_programada: `${date.toISOString().slice(0, 10)}T09:00`,
    });
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
    const sourceDate =
      feedSlots.find((slot) => slot.slot_orden === from)?.fecha_programada ??
      ordered[from]?.fecha_programada ??
      null;
    const targetDate =
      feedSlots.find((slot) => slot.slot_orden === to)?.fecha_programada ??
      ordered[to]?.fecha_programada ??
      null;
    await Promise.all(
      ordered.map((item, index) =>
        updatePieza(item.id, {
          feed_orden: index,
          ...(item.id === moved.id
            ? {
                fecha_programada: targetDate,
                estado: targetDate ? "programada" : item.estado,
              }
            : item.id === target.id
              ? {
                  fecha_programada: sourceDate,
                  estado: sourceDate ? "programada" : item.estado,
                }
              : {}),
        }),
      ),
    );
    setDraggedPieza(null);
    await load();
  }

  async function handleTogglePin(pieza: PiezaContenido) {
    if (
      !pieza.feed_pineado &&
      feedPieces.filter((item) => item.feed_pineado).length >= 3
    ) {
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
      await saveIdentidadSecciones(
        sections.map(({ clave, titulo, contenido }) => ({
          clave,
          titulo,
          contenido,
        })),
      );
      setSavingIdentity("saved");
    } catch {
      setSavingIdentity("idle");
    }
  }

  async function connect(red: "instagram" | "linkedin") {
    const name = window.prompt(
      `Nombre de la cuenta de ${red === "instagram" ? "Instagram" : "LinkedIn"}`,
    );
    if (!name) return;
    setConnecting(red);
    try {
      await createIntegracionSocial({ red, nombre_cuenta: name });
      await load();
    } finally {
      setConnecting(null);
    }
  }

  if (loading)
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-md bg-slate-100" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="aspect-square animate-pulse rounded-md bg-slate-100"
            />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      {initialTab ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap gap-1">
            {(
              ["feed", "historias", "calendario", "identidad"] as StudioTab[]
            ).map((item) => {
              const labels = {
                feed: "Feed",
                historias: "Historias",
                calendario: "Calendario",
                identidad: "Identidad de marca",
              };
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-label transition-colors duration-fast",
                    tab === item
                      ? "bg-signal text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {labels[item]}
                </button>
              );
            })}
          </div>
          {tab === "historias" ? (
            <Button
              size="sm"
              onClick={() => void handleCreate("instagram_story")}
            >
              <PlusIcon size={16} /> Nueva historia
            </Button>
          ) : null}
        </div>
      )}

      {tab === "feed" ? (
        <section className="mx-auto max-w-4xl space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line-soft bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <InstagramIcon size={18} className="text-signal" />
                <h2 className="font-title text-xl text-carbon">
                  Instagram de Blyndtek
                </h2>
              </div>
              <p className="mt-1 text-sm text-graphite">
                Planificá el próximo feed y comparalo con lo que realmente está
                publicado.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant={
                    instagramFeed?.capability.connected ? "success" : "warning"
                  }
                >
                  {instagramFeed?.capability.connected
                    ? "Cuenta conectada"
                    : "Sin conexión"}
                </Badge>
                <Badge
                  variant={
                    instagramFeed?.capability.canPublish ? "success" : "warning"
                  }
                >
                  {instagramFeed?.capability.canPublish
                    ? "Publicación automática habilitada"
                    : "Falta permiso de publicación"}
                </Badge>
                {instagramFeed?.connection?.last_sync_at ? (
                  <span className="text-xs text-graphite">
                    Actualizado{" "}
                    {formatDate(instagramFeed.connection.last_sync_at)}
                  </span>
                ) : null}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => void handleCreate("instagram_feed")}
            >
              <PlusIcon size={16} /> Nueva publicación
            </Button>
          </div>
          <div className="inline-flex rounded-md border border-line-soft bg-paper p-1">
            <button
              type="button"
              onClick={() => setFeedView("planner")}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-label",
                feedView === "planner"
                  ? "bg-white text-carbon shadow-sm"
                  : "text-graphite",
              )}
            >
              Planificación
            </button>
            <button
              type="button"
              onClick={() => setFeedView("published")}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-label",
                feedView === "published"
                  ? "bg-white text-carbon shadow-sm"
                  : "text-graphite",
              )}
            >
              Feed publicado
            </button>
          </div>
          {feedView === "planner" ? (
            <div className="space-y-0">
              {pinnedFeedPieces.length > 0 ? (
                <div className="grid grid-cols-3 gap-4 rounded-md bg-white p-2">
                  {pinnedFeedPieces.map((pieza) => (
                    <div className="relative z-10" key={pieza.id}>
                      <StudioTile
                        ratio="portrait"
                        pieza={pieza}
                        onOpen={setSelected}
                        onDelete={handleDelete}
                        onWorkspace={setWorkspacePieza}
                        onDragStart={setDraggedPieza}
                        onDrop={(target) =>
                          void (draggedPieza
                            ? handleReorder(target)
                            : handleTogglePin(target))
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {feedWeeks.map((week, weekIndex) => (
                <div key={week}>
                  <div
                    className={cn(
                      "relative grid grid-cols-3 gap-4 overflow-visible rounded-md p-2 transition-colors",
                      displayCurrentWeekIndex === weekIndex && "bg-amber-50/60",
                    )}
                    onDragOver={handleWeekMarkerDragOver}
                    onDrop={() => {
                      if (draggingWeekMarker) {
                        moveCurrentWeek(weekIndex);
                        setDraggingWeekMarker(false);
                      }
                    }}
                  >
                    {displayCurrentWeekIndex === weekIndex ? (
                      <div
                        draggable
                        onDragStart={() => setDraggingWeekMarker(true)}
                        onDragEnd={() => setDraggingWeekMarker(false)}
                        className={cn(
                          "group absolute -left-5 inset-y-0 z-20 flex w-4 cursor-grab items-center justify-center",
                          draggingWeekMarker && "opacity-40",
                        )}
                        title="Arrastrá para elegir la semana actual"
                      >
                        <div className="h-full w-1 rounded-full bg-amber-400" />
                        <span className="absolute top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-amber-500 shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </span>
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-pill bg-amber-100 px-2 py-0.5 text-[10px] font-label text-amber-900 opacity-0 transition-opacity group-hover:opacity-100">
                          Semana actual
                        </span>
                      </div>
                    ) : null}
                    {[0, 1, 2].map((slotIndex) => {
                      const pieza = feedPiecesByWeek.get(week)?.[slotIndex];
                      return pieza ? (
                        <div className="relative z-10" key={pieza.id}>
                          <StudioTile
                            ratio="portrait"
                            pieza={pieza}
                            onOpen={setSelected}
                            onDelete={handleDelete}
                            onWorkspace={setWorkspacePieza}
                            onDragStart={setDraggedPieza}
                            onDrop={(target) =>
                              void (draggedPieza
                                ? handleReorder(target)
                                : handleTogglePin(target))
                            }
                          />
                        </div>
                      ) : (
                        <button
                          className="relative z-10 flex aspect-[4/5] items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-colors hover:border-signal hover:bg-signal-light/30 hover:text-signal"
                          key={`${week}-empty-${slotIndex}`}
                          type="button"
                          onClick={() => void handleCreate(activeFeedPlatform)}
                          aria-label={`Agregar publicación ${slotIndex + 1}`}
                        >
                          <PlusIcon size={28} />
                        </button>
                      );
                    })}
                  </div>
                  {weekIndex < feedWeeks.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        handleCreateWeek(
                          week.startsWith("sin-fecha") ? undefined : week,
                        )
                      }
                      className="group flex h-4 w-full items-center justify-center"
                      aria-label="Crear semana entre filas"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-signal">
                        <PlusIcon size={14} />
                      </span>
                    </button>
                  ) : null}
                </div>
              ))}
              {feedWeeks.length > 0 ? (
                <div
                  onDragOver={handleWeekMarkerDragOver}
                  onDrop={() => {
                    if (draggingWeekMarker) {
                      moveCurrentWeek(feedWeeks.length - 1);
                      setDraggingWeekMarker(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleCreateWeek(
                        feedWeeks.at(-1)?.startsWith("sin-fecha")
                          ? undefined
                          : feedWeeks.at(-1),
                      )
                    }
                    className="group flex h-4 w-full items-center justify-center"
                    aria-label="Crear nueva semana"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-signal">
                      <PlusIcon size={14} />
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCreateWeek()}
                  className="group flex h-14 w-full items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-signal hover:text-signal"
                  aria-label="Crear primera semana"
                >
                  <PlusIcon size={24} />
                </button>
              )}
            </div>
          ) : instagramFeed?.media.length ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {instagramFeed.media.map((media) => (
                <a
                  key={media.id}
                  href={media.permalink || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-md border border-line-soft bg-paper"
                >
                  {media.thumbnail_url || media.media_url ? (
                    <img
                      src={media.thumbnail_url || media.media_url || ""}
                      alt={media.caption || "Publicación de Instagram"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-graphite">
                      <ImageIcon size={28} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-carbon/90 to-transparent px-3 pb-3 pt-10 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="line-clamp-2 text-xs">
                      {media.caption ||
                        media.media_product_type ||
                        "Publicación"}
                    </p>
                    <p className="mt-1 text-[10px] text-white/80">
                      ♥ {media.like_count || 0} · {media.comments_count || 0}{" "}
                      comentarios
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={InstagramIcon}
              titulo="El feed real todavía no está disponible"
              descripcion="Sincronizá Instagram desde Marketing o completá los permisos pendientes para traer las publicaciones reales."
            />
          )}
        </section>
      ) : null}

      {tab === "historias" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-label text-signal">
                Laboratorio vertical
              </p>
              <h2 className="font-title text-xl text-carbon">
                Historias listas para ejecutar
              </h2>
              <p className="mt-1 text-sm text-graphite">
                Organizá secuencias, textos y horarios de historias desde un
                único lugar.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => void handleCreate("instagram_story")}
            >
              <PlusIcon size={16} /> Nueva historia
            </Button>
          </div>
          {storyPieces.length === 0 ? (
            <EmptyState
              icon={StoriesIcon}
              titulo="Todavía no hay historias"
              descripcion="Creá una historia para empezar a armar la secuencia de Instagram."
              accion={{
                label: "Crear historia",
                onClick: () => void handleCreate("instagram_story"),
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {storyPieces.map((pieza) => (
                <div key={pieza.id} className="aspect-[9/16]">
                  <StudioTile
                    pieza={pieza}
                    onOpen={setSelected}
                    onDelete={handleDelete}
                    onWorkspace={setWorkspacePieza}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "calendario" ? (
        <MarcaContenidoTimeline
          canales={canales}
          piezas={piezas}
          feedSlots={feedSlots}
          onOpen={setSelected}
          onCreate={(canal, date) => void handleCreateFromTimeline(canal, date)}
          onAddChannel={() => void handleAddChannel()}
        />
      ) : null}

      {tab === "identidad" ? (
        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Card padding="md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-label text-signal">Manual vivo</p>
                <h2 className="font-title text-xl text-carbon">
                  Identidad de Blyndtek
                </h2>
                <p className="mt-1 text-sm text-graphite">
                  Un documento editable para que todas las publicaciones hablen
                  con la misma voz.
                </p>
              </div>
              <SavingIndicator estado={savingIdentity} />
            </div>
            <div className="mt-5 space-y-4">
              {sections.map((section) => (
                <label key={section.clave} className="block">
                  <span className="mb-1 block text-sm font-label text-carbon">
                    {section.titulo}
                  </span>
                  <textarea
                    value={section.contenido}
                    onChange={(event) =>
                      setSections((current) =>
                        current.some((item) => item.clave === section.clave)
                          ? current.map((item) =>
                              item.clave === section.clave
                                ? { ...item, contenido: event.target.value }
                                : item,
                            )
                          : [
                              ...current,
                              { ...section, contenido: event.target.value },
                            ],
                      )
                    }
                    placeholder="Definí este aspecto de la marca..."
                    className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-carbon outline-none focus:border-signal focus:ring-2 focus:ring-signal/20"
                  />
                </label>
              ))}
            </div>
            <Button className="mt-5" onClick={() => void saveIdentity()}>
              Guardar identidad
            </Button>
          </Card>
          <Card padding="md">
            <p className="text-sm font-label text-signal">Canales</p>
            <h3 className="mt-1 font-title text-lg text-carbon">
              Publicación directa
            </h3>
            <p className="mt-2 text-sm leading-6 text-graphite">
              Instagram usa la conexión central de Marketing. Sólo las piezas
              aprobadas y programadas se publican automáticamente.
            </p>
            <div className="mt-5 space-y-3">
              {(["instagram", "linkedin"] as const).map((red) => {
                const connected = integraciones.find(
                  (item) => item.red === red && item.activa,
                );
                const instagramConnected =
                  red === "instagram" && instagramFeed?.capability.connected;
                return (
                  <div
                    key={red}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3"
                  >
                    <span className="flex items-center gap-2 text-sm font-label text-carbon">
                      {red === "instagram" ? (
                        <InstagramIcon size={18} />
                      ) : (
                        <LinkedinIcon size={18} />
                      )}
                      {red === "instagram"
                        ? "Instagram profesional"
                        : (connected?.nombre_cuenta ?? "LinkedIn")}
                    </span>
                    {red === "instagram" ? (
                      <Badge
                        variant={instagramConnected ? "success" : "warning"}
                      >
                        {instagramConnected
                          ? "Conectado"
                          : "Revisar en Marketing"}
                      </Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={connecting === red}
                        onClick={() => void connect(red)}
                      >
                        {connected ? "Editar" : "Conectar"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      ) : null}

      <PiezaEditorModal
        simple
        isOpen={Boolean(selected)}
        pieza={selected}
        pilares={pilares}
        onClose={() => setSelected(null)}
        onSave={handleSave}
        onUploadImage={async (id, file, index) => {
          const saved = await subirImagenPieza(id, file, index);
          setSelected(saved);
          await load();
        }}
        onGenerateComplete={async (id) => {
          const result = await generarCompletoPieza(id);
          await load();
          return result;
        }}
        onPublish={async (id, red) => {
          await publicarPieza(id, red);
          await load();
        }}
      />
      <PiezaWorkspaceModal
        pieza={workspacePieza}
        isOpen={Boolean(workspacePieza)}
        onClose={() => setWorkspacePieza(null)}
        onSave={handleWorkspaceSave}
      />
    </div>
  );
}
