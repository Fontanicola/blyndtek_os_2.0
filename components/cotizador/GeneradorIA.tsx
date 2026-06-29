"use client";

import { Button, Card } from "@/components/ui";
import type { Cotizacion } from "@/types/cotizaciones";

type GeneradorIAProps = {
  cotizacion: Cotizacion;
  loading: boolean;
  onGenerate: () => void;
};

export function GeneradorIA({ cotizacion, loading, onGenerate }: GeneradorIAProps) {
  const contextCount = cotizacion.contexto_chat.filter((mensaje) => mensaje.rol === "user").length;
  const attachmentsCount = cotizacion.adjuntos.length;

  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <h2 className="text-lg font-title text-carbon">Generador IA</h2>
        <p className="mt-1 text-sm text-graphite">
          Claude va a leer parámetros, chat de contexto y adjuntos para escribir la propuesta
          comercial completa: entendimiento, beneficios, módulos, justificación y mantenimiento.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-line-soft bg-paper px-4 py-3">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
            Mensajes
          </p>
          <p className="mt-1 text-lg font-title text-carbon">{contextCount}</p>
        </div>
        <div className="rounded-card border border-line-soft bg-paper px-4 py-3">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
            Adjuntos
          </p>
          <p className="mt-1 text-lg font-title text-carbon">{attachmentsCount}</p>
        </div>
        <div className="rounded-card border border-line-soft bg-paper px-4 py-3">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
            Módulos actuales
          </p>
          <p className="mt-1 text-lg font-title text-carbon">{cotizacion.modulos.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graphite">
          {contextCount > 0 || attachmentsCount > 0
            ? "La base de contexto está lista para generar la propuesta."
            : "Podés generar con los parámetros actuales, aunque el resultado mejora con más contexto."}
        </p>
        <Button onClick={onGenerate} loading={loading}>
          Generar propuesta
        </Button>
      </div>
    </Card>
  );
}
