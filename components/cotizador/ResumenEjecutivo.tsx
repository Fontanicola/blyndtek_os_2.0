"use client";

import { Card } from "@/components/ui";

type ResumenEjecutivoProps = {
  value: string | null;
  onChange: (value: string) => void;
};

export function ResumenEjecutivo({ value, onChange }: ResumenEjecutivoProps) {
  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <h2 className="text-lg font-title text-carbon">Resumen ejecutivo</h2>
        <p className="mt-1 text-sm text-graphite">
          La IA propone una primera versión, pero podés ajustarla antes de avanzar al preview.
        </p>
      </div>

      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Resumen ejecutivo pendiente de generación."
        className="min-h-[260px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
      />
    </Card>
  );
}
