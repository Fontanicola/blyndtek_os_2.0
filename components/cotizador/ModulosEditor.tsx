"use client";

import { Button, Card } from "@/components/ui";
import type { Modulo } from "@/types/cotizaciones";
import { ModuloCard } from "@/components/cotizador/ModuloCard";

type ModulosEditorProps = {
  modulos: Modulo[];
  onChange: (modulos: Modulo[]) => void;
};

function createEmptyModule(): Modulo {
  return {
    id: crypto.randomUUID(),
    nombre: "",
    descripcion: "",
    features: []
  };
}

export function ModulosEditor({ modulos, onChange }: ModulosEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-title text-carbon">Módulos propuestos</h2>
          <p className="mt-1 text-sm text-graphite">
            Podés editar, reordenar conceptualmente, agregar o quitar módulos antes de confirmar.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            onChange([...modulos, createEmptyModule()]);
          }}
        >
          Agregar módulo
        </Button>
      </div>

      {modulos.length > 0 ? (
        <div className="space-y-4">
          {modulos.map((modulo, index) => (
            <ModuloCard
              key={modulo.id}
              index={index}
              modulo={modulo}
              onChange={(nextModulo) => {
                onChange(modulos.map((item) => (item.id === modulo.id ? nextModulo : item)));
              }}
              onRemove={() => {
                onChange(modulos.filter((item) => item.id !== modulo.id));
              }}
            />
          ))}
        </div>
      ) : (
        <Card padding="lg">
          <p className="text-sm text-graphite">
            Todavía no hay módulos generados. Usá el botón de arriba para pedirle una primera
            propuesta a la IA o crear uno manualmente.
          </p>
        </Card>
      )}
    </div>
  );
}
