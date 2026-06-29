"use client";

import { Button, Card, Input } from "@/components/ui";
import type { Modulo } from "@/types/cotizaciones";

type ModuloCardProps = {
  index: number;
  modulo: Modulo;
  onChange: (modulo: Modulo) => void;
  onRemove: () => void;
};

export function ModuloCard({ index, modulo, onChange, onRemove }: ModuloCardProps) {
  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
            Módulo {String(index + 1).padStart(2, "0")}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Eliminar
        </Button>
      </div>

      <Input
        label="Nombre"
        value={modulo.nombre}
        onChange={(event) =>
          onChange({
            ...modulo,
            nombre: event.target.value
          })
        }
      />

      <div className="space-y-1">
        <label className="block text-sm font-label text-carbon">Descripción</label>
        <textarea
          value={modulo.descripcion}
          onChange={(event) =>
            onChange({
              ...modulo,
              descripcion: event.target.value
            })
          }
          className="min-h-[110px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-label text-carbon">
          Features incluidas
        </label>
        <textarea
          value={modulo.features.join("\n")}
          onChange={(event) =>
            onChange({
              ...modulo,
              features: event.target.value
                .split("\n")
                .map((feature) => feature.trim())
                .filter(Boolean)
            })
          }
          placeholder="Una feature por línea"
          className="min-h-[140px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
        />
      </div>
    </Card>
  );
}
