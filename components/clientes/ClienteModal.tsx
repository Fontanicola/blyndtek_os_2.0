"use client";

import { useEffect, useState } from "react";
import { Button, EntitySelect, Input, Modal } from "@/components/ui";
import type { EntitySelectOption } from "@/components/ui/EntitySelect";
import type { CreateClienteInput } from "@/types/clientes";

type ClienteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateClienteInput) => void | Promise<void>;
  leadOptions: EntitySelectOption[];
};

const createInitialState = (): CreateClienteInput => ({
  lead_id: null,
  empresa: "",
  pais: null,
  contacto_nombre: null,
  contacto_email: null,
  contacto_whatsapp: null,
  datos_facturacion: null,
  estado: "activo",
  notas: null
});

export function ClienteModal({ isOpen, onClose, onSave, leadOptions }: ClienteModalProps) {
  const [form, setForm] = useState<CreateClienteInput>(createInitialState());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(createInitialState());
  }, [isOpen]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.empresa.trim()) {
      return;
    }

    setLoading(true);

    try {
      await onSave({
        ...form,
        empresa: form.empresa.trim()
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo cliente" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Empresa"
          value={form.empresa}
          onChange={(event) => setForm((current) => ({ ...current, empresa: event.target.value }))}
          required
        />
        <Input
          label="País"
          value={form.pais ?? ""}
          onChange={(event) =>
            setForm((current) => ({ ...current, pais: event.target.value.trim() || null }))
          }
        />
        <Input
          label="Contacto"
          value={form.contacto_nombre ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              contacto_nombre: event.target.value.trim() || null
            }))
          }
        />
        <Input
          label="Email"
          value={form.contacto_email ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              contacto_email: event.target.value.trim() || null
            }))
          }
        />
        <Input
          label="WhatsApp"
          value={form.contacto_whatsapp ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              contacto_whatsapp: event.target.value.trim() || null
            }))
          }
        />
        <EntitySelect
          label="Lead de origen"
          value={form.lead_id}
          allowEmpty
          placeholder="Sin lead de origen"
          options={leadOptions}
          onChange={(id) => setForm((current) => ({ ...current, lead_id: id }))}
        />
        <Input
          label="CUIT"
          value={form.datos_facturacion?.cuit ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              datos_facturacion: {
                ...current.datos_facturacion,
                cuit: event.target.value.trim() || undefined
              }
            }))
          }
        />
        <Input
          label="Razón social"
          value={form.datos_facturacion?.razon_social ?? ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              datos_facturacion: {
                ...current.datos_facturacion,
                razon_social: event.target.value.trim() || undefined
              }
            }))
          }
        />

        <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
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
