"use client";

import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import type { CreateFaseProyectoInput } from "@/types/fases-proyecto";

type NuevaFaseFormProps = {
  loading?: boolean;
  onCancel: () => void;
  onSave: (input: CreateFaseProyectoInput) => Promise<void> | void;
};

export function NuevaFaseForm({ loading = false, onCancel, onSave }: NuevaFaseFormProps) {
  const [nombre, setNombre] = useState("");
  const [prioridad, setPrioridad] = useState<"alta" | "media" | "baja">("media");
  const [fechaInicioEstimada, setFechaInicioEstimada] = useState("");
  const [fechaFinEstimada, setFechaFinEstimada] = useState("");
  const [descripcion, setDescripcion] = useState("");

  return (
    <Card padding="sm" className="min-w-[320px] max-w-[320px] space-y-3 bg-paper">
      <Input label="Nombre de la fase" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej: Diseño" />

      <div className="space-y-1">
        <label className="block text-sm font-label text-carbon">Prioridad</label>
        <select
          value={prioridad}
          onChange={(event) => setPrioridad(event.target.value as "alta" | "media" | "baja")}
          className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
        >
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Inicio estimado"
          type="date"
          value={fechaInicioEstimada}
          onChange={(event) => setFechaInicioEstimada(event.target.value)}
        />
        <Input
          label="Fin estimado"
          type="date"
          value={fechaFinEstimada}
          onChange={(event) => setFechaFinEstimada(event.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-label text-carbon">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          className="min-h-[80px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          size="sm"
          loading={loading}
          onClick={async () => {
            const trimmedName = nombre.trim();
            if (!trimmedName) {
              return;
            }

            await onSave({
              nombre: trimmedName,
              prioridad,
              fecha_estimada_inicio: fechaInicioEstimada || null,
              fecha_estimada_fin: fechaFinEstimada || null,
              descripcion: descripcion.trim() || null
            });
          }}
        >
          Crear fase
        </Button>
      </div>
    </Card>
  );
}
