"use client";

import { Card } from "@/components/ui";

type EntendimientoEditorProps = {
  value: string | null;
  onChange: (value: string) => void;
};

export function EntendimientoEditor({ value, onChange }: EntendimientoEditorProps) {
  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <h2 className="text-lg font-title text-carbon">Entendimiento del proyecto</h2>
        <p className="mt-1 text-sm text-graphite">
          El resumen del problema o contexto que la propuesta demuestra haber entendido.
        </p>
      </div>

      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Contá qué pasa hoy, qué limita la operación y qué necesita resolver el cliente."
        className="min-h-[220px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
    </Card>
  );
}
