"use client";

import { Card } from "@/components/ui";

type JustificacionPrecioEditorProps = {
  value: string | null;
  onChange: (value: string) => void;
};

export function JustificacionPrecioEditor({ value, onChange }: JustificacionPrecioEditorProps) {
  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <h2 className="text-lg font-title text-carbon">Justificación del precio</h2>
        <p className="mt-1 text-sm text-graphite">
          Explicación comercial de por qué la inversión es coherente con el alcance.
        </p>
      </div>

      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Explicá por qué el precio es competitivo para lo que incluye."
        className="min-h-[180px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
    </Card>
  );
}
