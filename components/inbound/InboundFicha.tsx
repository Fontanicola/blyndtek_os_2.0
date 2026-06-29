"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { ETAPA_LABELS, sanitizeNumberValue, sanitizeTextValue } from "@/lib/leads";
import type { Lead, UpdateLeadInput } from "@/types/leads";

type InboundFichaProps = {
  lead: Lead;
  onUpdate: (input: UpdateLeadInput) => void | Promise<void>;
  onPasarACotizacion: (lead: Lead) => void;
};

type EditableTextProps = {
  label: string;
  value: string | null;
  placeholder?: string;
  multiline?: boolean;
  onSave: (value: string | null) => void;
  className?: string;
};

function stageVariant(lead: Lead) {
  if (lead.etapa === "calificado") {
    return "signal" as const;
  }

  if (lead.etapa === "cotizacion") {
    return "success" as const;
  }

  if (lead.etapa === "seguimiento") {
    return "warning" as const;
  }

  return "default" as const;
}

function confidenceVariant(value: Lead["nivel_confianza"]) {
  if (value === "alto") {
    return "signal" as const;
  }

  if (value === "medio") {
    return "warning" as const;
  }

  return "default" as const;
}

function formatWhatsAppLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function EditableText({
  label,
  value,
  placeholder = "Sin dato",
  multiline = false,
  onSave,
  className
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function commit() {
    setIsEditing(false);
    onSave(sanitizeTextValue(draft));
  }

  return (
    <div className={className}>
      <p className="mb-1 text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      {isEditing ? (
        multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            className="min-h-[110px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        ) : (
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            className="text-sm"
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(value ?? "");
            setIsEditing(true);
          }}
          className="w-full rounded-component px-2 py-1 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
        >
          {value || <span className="text-graphite">{placeholder}</span>}
        </button>
      )}
    </div>
  );
}

function EditableNumber({
  label,
  value,
  onSave
}: {
  label: string;
  value: number | null;
  onSave: (value: number | null) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");

  function commit() {
    setIsEditing(false);
    onSave(sanitizeNumberValue(draft));
  }

  return (
    <div>
      <p className="mb-1 text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      {isEditing ? (
        <Input
          type="number"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(value?.toString() ?? "");
            setIsEditing(true);
          }}
          className="w-full rounded-component px-2 py-1 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
        >
          {value !== null ? `USD ${value.toLocaleString("en-US")}` : (
            <span className="text-graphite">Sin dato</span>
          )}
        </button>
      )}
    </div>
  );
}

