"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { ListIcon, RefreshIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import type { ChecklistQaItem } from "@/types/checklistQa";

type ChecklistQaItemView = ChecklistQaItem & {
  completado_por_nombre?: string | null;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type ChecklistQaSectionProps = {
  faseId: string;
  enabled: boolean;
};

export function ChecklistQaSection({ faseId, enabled }: ChecklistQaSectionProps) {
  const [items, setItems] = useState<ChecklistQaItemView[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualItem, setManualItem] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completed = useMemo(() => items.filter((item) => item.completado).length, [items]);
  const completionPct = items.length > 0 ? (completed / items.length) * 100 : 0;
  const isComplete = items.length > 0 && completed === items.length;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function loadChecklist() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/fases/${faseId}/checklist`);
        const payload = (await response.json()) as ApiResponse<ChecklistQaItemView[]>;

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudo cargar la checklist.");
        }

        if (!cancelled) {
          setItems(payload.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setItems([]);
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la checklist.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadChecklist();

    return () => {
      cancelled = true;
    };
  }, [enabled, faseId]);

  async function refreshChecklist() {
    const response = await fetch(`/api/fases/${faseId}/checklist`);
    const payload = (await response.json()) as ApiResponse<ChecklistQaItemView[]>;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar la checklist.");
    }

    setItems(payload.data);
  }

  async function generateChecklist(replace: boolean) {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/fases/${faseId}/checklist/generar${replace ? "?reemplazar=true" : ""}`,
        { method: "POST" }
      );
      const payload = (await response.json()) as ApiResponse<ChecklistQaItemView[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo generar la checklist.");
      }

      setItems(payload.data);
      setManualOpen(false);
      setManualItem("");
      setModalOpen(true);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "No se pudo generar la checklist.");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleItem(item: ChecklistQaItemView) {
    setSavingItemId(item.id);
    setError(null);

    try {
      const response = await fetch(`/api/checklist-qa/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ completado: !item.completado })
      });
      const payload = (await response.json()) as ApiResponse<ChecklistQaItemView>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo actualizar el ítem.");
      }

      await refreshChecklist();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No se pudo actualizar el ítem.");
    } finally {
      setSavingItemId(null);
    }
  }

  async function deleteItem(itemId: string) {
    setSavingItemId(itemId);
    setError(null);

    try {
      const response = await fetch(`/api/checklist-qa/${itemId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiResponse<{ success: boolean }>;

      if (!response.ok || !payload.data?.success) {
        throw new Error(payload.error ?? "No se pudo eliminar el ítem.");
      }

      await refreshChecklist();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el ítem.");
    } finally {
      setSavingItemId(null);
    }
  }

  async function addManualItem() {
    const value = manualItem.trim();

    if (!value) {
      setManualOpen(false);
      setManualItem("");
      return;
    }

    setSavingItemId("manual");
    setError(null);

    try {
      const response = await fetch("/api/checklist-qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fase_id: faseId, item: value })
      });
      const payload = (await response.json()) as ApiResponse<ChecklistQaItemView>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo agregar el ítem.");
      }

      await refreshChecklist();
      setManualOpen(false);
      setManualItem("");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "No se pudo agregar el ítem.");
    } finally {
      setSavingItemId(null);
    }
  }

  if (!enabled) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        {loading ? (
          <Button type="button" variant="ghost" size="sm" loading disabled className="h-9 min-w-[132px] justify-start gap-2 px-3">
            <ListIcon />
            Generar QA
          </Button>
        ) : items.length === 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void generateChecklist(false)}
            loading={generating}
            className="h-9 min-w-[132px] justify-start gap-2 px-3"
          >
            <ListIcon />
            Generar QA
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="group relative flex h-9 min-w-[132px] items-center gap-2 overflow-hidden rounded-pill border border-line-soft bg-white px-3 text-xs font-label text-carbon shadow-soft transition-all duration-fast ease-fast hover:-translate-y-0.5 hover:bg-paper"
          >
            <ListIcon />
            <span className="relative z-10">QA · {completed}/{items.length}</span>
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-[3px] transition-all duration-normal ease-normal",
                isComplete ? "bg-success" : "bg-signal"
              )}
              style={{ width: `${completionPct}%` }}
            />
          </button>
        )}

        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Checklist QA"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-graphite">
              {completed}/{items.length} completados
            </p>

            {items.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const confirmed = window.confirm("¿Regenerar la checklist? Esto reemplazará los ítems actuales.");
                  if (!confirmed) {
                    return;
                  }

                  void generateChecklist(true);
                }}
                className="gap-2"
              >
                <RefreshIcon />
                Regenerar
              </Button>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-card border border-line-soft bg-paper px-3 py-2 transition-colors duration-fast ease-fast",
                    item.completado && "bg-success-light/40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.completado}
                    disabled={savingItemId === item.id}
                    onChange={() => void toggleItem(item)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-signal focus:ring-signal"
                  />

                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm text-carbon", item.completado && "text-graphite line-through")}>
                      {item.item}
                    </p>
                    {item.completado && item.completado_por_nombre ? (
                      <p className="mt-0.5 text-xs text-graphite">
                        Completado por {item.completado_por_nombre}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="text-xs text-graphite transition-colors duration-fast ease-fast hover:text-danger"
                    onClick={() => void deleteItem(item.id)}
                    disabled={savingItemId === item.id}
                    title="Eliminar ítem"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-graphite">
              Generá una checklist de verificación manual para esta fase.
            </p>
          )}

          {items.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {manualOpen ? (
                <div className="flex min-w-[240px] flex-1 items-center gap-2">
                  <Input
                    value={manualItem}
                    onChange={(event) => setManualItem(event.target.value)}
                    placeholder="Nuevo ítem de QA"
                    className="flex-1"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addManualItem();
                      }

                      if (event.key === "Escape") {
                        setManualOpen(false);
                        setManualItem("");
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={() => void addManualItem()} loading={savingItemId === "manual"}>
                    Agregar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setManualOpen(false);
                      setManualItem("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setManualOpen(true)}>
                  + Agregar ítem manual
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
