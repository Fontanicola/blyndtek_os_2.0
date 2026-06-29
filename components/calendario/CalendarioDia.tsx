"use client";

import { cn } from "@/lib/cn";
import { buildHourSlots, formatCalendarDate, formatHourLabel, filterItemsByDate } from "@/lib/calendario";
import type { CalendarItem } from "@/types/calendario";
import { EventoChip } from "./EventoChip";

type CalendarioDiaProps = {
  currentDate: Date;
  items: CalendarItem[];
  onEventClick?: (item: CalendarItem) => void;
};

function getItemTop(item: CalendarItem) {
  const date = new Date(item.start);
  return date.getHours() * 48 + (date.getMinutes() / 60) * 48;
}

function getItemHeight(item: CalendarItem) {
  const start = new Date(item.start).getTime();
  const end = new Date(item.end).getTime();
  return Math.max(40, ((end - start) / (1000 * 60 * 60)) * 48);
}

export function CalendarioDia({ currentDate, items, onEventClick }: CalendarioDiaProps) {
  const hours = buildHourSlots();
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);
  const dayItems = filterItemsByDate(items, dayStart, dayEnd);

  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className="mb-4">
        <div className="text-lg font-title text-carbon">{formatCalendarDate(currentDate)}</div>
        <div className="text-sm text-graphite">Vista diaria</div>
      </div>

      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-[72px_minmax(0,1fr)] border-t border-line-soft py-3">
            <div className="pr-3 text-right text-[11px] text-graphite">{formatHourLabel(hour)}</div>
            <div className="relative min-h-12" />
          </div>
        ))}

        <div className="pointer-events-none absolute inset-0">
          {dayItems.map((item) => (
            <div
              key={item.id}
              className={cn("absolute left-[76px] right-4")}
              style={{
                top: `${getItemTop(item)}px`,
                height: `${getItemHeight(item)}px`
              }}
            >
              <div className="pointer-events-auto">
                <EventoChip item={item} onClick={onEventClick ? () => onEventClick(item) : undefined} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
