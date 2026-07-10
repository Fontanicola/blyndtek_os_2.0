"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import type { Usuario } from "@/types/auth";
import type { EstadoFeature, Feature, UpdateFeatureInput } from "@/types/features";
import type { FaseProyecto } from "./SubtareaChecklistItem";

type FeatureModalProps = {
  isOpen: boolean;
  feature: Feature | null;
  fasesDisponibles: FaseProyecto[];
  usuarios?: Array<Pick<Usuario, "id" | "nombre" | "email" | "rol">>;
  defaultEstado?: EstadoFeature;
  defaultFaseId?: string;
  defaultResponsableId?: string;
  onClose: () => void;
  onSave: (input: UpdateFeatureInput) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export function FeatureModal({
  isOpen,
  feature,
  fasesDisponibles,
  usuarios = [],
  defaultEstado = "pendiente",
  defaultFaseId = "",
  defaultResponsableId = "",
  onClose,
  onSave,
  onDelete
}: FeatureModalProps) {
  const initialForm = useMemo(
    () => ({
      nombre: feature?.nombre ?? "",
      descripcion: feature?.descripcion ?? "",
      fase: feature?.fase ?? defaultFaseId ?? "",
      estado: feature?.estado ?? defaultEstado,
      responsable_id: feature?.responsable_id ?? defaultResponsableId ?? ""
    }),
    [defaultEstado, defaultFaseId, defaultResponsableId, feature]
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
          if (!form.nombre.trim() || !form.descripcion.trim()) {
            return;
          }

          setLoading(true);
          try {
            await onSave({
              nombre: form.nombre.trim(),
              descripcion: form.descripcion.trim(),
              fase: form.fase,
              estado: form.estado,
              responsable_id: form.responsable_id || undefined
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

        <EntitySelect
          label="Responsable"
          value={form.responsable_id || null}
          allowEmpty
          placeholder="Sin responsable"
          options={usuarios.map((usuario) => ({
            id: usuario.id,
            label: usuario.nombre,
            sublabel: usuario.email
          }))}
          onChange={(value) => setForm((current) => ({ ...current, responsable_id: value ?? "" }))}
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
              <option value="">Sin fase</option>
              {fasesDisponibles.map((fase) => (
                <option key={fase.id} value={fase.id}>
                  {fase.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-graphite">La fase es opcional y se puede asignar después.</p>
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
