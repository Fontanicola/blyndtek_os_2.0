"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Modal } from "@/components/ui";
import { formatUSD } from "@/lib/utils/formatters";
import type { ProductoPlan, CreateProductoPlanInput } from "@/types/productoPlanes";

type ProductoPlanesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  producto: { id: string; nombre: string } | null;
};

type PlanDraft = {
  nombre: string;
  precio_mensual: string;
  descripcion: string;
};

const emptyDraft: PlanDraft = {
  nombre: "",
  precio_mensual: "",
  descripcion: ""
};

function normalizeNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function ProductoPlanesModal({ isOpen, onClose, producto }: ProductoPlanesModalProps) {
  const [planes, setPlanes] = useState<ProductoPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<PlanDraft>(emptyDraft);

  const nextOrden = useMemo(() => {
    if (!planes.length) {
      return 1;
    }

    return Math.max(...planes.map((plan) => plan.orden)) + 1;
  }, [planes]);

  useEffect(() => {
    const currentProducto = producto;

    if (!isOpen || !currentProducto) {
      setPlanes([]);
      setError(null);
      setDraft(emptyDraft);
      setEditingPlanId(null);
      return;
    }

    const productoId = currentProducto.id;

    let cancelled = false;

    async function loadPlanes() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/productos/${productoId}/planes`);
        const payload = (await response.json()) as { data?: ProductoPlan[]; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudieron cargar los planes.");
        }

        if (!cancelled) {
          setPlanes(payload.data);
          setDraft(emptyDraft);
          setEditingPlanId(null);
          setEditingDraft(emptyDraft);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los planes.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlanes();

    return () => {
      cancelled = true;
    };
  }, [isOpen, producto]);

  async function refreshPlanes() {
    if (!producto) {
      return;
    }

    const response = await fetch(`/api/productos/${producto.id}/planes`);
    const payload = (await response.json()) as { data?: ProductoPlan[]; error?: string };

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron cargar los planes.");
    }

    setPlanes(payload.data);
  }

  async function handleCreate() {
    if (!producto) {
      return;
    }

    const nombre = draft.nombre.trim();
    const precio = Number(draft.precio_mensual);

    if (!nombre || Number.isNaN(precio) || precio < 0) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/productos/${producto.id}/planes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          precio_mensual: precio,
          descripcion: normalizeNullableString(draft.descripcion),
          orden: nextOrden
        } satisfies CreateProductoPlanInput)
      });
      const payload = (await response.json()) as { data?: ProductoPlan; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear el plan.");
      }

      setDraft(emptyDraft);
      await refreshPlanes();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el plan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(planId: string) {
    if (!editingDraft) {
      return;
    }

    const nombre = editingDraft.nombre.trim();
    const precio = Number(editingDraft.precio_mensual);

    if (!nombre || Number.isNaN(precio) || precio < 0) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/producto-planes/${planId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          precio_mensual: precio,
          descripcion: normalizeNullableString(editingDraft.descripcion)
        })
      });
      const payload = (await response.json()) as { data?: ProductoPlan; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo guardar el plan.");
      }

      setEditingPlanId(null);
      setEditingDraft(emptyDraft);
      await refreshPlanes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el plan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(planId: string) {
    if (!window.confirm("¿Eliminar este plan?")) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/producto-planes/${planId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No se pudo eliminar el plan.");
      }

      await refreshPlanes();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={producto ? `Gestionar planes · ${producto.nombre}` : "Gestionar planes"}
      size="lg"
    >
      {!producto ? null : (
        <div className="space-y-4">
          <p className="text-sm text-graphite">
            Crear, renombrar o borrar planes de pricing para este producto SaaS.
          </p>

          {error ? (
            <div className="rounded-card border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {loading ? (
            <Card padding="md" className="bg-paper">
              <p className="text-sm text-graphite">Cargando planes...</p>
            </Card>
          ) : null}

          <div className="space-y-3">
            {planes.length === 0 && !loading ? (
              <Card padding="md" className="border border-dashed border-line-soft bg-paper">
                <p className="text-sm text-graphite">Todavía no hay planes creados para este producto.</p>
              </Card>
            ) : null}

            {planes.map((plan) => {
              const isEditing = editingPlanId === plan.id;

              return (
                <Card key={plan.id} padding="md" className="space-y-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          label="Nombre"
                          value={editingDraft.nombre}
                          onChange={(event) => setEditingDraft((current) => ({ ...current, nombre: event.target.value }))}
                        />
                        <Input
                          label="Precio mensual"
                          type="number"
                          value={editingDraft.precio_mensual}
                          onChange={(event) =>
                            setEditingDraft((current) => ({ ...current, precio_mensual: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-label text-carbon">Descripción</label>
                        <textarea
                          value={editingDraft.descripcion}
                          onChange={(event) =>
                            setEditingDraft((current) => ({ ...current, descripcion: event.target.value }))
                          }
                          className="min-h-[96px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPlanId(null);
                            setEditingDraft(emptyDraft);
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave(plan.id)}>
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-label text-carbon">{plan.nombre}</p>
                          <Badge variant="ghost" className="text-[11px]">
                            Orden {plan.orden}
                          </Badge>
                        </div>
                        <p className="text-sm text-graphite">{formatUSD(plan.precio_mensual)}</p>
                        {plan.descripcion ? <p className="text-sm text-graphite">{plan.descripcion}</p> : null}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingPlanId(plan.id);
                            setEditingDraft({
                              nombre: plan.nombre,
                              precio_mensual: String(plan.precio_mensual),
                              descripcion: plan.descripcion ?? ""
                            });
                          }}
                        >
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(plan.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card padding="md" className="space-y-4 border border-line-soft bg-paper">
            <div>
              <h3 className="text-base font-title text-carbon">Nuevo plan</h3>
              <p className="text-sm text-graphite">Definí un plan para este producto.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nombre"
                value={draft.nombre}
                onChange={(event) => setDraft((current) => ({ ...current, nombre: event.target.value }))}
              />
              <Input
                label="Precio mensual"
                type="number"
                value={draft.precio_mensual}
                onChange={(event) => setDraft((current) => ({ ...current, precio_mensual: event.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-label text-carbon">Descripción</label>
              <textarea
                value={draft.descripcion}
                onChange={(event) => setDraft((current) => ({ ...current, descripcion: event.target.value }))}
                className="min-h-[96px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              />
            </div>

            <div className="flex justify-end">
              <Button variant="primary" size="sm" loading={saving} onClick={() => void handleCreate()}>
                Crear plan
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );
}
