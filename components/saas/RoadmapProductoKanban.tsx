"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Cliente } from "@/types/clientes";
import type { CreateProductoFeatureInput, EstadoFeatureProducto, ProductoFeature, UpdateProductoFeatureInput } from "@/types/productos";
import { ProductoFeatureCard } from "./ProductoFeatureCard";
import { ProductoFeatureModal } from "./ProductoFeatureModal";

const columns: Array<{ estado: EstadoFeatureProducto; label: string }> = [
  { estado: "idea", label: "Idea" },
  { estado: "planificado", label: "Planificado" },
  { estado: "en_desarrollo", label: "En desarrollo" },
  { estado: "lanzado", label: "Lanzado" }
];

type RoadmapProductoKanbanProps = {
  productoId: string;
  features: ProductoFeature[];
  clientes: Array<Pick<Cliente, "id" | "empresa" | "pais" | "estado">>;
  onCreateFeature: (productoId: string, input: CreateProductoFeatureInput) => Promise<unknown> | void;
  onUpdateFeature: (id: string, input: UpdateProductoFeatureInput) => Promise<unknown> | void;
  onUpdateEstadoFeature: (id: string, estado: EstadoFeatureProducto) => Promise<unknown> | void;
  onDeleteFeature: (id: string) => Promise<unknown> | void;
};

function sortByOrden(features: ProductoFeature[]) {
  return [...features].sort((left, right) => left.orden - right.orden || left.created_at.localeCompare(right.created_at));
}

function getClienteNombre(feature: ProductoFeature, clientes: RoadmapProductoKanbanProps["clientes"]) {
  if (!feature.solicitado_por_cliente_id) {
    return null;
  }

  return clientes.find((cliente) => cliente.id === feature.solicitado_por_cliente_id)?.empresa ?? "Cliente vinculado";
}

export function RoadmapProductoKanban({
  productoId,
  features,
  clientes,
  onCreateFeature,
  onUpdateFeature,
  onUpdateEstadoFeature,
  onDeleteFeature
}: RoadmapProductoKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<EstadoFeatureProducto | null>(null);
  const [editingFeature, setEditingFeature] = useState<ProductoFeature | null>(null);
  const [createState, setCreateState] = useState<{ estado: EstadoFeatureProducto; orden: number } | null>(null);

  useEffect(() => {
    if (!editingFeature) {
      return;
    }

    setEditingFeature(features.find((feature) => feature.id === editingFeature.id) ?? null);
  }, [editingFeature, features]);

  const grouped = useMemo(
    () =>
      columns.map((column) => {
        const columnFeatures = sortByOrden(features.filter((feature) => feature.estado === column.estado));
        return {
          ...column,
          features: columnFeatures
        };
      }),
    [features]
  );

  const activeFeature = editingFeature ?? null;
  const modalOpen = activeFeature !== null || createState !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-title text-carbon">Roadmap de features</h3>
          <p className="text-sm text-graphite">Mové features entre estados y mantené la prioridad visible.</p>
        </div>
        <Badge variant="default">{features.length} features</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {grouped.map((column) => (
          <section
            key={column.estado}
            className={cn(
              "flex min-h-[560px] flex-col rounded-card bg-paper p-3 transition-all duration-fast ease-fast",
              dropTarget === column.estado && "ring-2 ring-signal"
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTarget(column.estado);
            }}
            onDragLeave={() => {
              setDropTarget((current) => (current === column.estado ? null : current));
            }}
            onDrop={async (event) => {
              event.preventDefault();
              const featureId = draggedId ?? event.dataTransfer.getData("text/plain");

              try {
                if (featureId) {
                  await onUpdateEstadoFeature(featureId, column.estado);
                }
              } catch (error) {
                console.error(error);
              } finally {
                setDraggedId(null);
                setDropTarget(null);
              }
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-label text-graphite">{column.label}</h4>
                <Badge variant="default">{column.features.length}</Badge>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {column.features.length > 0 ? (
                column.features.map((feature) => (
                  <ProductoFeatureCard
                    key={feature.id}
                    feature={feature}
                    clienteNombre={getClienteNombre(feature, clientes)}
                    draggable
                    isDragging={draggedId === feature.id}
                    onDragStart={(current) => setDraggedId(current.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onEdit={() => setEditingFeature(feature)}
                    onDelete={async () => {
                      const confirmed = window.confirm("¿Eliminar esta feature?");
                      if (!confirmed) {
                        return;
                      }

                      try {
                        await onDeleteFeature(feature.id);
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                  />
                ))
              ) : (
                <Card padding="sm">
                  <p className="text-sm text-graphite">Sin features en esta columna.</p>
                </Card>
              )}
            </div>

            <div className="pt-3">
              <Button
                variant="ghost"
                size="sm"
              className="w-full justify-center"
              onClick={() => {
                  const columnFeatures = grouped.find((item) => item.estado === column.estado)?.features ?? [];
                  const nextOrden = columnFeatures.reduce((max, feature) => Math.max(max, feature.orden), 0) + 1;
                  setCreateState({ estado: column.estado, orden: nextOrden });
                  setEditingFeature(null);
                }}
              >
                + Feature
              </Button>
            </div>
          </section>
        ))}
      </div>

      <ProductoFeatureModal
        isOpen={modalOpen}
        feature={activeFeature}
        defaultEstado={createState?.estado ?? "idea"}
        defaultOrden={createState?.orden ?? 1}
        clientes={clientes}
        onClose={() => {
          setEditingFeature(null);
          setCreateState(null);
        }}
        onSave={async (input) => {
          try {
            if (activeFeature) {
              await onUpdateFeature(activeFeature.id, input);
            } else {
              await onCreateFeature(productoId, input);
            }

            setEditingFeature(null);
            setCreateState(null);
          } catch (error) {
            console.error(error);
          }
        }}
      />
    </div>
  );
}
