"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import type { EstadoFeature, Feature, UpdateFeatureInput } from "@/types/features";
import type { FaseProyecto } from "./SubtareaChecklistItem";

type FeatureModalProps = {
  isOpen: boolean;
  feature: Feature | null;
  fasesDisponibles: FaseProyecto[];
  onClose: () => void;
  onSave: (input: UpdateFeatureInput) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export function FeatureModal({
  isOpen,
  feature,
  fasesDisponibles,
  onClose,
  onSave,
  onDelete
}: FeatureModalProps) {
  const initialForm = useMemo(
    () => ({
      nombre: feature?.nombre ?? "",
      descripcion: feature?.descripcion ?? "",
      fase: feature?.fase ?? fasesDisponibles[0]?.id ?? "",
      estado: feature?.estado ?? ("pendiente" as EstadoFeature)
    }),
    [feature, fasesDisponibles]
  );

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
    }
  }, [isOpen, initialForm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={feature ? "Editar subtarea" : "Nueva subtarea"} size="lg">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!form.nombre.trim() || !form.descripcion.trim() || !form.fase.trim()) {
            return;
          }

          setLoading(true);
          try {
            await onSave({
              nombre: form.nombre.trim(),
              descripcion: form.descripcion.trim(),
              fase: form.fase,
              estado: form.estado
            });
            onClose();
          } finally {
            setLoading(false);
          }
        }}
      >
        <Input
          label="Nombre"
          required
          value={form.nombre}
          onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
        />

        <div className="space-y-1">
          <label className="block text-sm font-label text-carbon">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
            className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Fase</label>
            <select
              value={form.fase}
              onChange={(event) => setForm((current) => ({ ...current, fase: event.target.value }))}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              {fasesDisponibles.map((fase) => (
                <option key={fase.id} value={fase.id}>
                  {fase.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Estado</label>
            <select
              value={form.estado}
              onChange={(event) =>
                setForm((current) => ({ ...current, estado: event.target.value as EstadoFeature }))
              }
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_curso">En curso</option>
              <option value="lista">Lista</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
          <div>
            {feature ? (
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  await onDelete(feature.id);
                  onClose();
                }}
              >
                Eliminar
              </Button>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
