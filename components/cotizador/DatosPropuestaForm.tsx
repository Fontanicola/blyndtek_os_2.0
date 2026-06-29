"use client";

import { useMemo, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { DATOS_PROPUESTA_DEFAULT } from "@/lib/cotizador/defaults";
import type { Cotizacion, DatosPropuesta, UpdateCotizacionInput } from "@/types/cotizaciones";

type DatosPropuestaFormProps = {
  cotizacion: Cotizacion;
  onChange: (input: UpdateCotizacionInput) => void;
};

function createEmptyFirmante() {
  return { nombre: "", rol: "" };
}

export function DatosPropuestaForm({ cotizacion, onChange }: DatosPropuestaFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo(
    () => ({
      ...DATOS_PROPUESTA_DEFAULT,
      ...cotizacion.datos_propuesta,
      preparado_para: cotizacion.datos_propuesta?.preparado_para || cotizacion.empresa,
      firmantes: (cotizacion.datos_propuesta?.firmantes ?? DATOS_PROPUESTA_DEFAULT.firmantes).map(
        (firmante) => ({ ...firmante })
      )
    }),
    [cotizacion.datos_propuesta, cotizacion.empresa]
  );

  function updateData(next: DatosPropuesta) {
    onChange({
      datos_propuesta: {
        ...next,
        firmantes: (next.firmantes ?? []).map((firmante) => ({ ...firmante }))
      }
    });
  }

  function updateField<K extends keyof DatosPropuesta>(key: K, nextValue: DatosPropuesta[K]) {
    updateData({
      ...value,
      [key]: nextValue
    });
  }

  return (
    <Card padding="md" className="space-y-4 border border-line-soft bg-paper">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-title text-carbon">Datos de la propuesta</p>
          <p className="text-xs text-graphite">
            Portada y contacto comercial que se verán en la propuesta final.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "Ocultar" : "Editar"}
        </Button>
      </div>

      {isOpen ? (
        <div className="space-y-5 border-t border-line-soft pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Preparado para"
              value={value.preparado_para}
              onChange={(event) => updateField("preparado_para", event.target.value)}
            />
            <Input
              label="Título del sistema"
              value={value.titulo_sistema}
              onChange={(event) => updateField("titulo_sistema", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-label text-carbon">Subtítulo del sistema</label>
            <textarea
              value={value.subtitulo_sistema}
              onChange={(event) => updateField("subtitulo_sistema", event.target.value)}
              rows={3}
              className="min-h-[88px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              placeholder="Descripción corta que acompaña el título de la propuesta."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-title text-carbon">Firmantes</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateField("firmantes", [...(value.firmantes ?? []), createEmptyFirmante()])
                }
              >
                + Agregar
              </Button>
            </div>

            <div className="space-y-3">
              {(value.firmantes ?? []).map((firmante, index) => (
                <div
                  key={`${firmante.nombre}-${index}`}
                  className="grid gap-3 rounded-card bg-white p-3 shadow-soft md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_auto]"
                >
                  <Input
                    label={index === 0 ? "Nombre" : undefined}
                    placeholder="Nombre y apellido"
                    value={firmante.nombre}
                    onChange={(event) => {
                      const currentFirmantes = value.firmantes ?? [];
                      const nextFirmantes = [...currentFirmantes];
                      nextFirmantes[index] = {
                        ...firmante,
                        nombre: event.target.value
                      };
                      updateField("firmantes", nextFirmantes);
                    }}
                  />
                  <Input
                    label={index === 0 ? "Rol" : undefined}
                    placeholder="CEO"
                    value={firmante.rol}
                    onChange={(event) => {
                      const currentFirmantes = value.firmantes ?? [];
                      const nextFirmantes = [...currentFirmantes];
                      nextFirmantes[index] = {
                        ...firmante,
                        rol: event.target.value
                      };
                      updateField("firmantes", nextFirmantes);
                    }}
                  />
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const currentFirmantes = value.firmantes ?? [];

                        if (currentFirmantes.length === 1) {
                          return;
                        }

                        updateField(
                          "firmantes",
                          currentFirmantes.filter((_item, itemIndex) => itemIndex !== index)
                        );
                      }}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Email de contacto"
              type="email"
              value={value.email_contacto}
              onChange={(event) => updateField("email_contacto", event.target.value)}
            />
            <Input
              label="Teléfono de contacto"
              value={value.telefono_contacto}
              onChange={(event) => updateField("telefono_contacto", event.target.value)}
            />
            <Input
              label="Instagram"
              value={value.instagram}
              onChange={(event) => updateField("instagram", event.target.value)}
            />
            <Input
              label="LinkedIn"
              value={value.linkedin}
              onChange={(event) => updateField("linkedin", event.target.value)}
            />
          </div>

          <Input
            label="Validez en días"
            type="number"
            value={value.validez_dias.toString()}
            onChange={(event) => {
              const next = Number(event.target.value);
              updateField("validez_dias", Number.isFinite(next) && next > 0 ? next : 30);
            }}
          />
        </div>
      ) : null}
    </Card>
  );
}
