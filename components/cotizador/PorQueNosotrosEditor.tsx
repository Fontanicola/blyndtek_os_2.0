"use client";

import { Button, Card, Input } from "@/components/ui";
import type { DiferenciadorBlyndtek } from "@/types/cotizaciones";

type PorQueNosotrosEditorProps = {
  items: DiferenciadorBlyndtek[];
  onChange: (items: DiferenciadorBlyndtek[]) => void;
};

function createEmptyItem(): DiferenciadorBlyndtek {
  return { titulo: "", descripcion: "" };
}

export function PorQueNosotrosEditor({ items, onChange }: PorQueNosotrosEditorProps) {
  const currentItems = items ?? [];

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-title text-carbon">Por qué Blyndtek</h2>
          <p className="mt-1 text-sm text-graphite">
            Diferenciadores que justifican por qué el cliente debería elegir trabajar con nosotros.
          </p>
        </div>

        <Button variant="secondary" onClick={() => onChange([...currentItems, createEmptyItem()])}>
          Agregar punto
        </Button>
      </div>

      {currentItems.length > 0 ? (
        <div className="space-y-4">
          {currentItems.map((item, index) => (
            <div key={`${item.titulo}-${index}`} className="space-y-3 rounded-card bg-paper p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
                  Punto {String(index + 1).padStart(2, "0")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange(currentItems.filter((_entry, entryIndex) => entryIndex !== index))
                  }
                >
                  Eliminar
                </Button>
              </div>

              <Input
                label="Título"
                value={item.titulo}
                onChange={(event) => {
                  const next = [...currentItems];
                  next[index] = { ...item, titulo: event.target.value };
                  onChange(next);
                }}
              />

              <div className="space-y-1">
                <label className="block text-sm font-label text-carbon">Descripción</label>
                <textarea
                  value={item.descripcion}
                  onChange={(event) => {
                    const next = [...currentItems];
                    next[index] = { ...item, descripcion: event.target.value };
                    onChange(next);
                  }}
                  className="min-h-[110px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  placeholder="Explicá por qué esto diferencia a Blyndtek."
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card padding="md" className="border border-dashed border-line-soft bg-paper">
          <p className="text-sm text-graphite">
            Agregá los diferenciales que hacen a Blyndtek una opción distinta para el cliente.
          </p>
        </Card>
      )}
    </Card>
  );
}
