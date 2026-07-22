"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { CheckIcon, FileTextIcon, LinkIcon, SparklesIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { fetchPlanSemanal, generarPlanSemanal } from "@/lib/hooks/useContenido";
import { formatearFechaDisplay } from "@/lib/utils/fechas";
import type { JsonValue, PiezaContenido } from "@/types/contenido";
import type { PlanSemanalContenido } from "@/lib/hooks/useContenido";

type FeedGuion = {
  tipo?: string;
  rubro?: string;
  texto_principal?: string;
  slides?: Array<{
    titulo_slide?: string;
    texto?: string;
  }>;
};

type ReelGuion = {
  hook?: string;
  puntos?: string[];
  cta?: string;
  duracion_sugerida_seg?: number;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function getCurrentWeekStart() {
  const today = new Date();
  const dayOffset = (today.getDay() + 6) % 7;
  today.setDate(today.getDate() - dayOffset);
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function asRecord(value: JsonValue | null): Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function asFeedGuion(value: JsonValue | null): FeedGuion {
  return asRecord(value) as FeedGuion;
}

function asReelGuion(value: JsonValue | null): ReelGuion {
  return asRecord(value) as ReelGuion;
}

function asStories(value: JsonValue | null) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function getFeedTypeLabel(tipo?: string) {
  if (tipo === "post_noticia") return "Noticia";
  if (tipo === "post_caso_uso") return "Caso de uso";
  if (tipo === "post_dato_rapido") return "Dato rápido";
  return "Feed";
}

function FeedPostCard({ pieza }: { pieza: PiezaContenido }) {
  const guion = asFeedGuion(pieza.guion);
  const primerSlide = guion.slides?.[0];

  return (
    <Card className="space-y-3" padding="md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="signal">{getFeedTypeLabel(guion.tipo)}</Badge>
          {guion.rubro ? <Badge variant="ghost" className="ml-2">{guion.rubro}</Badge> : null}
        </div>
        <FileTextIcon size={18} className="text-graphite" />
      </div>
      <div>
        <h3 className="font-title text-lg text-carbon">{pieza.titulo}</h3>
        {primerSlide ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-graphite">
            {primerSlide.titulo_slide ? `${primerSlide.titulo_slide}: ` : ""}
            {primerSlide.texto}
          </p>
        ) : null}
        {guion.texto_principal ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-graphite">{guion.texto_principal}</p>
        ) : null}
      </div>
      {pieza.caption ? <p className="line-clamp-3 text-sm leading-relaxed text-carbon">{pieza.caption}</p> : null}
      {pieza.hashtags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {pieza.hashtags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-xs font-label text-signal">{tag}</span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function ReelCard({ pieza }: { pieza: PiezaContenido }) {
  const guion = asReelGuion(pieza.guion);

  return (
    <Card className="space-y-4" padding="md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="success">Reel listo</Badge>
          <h3 className="mt-3 font-title text-xl text-carbon">{pieza.titulo}</h3>
        </div>
        <SparklesIcon size={20} className="text-signal" />
      </div>
      {guion.hook ? (
        <div>
          <p className="text-xs font-label text-graphite">Hook</p>
          <p className="mt-1 text-base font-label text-carbon">{guion.hook}</p>
        </div>
      ) : null}
      {Array.isArray(guion.puntos) && guion.puntos.length > 0 ? (
        <div>
          <p className="text-xs font-label text-graphite">Puntos</p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-graphite">
            {guion.puntos.map((punto) => (
              <li key={punto} className="flex gap-2">
                <CheckIcon size={15} className="mt-0.5 shrink-0 text-success" />
                <span>{punto}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {guion.cta ? (
          <div className="rounded-component border border-line-soft bg-paper p-3">
            <p className="text-xs font-label text-graphite">Cierre</p>
            <p className="mt-1 text-sm text-carbon">{guion.cta}</p>
          </div>
        ) : null}
        <div className="rounded-component border border-line-soft bg-paper p-3">
          <p className="text-xs font-label text-graphite">Duración sugerida</p>
          <p className="mt-1 text-sm text-carbon">{guion.duracion_sugerida_seg ?? 30} segundos</p>
        </div>
      </div>
    </Card>
  );
}

function StoriesCard({ pieza }: { pieza: PiezaContenido }) {
  const ideas = asStories(pieza.guion);
  const [done, setDone] = useState<Record<string, boolean>>({});

  return (
    <Card className="space-y-4" padding="md">
      <div>
        <Badge variant="warning">Historias</Badge>
        <h3 className="mt-3 font-title text-xl text-carbon">Ideas para amplificar la semana</h3>
      </div>
      <ol className="space-y-3">
        {ideas.map((idea, index) => {
          const id = `${index}-${idea}`;
          const checked = Boolean(done[id]);

          return (
            <li key={id} className="flex items-start gap-3 rounded-component border border-line-soft bg-white p-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setDone((current) => ({ ...current, [id]: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-line text-signal focus:ring-signal"
              />
              <span className={cn("text-sm leading-relaxed text-carbon", checked && "text-graphite line-through")}>
                {index + 1}. {idea}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function PlanSemanalView() {
  const semanaInicio = useMemo(() => getCurrentWeekStart(), []);
  const [data, setData] = useState<PlanSemanalContenido | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPlanSemanal(semanaInicio));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "No se pudo cargar el plan semanal.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [semanaInicio]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const generated = await generarPlanSemanal({ semana_inicio: semanaInicio });
      setData({
        plan: generated.plan,
        piezas: generated.piezas
      });
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : "No se pudo generar el plan semanal.";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  const feedPosts = data?.piezas.filter((pieza) => pieza.plataforma === "instagram_feed") ?? [];
  const reel = data?.piezas.find((pieza) => pieza.plataforma === "instagram_reel") ?? null;
  const stories = data?.piezas.find((pieza) => pieza.plataforma === "instagram_story") ?? null;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4" padding="lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-title text-2xl text-carbon">Plan semanal</h2>
            <p className="mt-1 text-sm text-graphite">
              Semana del {formatearFechaDisplay(semanaInicio)}. Un hilo de contenido conectado para Blyndtek.
            </p>
          </div>
          <Button onClick={() => void handleGenerate()} loading={generating}>
            <SparklesIcon size={16} />
            Generar plan de esta semana
          </Button>
        </div>

        {error ? <div className="rounded-component bg-danger-light p-3 text-sm text-danger">{error}</div> : null}

        {data ? (
          <div className="rounded-card border border-line-soft bg-paper p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Badge variant="signal">Tema general</Badge>
                <h3 className="mt-3 font-title text-xl text-carbon">{data.plan.tema_general}</h3>
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-graphite">{data.plan.noticia_fuente}</p>
              </div>
              <a
                href={data.plan.noticia_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-pill border border-line-soft bg-white px-3 py-2 text-sm font-label text-signal transition-colors duration-fast ease-fast hover:bg-signal-light"
              >
                Ver fuente
                <LinkIcon size={15} />
              </a>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={SparklesIcon}
            titulo="Todavía no hay plan para esta semana"
            descripcion="Generalo con un click: Claude investiga una noticia real y arma el hilo completo."
            accion={{ label: "Generar plan", onClick: () => void handleGenerate() }}
          />
        )}
      </Card>

      {data ? (
        <div className="space-y-5">
          <section className="space-y-3">
            <div>
              <h3 className="font-title text-xl text-carbon">Posts de feed</h3>
              <p className="mt-1 text-sm text-graphite">Tres piezas en estado idea, listas para pasar a diseño visual.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {feedPosts.map((pieza) => (
                <FeedPostCard key={pieza.id} pieza={pieza} />
              ))}
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
            {reel ? <ReelCard pieza={reel} /> : null}
            {stories ? <StoriesCard pieza={stories} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
