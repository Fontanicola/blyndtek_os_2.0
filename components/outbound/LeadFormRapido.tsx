"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { createLeadDraft, sanitizeTextValue } from "@/lib/leads";
import type { CreateLeadInput, EtapaLead } from "@/types/leads";

type LeadFormRapidoProps = {
  etapa: EtapaLead;
  onSave: (input: CreateLeadInput) => void | Promise<void>;
  onCancel: () => void;
};

export function LeadFormRapido({ etapa, onSave, onCancel }: LeadFormRapidoProps) {
  const [empresa, setEmpresa] = useState("");
  const [rubro, setRubro] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!empresa.trim()) {
      return;
    }

    setLoading(true);

    try {
      await onSave({
        ...createLeadDraft(etapa),
        empresa: empresa.trim(),
        rubro: sanitizeTextValue(rubro),
        contacto_1_nombre: sanitizeTextValue(contactoNombre),
        contacto_1_tel: sanitizeTextValue(telefono)
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-card bg-white p-3 shadow-soft">
      <Input
        label="Empresa"
        value={empresa}
        onChange={(event) => setEmpresa(event.target.value)}
        required
      />
      <Input label="Rubro" value={rubro} onChange={(event) => setRubro(event.target.value)} />
      <Input
        label="Contacto"
        value={contactoNombre}
        onChange={(event) => setContactoNombre(event.target.value)}
      />
      <Input
        label="Teléfono"
        value={telefono}
        onChange={(event) => setTelefono(event.target.value)}
      />

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          Crear
        </Button>
      </div>
    </form>
  );
}
