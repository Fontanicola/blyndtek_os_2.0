"use client";

import { Button, Card, Input } from "@/components/ui";
import type { MantenimientoDetalle } from "@/types/cotizaciones";

type MantenimientoDetalleEditorProps = {
  value: MantenimientoDetalle | null;
  onChange: (value: MantenimientoDetalle | null) => void;
};

function createEmptyCategoria() {
  return { categoria: "", items: [""] };
}

function splitItems(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MantenimientoDetalleEditor({ value, onChange }: MantenimientoDetalleEditorProps) {
  const detalle = value ?? { incluye: [], no_incluye: [] };
  const categorias = detalle.incluye ?? [];
  const noIncluye = detalle.no_incluye ?? [];

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-title text-carbon">Detalle de mantenimiento</h2>
          <p className="mt-1 text-sm text-graphite">
            Detallá qué cubre el abono mensual y qué queda fuera del alcance recurrente.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() =>
            onChange({
              incluye: [...categorias, createEmptyCategoria()],
              no_incluye: [...noIncluye]
            })
          }
        >
          Agregar categoría
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm font-title text-carbon">Incluye</p>
          {categorias.length > 0 ? (
            <div className="space-y-4">
              {categorias.map((categoria, index) => (
                <div key={`${categoria.categoria}-${index}`} className="space-y-3 rounded-card bg-paper p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
                      Categoría {String(index + 1).padStart(2, "0")}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onChange({
                          incluye: categorias.filter((_item, itemIndex) => itemIndex !== index),
                          no_incluye: [...noIncluye]
                        });
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>

                  <Input
                    label="Categoría"
                    value={categoria.categoria}
                    onChange={(event) => {
                      const next = [...categorias];
                      next[index] = {
                        ...categoria,
                        categoria: event.target.value
                      };
                      onChange({ incluye: next, no_incluye: [...noIncluye] });
                    }}
                  />

                  <div className="space-y-1">
                    <label className="block text-sm font-label text-carbon">Items</label>
                    <textarea
                      value={categoria.items.join("\n")}
                      onChange={(event) => {
                        const next = [...categorias];
                        next[index] = {
                          ...categoria,
                          items: splitItems(event.target.value)
                        };
                        onChange({ incluye: next, no_incluye: [...noIncluye] });
                      }}
                      placeholder="Un item por línea"
                      className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card padding="md" className="border border-dashed border-line-soft bg-paper">
              <p className="text-sm text-graphite">
                Todavía no hay categorías cargadas para el mantenimiento.
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-title text-carbon">No incluye</p>
          <textarea
            value={detalle.no_incluye.join("\n")}
            onChange={(event) => {
              onChange({
                incluye: [...categorias],
                no_incluye: splitItems(event.target.value)
              });
            }}
            placeholder="Un item por línea"
            className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        </div>
      </div>
    </Card>
  );
}
