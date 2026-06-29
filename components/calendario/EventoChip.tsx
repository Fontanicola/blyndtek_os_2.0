"use client";

import { cn } from "@/lib/cn";
import type { CalendarItem } from "@/types/calendario";

type EventoChipProps = {
  item: CalendarItem;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
};

const typeClasses: Record<CalendarItem["tipo"], string> = {
  tarea: "bg-signal-light text-signal",
  seguimiento: "bg-warning-light text-warning",
  vencimiento: "bg-danger-light text-danger",
  reunion: "bg-success-light text-success"
};

function formatEventTime(value: string) {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

export function EventoChip({ item, compact = false, className, onClick }: EventoChipProps) {
  const content = (
    <div className="flex items-start gap-2">
      <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-current" />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[11px]", compact ? "leading-4" : "leading-4")}>
          {item.titulo}
        </div>
        <div className="mt-0.5 text-[10px] text-current/70">
          {formatEventTime(item.start)}
          {item.details ? ` · ${item.details}` : ""}
        </div>
      </div>
    </div>
  );

  const classes = cn(
    "w-full rounded-component px-2.5 py-1 text-left text-xs font-label transition-all duration-fast ease-fast",
    "focus:outline-none focus:ring-2 focus:ring-signal/20",
    typeClasses[item.tipo],
    onClick ? "cursor-pointer hover:opacity-90" : "cursor-default",
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}
