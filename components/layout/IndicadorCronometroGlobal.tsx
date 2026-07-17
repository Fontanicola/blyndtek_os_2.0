"use client";

import { Button } from "@/components/ui";
import { ClockIcon } from "@/components/ui/icons";
import { formatClock } from "@/lib/tiempo";
import { useCronometro } from "@/lib/hooks/useCronometro";

export function IndicadorCronometroGlobal() {
  const { sesionActiva, tiempoTranscurrido, pausar } = useCronometro();

  if (!sesionActiva) {
    return null;
  }

  return (
    <div className="hidden items-center gap-2 rounded-pill bg-paper px-3 py-1.5 md:flex">
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-xs font-label text-carbon">
          <ClockIcon />
          <span className="truncate">{sesionActiva.fase_nombre ?? "Sin nombre"} · {formatClock(tiempoTranscurrido)}</span>
        </p>
        <p className="truncate text-[11px] text-graphite">{sesionActiva.proyecto_nombre ?? "Sin proyecto"}</p>
      </div>

      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void pausar(sesionActiva.id)}>
        Pausar
      </Button>
    </div>
  );
}
