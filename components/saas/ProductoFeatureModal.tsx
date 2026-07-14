"use client";

import { useEffect, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import type { Cliente } from "@/types/clientes";
import type { CreateProductoFeatureInput, EstadoFeatureProducto, ProductoFeature } from "@/types/productos";

type ProductoFeatureModalProps = {
  isOpen: boolean;
  feature: ProductoFeature | null;
  defaultEstado: EstadoFeatureProducto;
  defaultOrden: number;
  clientes: Array<Pick<Cliente, "id" | "empresa" | "pais" | "estado">>;
  onClose: () => void;
  onSave: (input: CreateProductoFeatureInput) => Promise<void> | void;
};

const estadoOptions: Array<{ value: EstadoFeatureProducto; label: string }> = [
  { value: "idea", label: "Idea" },
  { value: "planificado", label: "Planificado" },
  { value: "en_desarrollo", label: "En desarrollo" },
  { value: "lanzado", label: "Lanzado" }
];

const prioridadOptions: Array<{ value: "alta" | "media" | "baja"; label: string }> = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" }
];

export function ProductoFeatureModal({
  isOpen,
  feature,
  defaultEstado,
  defaultOrden,
  clientes,
  onClose,
  onSave
}: ProductoFeatureModalProps) {
  const [titulo, setTitulo] = useState(feature?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(feature?.descripcion ?? "");
  const [estado, setEstado] = useState<EstadoFeatureProducto>(feature?.estado ?? defaultEstado);
  const [prioridad, setPrioridad] = useState<"alta" | "media" | "baja">(feature?.prioridad ?? "media");
  const [clienteId, setClienteId] = useState(feature?.solicitado_por_cliente_id ?? "");
  const [orden, setOrden] = useState(String(feature?.orden ?? defaultOrden));

  useEffect(() => {
    setTitulo(feature?.titulo ?? "");
    setDescripcion(feature?.descripcion ?? "");
    setEstado(feature?.estado ?? defaultEstado);
    setPrioridad(feature?.prioridad ?? "media");
    setClienteId(feature?.solicitado_por_cliente_id ?? "");
    setOrden(String(feature?.orden ?? defaultOrden));
  }, [defaultEstado, defaultOrden, feature, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={feature ? "Editar feature" : "Nueva feature"} size="md">
      <div className="space-y-4">
        <Input label="Título" value={titulo} onChange={(event) => setTitulo(event.target.value)} required />

        <div className="space-y-1">
          <label className="text-sm font-label text-carbon">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            className="min-h-[110px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Estado</label>
            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value as EstadoFeatureProducto)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              {estadoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Prioridad</label>
            <select
              value={prioridad}
              onChange={(event) => setPrioridad(event.target.value as "alta" | "media" | "baja")}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              {prioridadOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <EntitySelect
          label="Solicitado por cliente"
          value={clienteId || null}
          allowEmpty
          placeholder="Sin cliente"
          options={clientes.map((cliente) => ({
            id: cliente.id,
            label: cliente.empresa,
            sublabel: cliente.pais ?? cliente.estado
          }))}
          onChange={(id) => setClienteId(id ?? "")}
        />

        <Input
          label="Orden"
          type="number"
          value={orden}
          onChange={(event) => setOrden(event.target.value)}
          hint="Útil para mantener el orden visual dentro de la columna."
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!titulo.trim()) {
                return;
              }

              void onSave({
                titulo: titulo.trim(),
                descripcion: descripcion.trim() || null,
                estado,
                prioridad,
                solicitado_por_cliente_id: clienteId.trim() || null,
                orden: Number(orden || 0)
              });
            }}
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
