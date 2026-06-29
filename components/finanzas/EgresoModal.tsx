"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import type { CategoriaEgreso, CreateEgresoInput, Egreso } from "@/types/egresos";

type EgresoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateEgresoInput) => Promise<void> | void;
  egreso?: Egreso | null;
};

const categorias: Array<{ value: CategoriaEgreso; label: string }> = [
  { value: "sueldos", label: "Sueldos" },
  { value: "pauta", label: "Pauta" },
  { value: "fijos", label: "Fijos" },
  { value: "dev", label: "Dev" },
  { value: "otro", label: "Otro" }
];

export function EgresoModal({ isOpen, onClose, onSave, egreso }: EgresoModalProps) {
  const [concepto, setConcepto] = useState(egreso?.concepto ?? "");
  const [categoria, setCategoria] = useState<CategoriaEgreso>(egreso?.categoria ?? "otro");
  const [monto, setMonto] = useState(String(egreso?.monto ?? ""));
  const [fecha, setFecha] = useState(egreso?.fecha ?? new Date().toISOString().slice(0, 10));
  const [recurrente, setRecurrente] = useState(Boolean(egreso?.recurrente));
  const [notas, setNotas] = useState(egreso?.notas ?? "");

  useEffect(() => {
    setConcepto(egreso?.concepto ?? "");
    setCategoria(egreso?.categoria ?? "otro");
    setMonto(String(egreso?.monto ?? ""));
    setFecha(egreso?.fecha ?? new Date().toISOString().slice(0, 10));
    setRecurrente(Boolean(egreso?.recurrente));
    setNotas(egreso?.notas ?? "");
  }, [egreso, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={egreso ? "Editar egreso" : "Nuevo egreso"} size="md">
      <div className="space-y-4">
        <Input label="Concepto" value={concepto} onChange={(event) => setConcepto(event.target.value)} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Categoría</label>
            <select
              value={categoria}
              onChange={(event) => setCategoria(event.target.value as CategoriaEgreso)}
              className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            >
              {categorias.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <Input label="Monto" type="number" value={monto} onChange={(event) => setMonto(event.target.value)} />
        </div>
        <Input label="Fecha" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
        <label className="inline-flex items-center gap-2 text-sm text-carbon">
          <input
            type="checkbox"
            checked={recurrente}
            onChange={(event) => setRecurrente(event.target.checked)}
            className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
          />
          Recurrente
        </label>
        <div className="space-y-1">
          <label className="text-sm font-label text-carbon">Notas</label>
          <textarea
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            className="min-h-[110px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              void onSave({
                concepto: concepto.trim(),
                categoria,
                monto: Number(monto),
                fecha,
                recurrente,
                notas: notas.trim() || null
              })
            }
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
