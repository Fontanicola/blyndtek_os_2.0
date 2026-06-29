import type { CalendarItem } from "@/types/calendario";
import type { TipoEvento } from "@/types/eventos";

const weekdayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export function formatCalendarMonth(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatCalendarDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

export function formatCalendarDayShort(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export function startOfMonth(date: Date) {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfMonth(date: Date) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  next.setDate(0);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  return addDays(next, -day);
}

export function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

export function getWeekdayNames() {
  return weekdayNames;
}

export function buildMonthGrid(date: Date) {
  const monthStart = startOfMonth(date);
  const firstDay = monthStart.getDay();
  const gridStart = addDays(monthStart, -firstDay);

  return Array.from({ length: 42 }, (_unused, index) => addDays(gridStart, index));
}

export function buildWeekDays(date: Date) {
  const weekStart = startOfWeek(date);
  return Array.from({ length: 7 }, (_unused, index) => addDays(weekStart, index));
}

export function buildHourSlots() {
  return Array.from({ length: 24 }, (_unused, index) => index);
}

export function formatHourLabel(hour: number) {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export function isSameDay(first: Date, second: Date) {
  return first.toDateString() === second.toDateString();
}

export function isInRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

export function itemStartsWithinRange(item: CalendarItem, start: Date, end: Date) {
  const itemStart = new Date(item.start);
  return isInRange(itemStart, start, end);
}

export function filterItemsByDate(items: CalendarItem[], start: Date, end: Date) {
  return items.filter((item) => {
    const itemStart = new Date(item.start);
    const itemEnd = new Date(item.end);

    return itemStart.getTime() <= end.getTime() && itemEnd.getTime() >= start.getTime();
  });
}

export function getEventTypeColor(tipo: TipoEvento) {
  if (tipo === "seguimiento") {
    return "warning" as const;
  }

  if (tipo === "tarea") {
    return "signal" as const;
  }

  if (tipo === "vencimiento") {
    return "danger" as const;
  }

  return "success" as const;
}

export function sortCalendarItems(items: CalendarItem[]) {
  return [...items].sort((first, second) => {
    return new Date(first.start).getTime() - new Date(second.start).getTime();
  });
}
