"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ImageIcon, MoreVerticalIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { PiezaContenido } from "@/types/contenido";
import { getPilarDotClass, PIEZA_ESTADO_BADGES, PIEZA_ESTADO_LABELS } from "@/components/contenido/contenidoStyles";

type PiezaCardProps = {
  pieza: PiezaContenido;
  onEdit: (pieza: PiezaContenido) => void;
  onDelete: (pieza: PiezaContenido) => void;
};

export function getPiezaImageUrl(pieza: Pick<PiezaContenido, "id" | "storage_path">) {
  if (!pieza.storage_path) {
    return null;
  }

  return `/api/piezas-contenido/${pieza.id}/imagen/${encodeURIComponent(pieza.storage_path)}`;
}

export function PiezaCard({ pieza, onEdit, onDelete }: PiezaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const imageUrl = getPiezaImageUrl(pieza);

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
      </div>
    </Card>
  );
}
