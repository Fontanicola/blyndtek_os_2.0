"use client";

import { cn } from "@/lib/cn";
import { buildMonthGrid, filterItemsByDate, getWeekdayNames, isSameDay } from "@/lib/calendario";
import type { CalendarItem } from "@/types/calendario";
import { EventoChip } from "./EventoChip";

type CalendarioMesProps = {
  currentDate: Date;
  items: CalendarItem[];
  onEventClick?: (item: CalendarItem) => void;
};

export function CalendarioMes({ currentDate, items, onEventClick }: CalendarioMesProps) {
  const days = buildMonthGrid(currentDate);
  const weekdayNames = getWeekdayNames();
  const month = currentDate.getMonth();

  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className="grid grid-cols-7 gap-2 border-b border-line-soft pb-3 text-xs font-label uppercase tracking-widest text-graphite">
        {weekdayNames.map((day) => (
          <div key={day} className="px-2">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          const dayItems = filterItemsByDate(items, dayStart, dayEnd);
          const visibleItems = dayItems.slice(0, 3);
          const moreCount = Math.max(0, dayItems.length - visibleItems.length);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[140px] rounded-card border border-line-soft bg-paper p-3 text-left transition-colors duration-fast ease-fast",
                isSameDay(day, new Date()) && "border-signal bg-signal-light/30",
                day.getMonth() !== month && "opacity-50"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-label text-carbon">{day.getDate()}</span>
              </div>

              <div className="space-y-1.5">
                {visibleItems.map((item) => (
                  <EventoChip
                    key={item.id}
                    item={item}
                    compact
                    onClick={onEventClick ? () => onEventClick(item) : undefined}
                  />
                ))}
                {moreCount > 0 ? (
                  <div className="text-[11px] font-label text-graphite">+{moreCount} más</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
