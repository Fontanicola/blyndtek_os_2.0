"use client";

import { Button, Card, Input } from "@/components/ui";
import type { Beneficio } from "@/types/cotizaciones";

const BENEFICIO_ICONOS = [
  { value: "automatizacion", label: "Automatización" },
  { value: "finanzas", label: "Finanzas" },
  { value: "fiscal", label: "Fiscal" },
  { value: "datos", label: "Datos" },
  { value: "seguridad", label: "Seguridad" },
  { value: "soporte", label: "Soporte" },
  { value: "crecimiento", label: "Crecimiento" }
] as const;

type BeneficiosEditorProps = {
  beneficios: Beneficio[];
  onChange: (beneficios: Beneficio[]) => void;
};

function createEmptyBeneficio(): Beneficio {
  return { titulo: "", descripcion: "", icono: "automatizacion" };
}

export function BeneficiosEditor({ beneficios, onChange }: BeneficiosEditorProps) {
  const currentBeneficios = beneficios ?? [];

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-title text-carbon">Beneficios clave</h2>
          <p className="mt-1 text-sm text-graphite">
            Convertí la solución en resultados concretos que el cliente pueda imaginar.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => onChange([...currentBeneficios, createEmptyBeneficio()])}
        >
          Agregar beneficio
        </Button>
      </div>

      {currentBeneficios.length > 0 ? (
        <div className="space-y-4">
          {currentBeneficios.map((beneficio, index) => (
            <div key={`${beneficio.titulo}-${index}`} className="space-y-3 rounded-card bg-paper p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
                  Beneficio {String(index + 1).padStart(2, "0")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange(
                      currentBeneficios.filter((_item, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  Eliminar
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <Input
                  label="Título"
                  value={beneficio.titulo}
                  onChange={(event) => {
                    const next = [...currentBeneficios];
                    next[index] = { ...beneficio, titulo: event.target.value };
                    onChange(next);
                  }}
                />

                <div className="space-y-1">
                  <label className="block text-sm font-label text-carbon">Ícono</label>
                  <select
                    value={beneficio.icono}
                    onChange={(event) => {
                      const next = [...currentBeneficios];
                      next[index] = { ...beneficio, icono: event.target.value };
                      onChange(next);
                    }}
                    className="h-10 w-full rounded-component border border-line bg-white px-3 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  >
                    {BENEFICIO_ICONOS.map((icono) => (
                      <option key={icono.value} value={icono.value}>
                        {icono.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-label text-carbon">Descripción</label>
                <textarea
                  value={beneficio.descripcion}
                  onChange={(event) => {
                    const next = [...currentBeneficios];
                    next[index] = { ...beneficio, descripcion: event.target.value };
                    onChange(next);
                  }}
                  className="min-h-[110px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  placeholder="Explicá el impacto concreto para el negocio."
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card padding="md" className="border border-dashed border-line-soft bg-paper">
          <p className="text-sm text-graphite">
            Todavía no hay beneficios generados. Podés pedirle a la IA una propuesta o cargar uno
            manualmente.
          </p>
        </Card>
      )}
    </Card>
  );
}
