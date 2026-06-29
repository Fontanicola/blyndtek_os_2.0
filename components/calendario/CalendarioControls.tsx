"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatCalendarMonth } from "@/lib/calendario";
import type { CalendarViewMode } from "@/types/calendario";

type CalendarioControlsProps = {
  mode: CalendarViewMode;
  currentDate: Date;
  onModeChange: (mode: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewEvent: () => void;
};

const modes: Array<{ mode: CalendarViewMode; label: string }> = [
  { mode: "month", label: "Mes" },
  { mode: "week", label: "Semana" },
  { mode: "day", label: "Día" }
];

export function CalendarioControls({
  mode,
  currentDate,
  onModeChange,
  onPrevious,
  onNext,
  onToday,
  onNewEvent
}: CalendarioControlsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <div className="text-sm font-title text-carbon">{formatCalendarMonth(currentDate)}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onPrevious}>
            ←
          </Button>
          <Button variant="secondary" size="sm" onClick={onToday}>
            Hoy
          </Button>
          <Button variant="secondary" size="sm" onClick={onNext}>
            →
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-pill bg-paper p-1">
          {modes.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onModeChange(item.mode)}
              className={cn(
                "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
                mode === item.mode ? "bg-white text-carbon shadow-soft" : "text-graphite hover:text-carbon"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Button variant="primary" size="sm" onClick={onNewEvent}>
          Nuevo evento
        </Button>
      </div>
    </div>
  );
}
