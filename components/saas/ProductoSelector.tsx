"use client";

import { cn } from "@/lib/cn";
import type { Producto } from "@/types/productos";

type ProductoSelectorProps = {
  productos: Producto[];
  selectedProductoId: string | null;
  onSelect: (productoId: string) => void;
  loading?: boolean;
};

export function ProductoSelector({
  productos,
  selectedProductoId,
  onSelect,
  loading = false
}: ProductoSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-pill bg-white p-1 shadow-soft">
          {loading && productos.length === 0 ? (
            <div className="flex h-11 min-w-[220px] items-center px-4 text-sm text-graphite">Cargando productos...</div>
          ) : null}

          {productos.map((producto) => {
            const active = producto.id === selectedProductoId;

            return (
              <button
                key={producto.id}
                type="button"
                onClick={() => onSelect(producto.id)}
                className={cn(
                  "rounded-pill px-4 py-2 text-sm font-label transition-all duration-fast ease-fast",
                  active ? "bg-signal text-white shadow-soft" : "text-graphite hover:bg-paper hover:text-carbon"
                )}
              >
                {producto.nombre}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
