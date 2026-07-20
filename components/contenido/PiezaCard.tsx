"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckIcon, ImageIcon, LayersIcon, MoreVerticalIcon, RefreshIcon, SparklesIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { PiezaContenido, PiezaContenidoTipo } from "@/types/contenido";
import { getPilarDotClass, PIEZA_ESTADO_BADGES, PIEZA_ESTADO_LABELS } from "@/components/contenido/contenidoStyles";

type PiezaCardProps = {
  pieza: PiezaContenido;
  onEdit: (pieza: PiezaContenido) => void;
  onDelete: (pieza: PiezaContenido) => void;
  onGenerate?: (pieza: PiezaContenido) => void;
  onApprove?: (pieza: PiezaContenido) => void;
  onRegenerate?: (pieza: PiezaContenido) => void;
  actionLoading?: boolean;
};

type PiezaTipoVisual = {
  label: string;
  className: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getPiezaTipoVisual(pieza: PiezaContenido): PiezaTipoVisual {
  if (pieza.plataforma === "instagram_reel") {
    return { label: "Reel", className: "bg-signal-light text-signal" };
  }

  if (pieza.plataforma === "instagram_story") {
    return { label: "Historia", className: "bg-warning-light text-warning" };
  }

  const guion = asRecord(pieza.guion);
  const slides = Array.isArray(guion.slides) ? guion.slides : [];

  if (pieza.plataforma === "instagram_feed" && slides.length > 1) {
    return { label: "Carrusel", className: "bg-success-light text-success" };
  }

  return { label: "Post", className: "bg-paper text-graphite" };
}

const TIPO_PIEZA_VISUAL: Record<Exclude<PiezaContenidoTipo, null>, PiezaTipoVisual> = {
  noticia: { label: "Noticia", className: "bg-signal-light text-signal" },
  caso_uso: { label: "Caso de uso", className: "bg-warning-light text-warning" },
  dato_rapido: { label: "Dato rápido", className: "bg-success-light text-success" },
  reel: { label: "Reel", className: "bg-danger-light text-danger" },
  historia: { label: "Historia", className: "bg-paper text-graphite" }
};

function getTipoContenidoVisual(tipo: PiezaContenidoTipo): PiezaTipoVisual | null {
  return tipo ? TIPO_PIEZA_VISUAL[tipo] ?? null : null;
}

export function getPiezaImageUrl(pieza: Pick<PiezaContenido, "id" | "storage_path">) {
  if (!pieza.storage_path) {
    return null;
  }

  return `/api/piezas-contenido/${pieza.id}/imagen/${encodeURIComponent(pieza.storage_path)}`;
}

export function getPiezaImagePathUrl(piezaId: string, storagePath: string) {
  return `/api/piezas-contenido/${piezaId}/imagen/${encodeURIComponent(storagePath)}`;
}

export function PiezaCard({
  pieza,
  onEdit,
  onDelete,
  onGenerate,
  onApprove,
  onRegenerate,
  actionLoading = false
}: PiezaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const imageUrl = getPiezaImageUrl(pieza);
  const generatedImages = Array.isArray(pieza.imagenes_generadas) ? pieza.imagenes_generadas : [];
  const tipoVisual = getPiezaTipoVisual(pieza);
  const tipoContenidoVisual = getTipoContenidoVisual(pieza.tipo_pieza);
  const showGenerate = pieza.estado === "idea" && Boolean(onGenerate);
  const showReviewActions = pieza.estado === "en_diseno" && Boolean(onApprove && onRegenerate);

  return (
    <Card className="group overflow-hidden border border-line-soft" padding="none">
      <div className="relative aspect-[4/3] bg-paper">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={pieza.titulo} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-graphite">
            <ImageIcon size={34} />
          </div>
        )}

        {generatedImages.length > 1 ? (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill border border-line-soft bg-white/90 px-2.5 py-1 text-xs font-label text-carbon shadow-subtle">
            <LayersIcon size={14} />
            1/{generatedImages.length}
          </div>
        ) : null}

        <div
          className={cn(
            "absolute right-14 top-3 inline-flex h-6 items-center justify-center rounded-pill px-2.5 text-xs font-label leading-none shadow-subtle",
            tipoVisual.className
          )}
        >
          {tipoVisual.label}
        </div>

        <div className="absolute right-3 top-3">
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMenuOpen((current) => !current)}
              className="h-8 w-8 rounded-full bg-white/90 px-0 py-0"
            >
              <MoreVerticalIcon size={16} />
            </Button>

            {menuOpen ? (
              <div className="absolute right-0 top-full z-10 mt-2 w-36 overflow-hidden rounded-card border border-line-soft bg-white shadow-modal">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(pieza);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(pieza);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
                >
                  Eliminar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 font-title text-lg text-carbon">{pieza.titulo}</h3>
          <p className="mt-1 text-xs text-graphite">{pieza.plataforma.replace("_", " ")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tipoContenidoVisual ? (
            <Badge className={tipoContenidoVisual.className}>{tipoContenidoVisual.label}</Badge>
          ) : null}
          {pieza.pilar ? (
            <Badge variant="ghost" className="gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", getPilarDotClass(pieza.pilar.color))} />
              {pieza.pilar.nombre}
            </Badge>
          ) : (
            <Badge variant="ghost">Sin pilar</Badge>
          )}
          <Badge variant={PIEZA_ESTADO_BADGES[pieza.estado]}>{PIEZA_ESTADO_LABELS[pieza.estado]}</Badge>
        </div>

        {showGenerate ? (
          <Button
            size="sm"
            className="w-full"
            loading={actionLoading}
            onClick={() => onGenerate?.(pieza)}
          >
            <SparklesIcon size={16} />
            Generar
          </Button>
        ) : null}

        {showReviewActions ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              loading={actionLoading}
              onClick={() => onApprove?.(pieza)}
              className="bg-success text-white hover:bg-success/90 focus-visible:ring-success/20"
            >
              <CheckIcon size={16} />
              Aprobar
            </Button>
            <Button size="sm" variant="secondary" loading={actionLoading} onClick={() => onRegenerate?.(pieza)}>
              <RefreshIcon size={16} />
              Regenerar
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
