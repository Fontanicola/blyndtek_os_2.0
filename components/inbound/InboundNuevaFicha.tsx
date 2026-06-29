"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import { createLeadDraft, sanitizeNumberValue, sanitizeTextValue } from "@/lib/leads";
import { cn } from "@/lib/cn";
import type { CreateLeadInput, NivelConfianza } from "@/types/leads";

type InboundNuevaFichaProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateLeadInput) => void | Promise<void>;
};

const fieldClassName =
  "w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20";

export function InboundNuevaFicha({ isOpen, onClose, onSave }: InboundNuevaFichaProps) {
  const [form, setForm] = useState<CreateLeadInput>({
    ...createLeadDraft("por_contactar"),
    canal: "inbound",
    nivel_confianza: "medio"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm({
      ...createLeadDraft("por_contactar"),
      canal: "inbound",
      nivel_confianza: "medio"
    });
  }, [isOpen]);

  function setField<Key extends keyof CreateLeadInput>(key: Key, value: CreateLeadInput[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.empresa.trim() || !form.referido_por?.trim()) {
      return;
    }

    setLoading(true);

    try {
      await onSave({
        ...form,
        empresa: form.empresa.trim(),
        rubro: sanitizeTextValue(form.rubro ?? ""),
        ubicacion: sanitizeTextValue(form.ubicacion ?? ""),
        contacto_1_nombre: sanitizeTextValue(form.contacto_1_nombre ?? ""),
        contacto_1_tel: sanitizeTextValue(form.contacto_1_tel ?? ""),
        contacto_2_nombre: sanitizeTextValue(form.contacto_2_nombre ?? ""),
        contacto_2_tel: sanitizeTextValue(form.contacto_2_tel ?? ""),
        web: sanitizeTextValue(form.web ?? ""),
        referido_por: form.referido_por.trim(),
        relacion: sanitizeTextValue(form.relacion ?? ""),
        contexto: sanitizeTextValue(form.contexto ?? ""),
        notas: sanitizeTextValue(form.notas ?? "")
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva ficha" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Empresa"
            value={form.empresa}
            onChange={(event) => setField("empresa", event.target.value)}
            required
          />
          <Input
            label="Rubro"
            value={form.rubro ?? ""}
            onChange={(event) => setField("rubro", event.target.value)}
          />
          <Input
            label="Ubicación"
            value={form.ubicacion ?? ""}
            onChange={(event) => setField("ubicacion", event.target.value)}
          />
          <Input
            label="Web"
            value={form.web ?? ""}
            onChange={(event) => setField("web", event.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Contacto 1"
            value={form.contacto_1_nombre ?? ""}
            onChange={(event) => setField("contacto_1_nombre", event.target.value)}
          />
          <Input
            label="Teléfono 1"
            value={form.contacto_1_tel ?? ""}
            onChange={(event) => setField("contacto_1_tel", event.target.value)}
          />
          <Input
            label="Contacto 2"
            value={form.contacto_2_nombre ?? ""}
            onChange={(event) => setField("contacto_2_nombre", event.target.value)}
          />
          <Input
            label="Teléfono 2"
            value={form.contacto_2_tel ?? ""}
            onChange={(event) => setField("contacto_2_tel", event.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Referido por"
            value={form.referido_por ?? ""}
            onChange={(event) => setField("referido_por", event.target.value)}
            required
          />
          <Input
            label="Relación"
            value={form.relacion ?? ""}
            onChange={(event) => setField("relacion", event.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Nivel de confianza</label>
            <select
              value={form.nivel_confianza ?? "medio"}
              onChange={(event) =>
                setField("nivel_confianza", event.target.value as NivelConfianza)
              }
              className={fieldClassName}
            >
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>
          </div>
          <Input
            label="Presupuesto estimado (USD)"
            type="number"
            value={form.presupuesto_estimado?.toString() ?? ""}
            onChange={(event) =>
              setField("presupuesto_estimado", sanitizeNumberValue(event.target.value))
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Contexto / necesidad</label>
            <textarea
              value={form.contexto ?? ""}
              onChange={(event) => setField("contexto", event.target.value)}
              className={cn(fieldClassName, "min-h-[120px] resize-none")}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Notas iniciales</label>
            <textarea
              value={form.notas ?? ""}
              onChange={(event) => setField("notas", event.target.value)}
              className={cn(fieldClassName, "min-h-[120px] resize-none")}
            />
          </div>
        </div>

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
