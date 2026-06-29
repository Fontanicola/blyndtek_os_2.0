"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal } from "@/components/ui";
import {
  ETAPA_LABELS,
  OUTBOUND_ETAPAS,
  createLeadDraft,
  sanitizeNumberValue,
  sanitizeTextValue
} from "@/lib/leads";
import { cn } from "@/lib/cn";
import type { CreateLeadInput, Lead, UpdateLeadInput } from "@/types/leads";

type LeadModalProps = {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: UpdateLeadInput) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

function toDraft(lead: Lead | null): CreateLeadInput {
  if (!lead) {
    return createLeadDraft();
  }

  return {
    canal: lead.canal,
    empresa: lead.empresa,
    rubro: lead.rubro,
    ubicacion: lead.ubicacion,
    contacto_1_nombre: lead.contacto_1_nombre,
    contacto_1_tel: lead.contacto_1_tel,
    contacto_2_nombre: lead.contacto_2_nombre,
    contacto_2_tel: lead.contacto_2_tel,
    web: lead.web,
    etapa: lead.etapa,
    valor_estimado: lead.valor_estimado,
    responsable_id: lead.responsable_id,
    llamada_fecha: lead.llamada_fecha,
    llamada_hecho: lead.llamada_hecho,
    seg1_fecha: lead.seg1_fecha,
    seg1_hecho: lead.seg1_hecho,
    seg2_fecha: lead.seg2_fecha,
    seg2_hecho: lead.seg2_hecho,
    referido_por: lead.referido_por,
    relacion: lead.relacion,
    nivel_confianza: lead.nivel_confianza,
    contexto: lead.contexto,
    presupuesto_estimado: lead.presupuesto_estimado,
    motivo_descarte: lead.motivo_descarte,
    notas: lead.notas
  };
}

const fieldClassName =
  "w-full rounded-component border border-line bg-white px-3 py-2 text-base text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20";

export function LeadModal({ lead, isOpen, onClose, onSave, onDelete }: LeadModalProps) {
  const [form, setForm] = useState<CreateLeadInput>(toDraft(lead));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(toDraft(lead));
  }, [isOpen, lead]);

  function setField<Key extends keyof CreateLeadInput>(key: Key, value: CreateLeadInput[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.empresa.trim()) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        ...form,
        empresa: form.empresa.trim()
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);

    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? "Editar lead" : "Nuevo lead"}
      size="lg"
    >
      <form onSubmit={handleSave} className="space-y-5">
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
            onChange={(event) => setField("rubro", sanitizeTextValue(event.target.value))}
          />
          <Input
            label="Ubicación"
            value={form.ubicacion ?? ""}
            onChange={(event) => setField("ubicacion", sanitizeTextValue(event.target.value))}
          />
          <Input
            label="Web"
            value={form.web ?? ""}
            onChange={(event) => setField("web", sanitizeTextValue(event.target.value))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Contacto 1"
            value={form.contacto_1_nombre ?? ""}
            onChange={(event) =>
              setField("contacto_1_nombre", sanitizeTextValue(event.target.value))
            }
          />
          <Input
            label="Teléfono 1"
            value={form.contacto_1_tel ?? ""}
            onChange={(event) => setField("contacto_1_tel", sanitizeTextValue(event.target.value))}
          />
          <Input
            label="Contacto 2"
            value={form.contacto_2_nombre ?? ""}
            onChange={(event) =>
              setField("contacto_2_nombre", sanitizeTextValue(event.target.value))
            }
          />
          <Input
            label="Teléfono 2"
            value={form.contacto_2_tel ?? ""}
            onChange={(event) => setField("contacto_2_tel", sanitizeTextValue(event.target.value))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-label text-carbon">Contexto</label>
            <textarea
              value={form.contexto ?? ""}
              onChange={(event) => setField("contexto", sanitizeTextValue(event.target.value))}
              className={cn(fieldClassName, "min-h-[110px] resize-none")}
            />
          </div>
          <div className="space-y-4">
            <Input
              label="Valor estimado (USD)"
              value={form.valor_estimado?.toString() ?? ""}
              onChange={(event) =>
                setField("valor_estimado", sanitizeNumberValue(event.target.value))
              }
              type="number"
            />

            <div className="space-y-1">
              <label className="block text-sm font-label text-carbon">Etapa</label>
              <select
                value={form.etapa}
                onChange={(event) =>
                  setField("etapa", event.target.value as CreateLeadInput["etapa"])
                }
                className={fieldClassName}
              >
                {OUTBOUND_ETAPAS.map((etapa) => (
                  <option key={etapa} value={etapa}>
                    {ETAPA_LABELS[etapa]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-label text-carbon">Toques</h3>

          {[
            {
              label: "Llamada",
              doneKey: "llamada_hecho" as const,
              dateKey: "llamada_fecha" as const
            },
            {
              label: "Seguimiento 1",
              doneKey: "seg1_hecho" as const,
              dateKey: "seg1_fecha" as const
            },
            {
              label: "Seguimiento 2",
              doneKey: "seg2_hecho" as const,
              dateKey: "seg2_fecha" as const
            }
          ].map((touch) => (
            <div key={touch.label} className="grid items-center gap-3 md:grid-cols-[1fr_auto_180px]">
              <span className="text-sm font-label text-carbon">{touch.label}</span>
              <label className="inline-flex items-center gap-2 text-sm text-graphite">
                <input
                  type="checkbox"
                  checked={form[touch.doneKey]}
                  onChange={(event) => setField(touch.doneKey, event.target.checked)}
                  className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
                />
                Hecho
              </label>
              <input
                type="date"
                value={form[touch.dateKey] ?? ""}
                onChange={(event) =>
                  setField(touch.dateKey, sanitizeTextValue(event.target.value))
                }
                className={fieldClassName}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-label text-carbon">Notas</label>
          <textarea
            value={form.notas ?? ""}
            onChange={(event) => setField("notas", sanitizeTextValue(event.target.value))}
            className={cn(fieldClassName, "min-h-[110px] resize-none")}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
          <div>
            {lead ? (
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                Eliminar
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
