"use client";

import { useEffect, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import type { CuentaServicio, CreateCuentaServicioInput } from "@/types/cuentas";
import type { Proyecto } from "@/types/proyectos";

type CuentaServicioModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateCuentaServicioInput) => void | Promise<void>;
  cuenta: CuentaServicio | null;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado">>;
  defaultProyectoId: string;
};

function createInitialState(
  cuenta: CuentaServicio | null,
  defaultProyectoId: string
): CreateCuentaServicioInput {
  if (!cuenta) {
    return {
      proyecto_id: defaultProyectoId,
      servicio: "",
      para_que: null,
      cuenta_email: null,
      notas_acceso: null
    };
  }

  return {
    proyecto_id: cuenta.proyecto_id,
    servicio: cuenta.servicio,
    para_que: cuenta.para_que,
    cuenta_email: cuenta.cuenta_email,
    notas_acceso: cuenta.notas_acceso
  };
}

export function CuentaServicioModal({
  isOpen,
  onClose,
  onSave,
  cuenta,
  proyectos,
  defaultProyectoId
}: CuentaServicioModalProps) {
  const [form, setForm] = useState<CreateCuentaServicioInput>(
    createInitialState(cuenta, defaultProyectoId)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(createInitialState(cuenta, defaultProyectoId));
  }, [cuenta, defaultProyectoId, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={cuenta ? "Editar cuenta" : "Nueva cuenta"} size="md">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!form.servicio.trim()) {
            return;
          }

          setLoading(true);
          try {
            await onSave({
              ...form,
              servicio: form.servicio.trim()
            });
            onClose();
          } finally {
            setLoading(false);
          }
        }}
      >
        <EntitySelect
          label="Proyecto"
          value={form.proyecto_id}
          options={proyectos.map((proyecto) => ({
            id: proyecto.id,
            label: proyecto.nombre,
            sublabel: proyecto.estado.replaceAll("_", " ")
          }))}
          onChange={(value) =>
            setForm((current) => ({ ...current, proyecto_id: value ?? defaultProyectoId }))
          }
          required
          placeholder="Seleccionar proyecto"
        />
        <Input
          label="Servicio"
          value={form.servicio}
          onChange={(event) => setForm((current) => ({ ...current, servicio: event.target.value }))}
        />
        <Input
          label="Para qué"
          value={form.para_que ?? ""}
          onChange={(event) => setForm((current) => ({ ...current, para_que: event.target.value }))}
        />
        <Input
          label="Cuenta email"
          value={form.cuenta_email ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, cuenta_email: event.target.value }))
          }
        />
        <div className="space-y-1">
          <label className="block text-sm font-label text-carbon">Notas de acceso</label>
          <textarea
            value={form.notas_acceso ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, notas_acceso: event.target.value }))
            }
            className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line-soft pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
