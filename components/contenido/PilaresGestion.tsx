"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TrashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createPilar, deletePilar, updatePilar } from "@/lib/hooks/useContenido";
import type { PilarContenido } from "@/types/contenido";
import { getPilarDotClass, PILAR_COLOR_OPTIONS } from "@/components/contenido/contenidoStyles";

type PilaresGestionProps = {
  pilares: PilarContenido[];
  onChange: () => void;
};

export function PilaresGestion({ pilares, onChange }: PilaresGestionProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState("signal");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!nombre.trim()) {
      return;
    }

    setLoading(true);
    try {
      await createPilar({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, color });
      setNombre("");
      setDescripcion("");
      setColor("signal");
      onChange();
    } finally {
      setLoading(false);
    }
  }

  async function handleColorChange(pilar: PilarContenido, nextColor: string) {
    await updatePilar(pilar.id, { color: nextColor });
    onChange();
  }

  async function handleDelete(id: string) {
    await deletePilar(id);
    onChange();
  }

  return (
    <Card className="space-y-5" padding="lg">
      <div>
        <h2 className="font-title text-2xl text-carbon">Pilares de contenido</h2>
        <p className="mt-1 text-sm text-graphite">Temas base para ordenar ideas, captions y diseños.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <Input label="Nuevo pilar" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej: Sistemas que venden" />
        <Input label="Descripción" value={descripcion} onChange={(event) => setDescripcion(event.target.value)} placeholder="Idea corta del pilar" />
        <div>
          <span className="mb-1 block text-sm font-label text-carbon">Color</span>
          <div className="flex h-[42px] items-center gap-2">
            {PILAR_COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.label}
                onClick={() => setColor(option.value)}
                className={cn(
                  "h-7 w-7 rounded-full border border-line-soft transition-transform duration-fast ease-fast hover:scale-105",
                  option.className,
                  color === option.value && "ring-2 ring-signal/25"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <Button onClick={() => void handleCreate()} loading={loading} disabled={!nombre.trim()} className="w-full sm:w-auto">
        Crear pilar
      </Button>

      <div className="flex flex-wrap gap-2">
        {pilares.length > 0 ? (
          pilares.map((pilar) => (
            <div key={pilar.id} className="flex items-center gap-2 rounded-pill border border-line-soft bg-white px-3 py-2 shadow-soft">
              <span className={cn("h-2.5 w-2.5 rounded-full", getPilarDotClass(pilar.color))} />
              <span className="max-w-[14rem] truncate text-sm font-label text-carbon">{pilar.nombre}</span>
              <div className="flex items-center gap-1">
                {PILAR_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    onClick={() => void handleColorChange(pilar, option.value)}
                    className={cn(
                      "h-4 w-4 rounded-full border border-line-soft",
                      option.className,
                      pilar.color === option.value && "ring-2 ring-signal/25"
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(pilar.id)}
                className="text-graphite transition-colors duration-fast ease-fast hover:text-danger"
                aria-label={`Eliminar ${pilar.nombre}`}
              >
                <TrashIcon size={15} />
              </button>
            </div>
          ))
        ) : (
          <Badge variant="ghost">Todavía no hay pilares</Badge>
        )}
      </div>
    </Card>
  );
}
