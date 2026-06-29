"use client";

import { Card } from "@/components/ui";
import type { Cotizacion } from "@/types/cotizaciones";

type ContextoResumenProps = {
  cotizacion: Cotizacion;
};

function getLastUserMessage(cotizacion: Cotizacion) {
  const userMessages = cotizacion.contexto_chat.filter((mensaje) => mensaje.rol === "user");
  return userMessages[userMessages.length - 1] ?? null;
}

function truncateText(text: string, limit: number) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}...`;
}

export function ContextoResumen({ cotizacion }: ContextoResumenProps) {
  const lastUserMessage = getLastUserMessage(cotizacion);

  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <h3 className="text-base font-title text-carbon">Resumen del contexto</h3>
        <p className="mt-1 text-sm text-graphite">
          Lo que la IA va a leer antes de proponer módulos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-card border border-line-soft bg-paper px-4 py-3">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
            Mensajes
          </p>
          <p className="mt-1 text-lg font-title text-carbon">{cotizacion.contexto_chat.length}</p>
        </div>

        <div className="rounded-card border border-line-soft bg-paper px-4 py-3">
          <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
            Adjuntos
          </p>
          <p className="mt-1 text-lg font-title text-carbon">{cotizacion.adjuntos.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
          Archivos cargados
        </p>
        {cotizacion.adjuntos.length > 0 ? (
          <div className="space-y-2">
            {cotizacion.adjuntos.map((adjunto) => (
              <div
                key={adjunto.nombre}
                className="rounded-card border border-line-soft bg-paper px-3 py-2 text-sm text-carbon"
              >
                {adjunto.nombre}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-graphite">Todavía no hay adjuntos.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">
          Último mensaje
        </p>
        <div className="rounded-card border border-line-soft bg-paper px-4 py-3 text-sm text-carbon">
          {lastUserMessage ? truncateText(lastUserMessage.contenido, 100) : "Todavía no hay mensajes."}
        </div>
      </div>
    </Card>
  );
}