export function InboundFicha({ lead, onUpdate, onPasarACotizacion }: InboundFichaProps) {
  const [notaDraft, setNotaDraft] = useState("");
  const contacts = [
    {
      key: "1",
      nameKey: "contacto_1_nombre" as const,
      phoneKey: "contacto_1_tel" as const,
      label: "Contacto 1"
    },
    {
      key: "2",
      nameKey: "contacto_2_nombre" as const,
      phoneKey: "contacto_2_tel" as const,
      label: "Contacto 2"
    }
  ] as const;
  const notes = useMemo(() => {
    return (lead.notas ?? "")
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }, [lead.notas]);

  return (
    <Card padding="lg" className="overflow-hidden">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-title text-carbon">{lead.empresa}</h2>
            <Badge variant={stageVariant(lead)}>{ETAPA_LABELS[lead.etapa]}</Badge>
            <Badge variant={confidenceVariant(lead.nivel_confianza)}>
              {lead.nivel_confianza ?? "bajo"}
            </Badge>
          </div>

          <section className="space-y-3">
            <h3 className="text-sm font-title text-carbon">Empresa</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <EditableText label="Rubro" value={lead.rubro} onSave={(value) => void onUpdate({ rubro: value })} />
              <EditableText
                label="Ubicación"
                value={lead.ubicacion}
                onSave={(value) => void onUpdate({ ubicacion: value })}
              />
              <div>
                <p className="mb-1 text-xs font-label uppercase tracking-[0.08em] text-graphite">
                  Web
                </p>
                {lead.web ? (
                  <a
                    href={lead.web.startsWith("http") ? lead.web : `https://${lead.web}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-component px-2 py-1 text-sm text-signal transition-colors duration-fast ease-fast hover:bg-signal-light"
                  >
                    {lead.web}
                  </a>
                ) : (
                  <span className="px-2 py-1 text-sm text-graphite">Sin web</span>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-title text-carbon">Contactos</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {contacts.map((contact) => {
                const phone = lead[contact.phoneKey];
                return (
                  <div key={contact.key} className="rounded-card border border-line-soft bg-paper p-4">
                    <EditableText
                      label={contact.label}
                      value={lead[contact.nameKey]}
                      onSave={(value) => void onUpdate({ [contact.nameKey]: value })}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <EditableText
                        label="Teléfono"
                        value={phone}
                        onSave={(value) => void onUpdate({ [contact.phoneKey]: value })}
                        className="flex-1"
                      />
                      {phone ? (
                        <a
                          href={formatWhatsAppLink(phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center rounded-component bg-signal-light px-3 text-sm font-label text-signal transition-colors duration-fast ease-fast hover:bg-paper"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-title text-carbon">Contexto</h3>
            <EditableText
              label="Necesidad / dolor"
              value={lead.contexto}
              placeholder="Agregar contexto"
              multiline
              onSave={(value) => void onUpdate({ contexto: value })}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-title text-carbon">Historial de notas</h3>
            <div className="space-y-2">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div
                    key={`${lead.id}-${note}`}
                    className="rounded-card border border-line-soft bg-paper px-4 py-3 text-sm text-carbon"
                  >
                    {note}
                  </div>
                ))
              ) : (
                <div className="rounded-card border border-dashed border-line bg-paper px-4 py-6 text-sm text-graphite">
                  Sin notas todavía
                </div>
              )}
            </div>

            <div className="space-y-2">
              <textarea
                value={notaDraft}
                onChange={(event) => setNotaDraft(event.target.value)}
                placeholder="Agregar nueva nota"
                className="min-h-[90px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    const trimmed = notaDraft.trim();

                    if (!trimmed) {
                      return;
                    }

                    const timestamp = new Intl.DateTimeFormat("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false
                    }).format(new Date());

                    void onUpdate({
                      notas: `[${timestamp}] ${trimmed}${lead.notas ? `\n${lead.notas}` : ""}`
                    });
                    setNotaDraft("");
                  }}
                >
                  Agregar nota
                </Button>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-title text-carbon">Detalles</h3>
            <EditableText
              label="Referido por"
              value={lead.referido_por}
              onSave={(value) => void onUpdate({ referido_por: value })}
            />
            <EditableText
              label="Relación"
              value={lead.relacion}
              onSave={(value) => void onUpdate({ relacion: value })}
            />
            <EditableNumber
              label="Presupuesto estimado"
              value={lead.presupuesto_estimado}
              onSave={(value) => void onUpdate({ presupuesto_estimado: value })}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-title text-carbon">Toques</h3>
            {[
              {
                label: "Llamada",
                doneKey: "llamada_hecho" as const,
                dateKey: "llamada_fecha" as const
              },
              {
                label: "Seg 1",
                doneKey: "seg1_hecho" as const,
                dateKey: "seg1_fecha" as const
              },
              {
                label: "Seg 2",
                doneKey: "seg2_hecho" as const,
                dateKey: "seg2_fecha" as const
              }
            ].map((touch) => (
              <div key={touch.label} className="grid items-center gap-3 grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-label text-carbon">{touch.label}</p>
                  <input
                    type="date"
                    value={lead[touch.dateKey] ?? ""}
                    onChange={(event) =>
                      void onUpdate({
                        [touch.dateKey]: sanitizeTextValue(event.target.value)
                      })
                    }
                    className="mt-2 w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  />
                </div>
                <label className="mt-5 inline-flex items-center gap-2 text-sm text-graphite">
                  <input
                    type="checkbox"
                    checked={lead[touch.doneKey]}
                    onChange={(event) =>
                      void onUpdate({
                        [touch.doneKey]: event.target.checked
                      })
                    }
                    className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
                  />
                  Hecho
                </label>
              </div>
            ))}
          </section>

          <div className="space-y-3 pt-2">
            <Button className="w-full" onClick={() => onPasarACotizacion(lead)}>
              Pasar a cotización
            </Button>
            <Button
              variant="ghost"
              className="w-full text-danger hover:bg-danger-light hover:text-danger"
              onClick={() => void onUpdate({ etapa: "descartado", motivo_descarte: "Descartado manualmente" })}
            >
              Marcar como descartado
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
