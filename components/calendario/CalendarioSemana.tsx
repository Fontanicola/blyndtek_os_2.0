"use client";

import { cn } from "@/lib/cn";
import { buildHourSlots, buildWeekDays, filterItemsByDate, formatHourLabel, isSameDay } from "@/lib/calendario";
import type { CalendarItem } from "@/types/calendario";
import { EventoChip } from "./EventoChip";

type CalendarioSemanaProps = {
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

export function CalendarioSemana({ currentDate, items, onEventClick }: CalendarioSemanaProps) {
  const days = buildWeekDays(currentDate);
  const hours = buildHourSlots();

  return (
    <div className="rounded-card bg-white p-4 shadow-card">
      <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-line-soft pb-3 text-xs font-label uppercase tracking-widest text-graphite">
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className={cn("px-2", isSameDay(day, new Date()) && "text-signal")}>
            <div className="text-sm uppercase tracking-normal text-carbon">
              {day.toLocaleDateString("es-AR", { weekday: "short" })}
            </div>
            <div className="text-xs normal-case text-graphite">{day.getDate()}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[72px_repeat(7,minmax(0,1fr))]">
        <div className="pr-2">
          {hours.map((hour) => (
            <div key={hour} className="h-12 border-b border-line-soft pr-2 text-right text-[11px] text-graphite">
              <span className="relative -top-2">{formatHourLabel(hour)}</span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          const dayItems = filterItemsByDate(items, dayStart, dayEnd);

          return (
            <div key={day.toISOString()} className="relative border-l border-line-soft">
              <div className="relative h-[1152px]">
                {hours.map((hour) => (
                  <div key={hour} className="h-12 border-b border-line-soft" />
                ))}

                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className="absolute left-2 right-2"
                    style={{
                      top: `${getItemTop(item)}px`,
                      height: `${getItemHeight(item)}px`
                    }}
                  >
                    <EventoChip
                      item={item}
                      onClick={onEventClick ? () => onEventClick(item) : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
