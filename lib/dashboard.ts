import type { DashboardPeriod } from "@/types/dashboard";

export type PeriodRange = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getDashboardPeriodRange(period: DashboardPeriod): PeriodRange {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  if (period === "quarter") {
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    const previousEnd = new Date(start);
    const previousStart = startOfMonth(new Date(start.getFullYear(), start.getMonth() - 3, 1));

    return {
      start,
      end: now,
      previousStart,
      previousEnd,
      label: "Último trimestre"
    };
  }

  if (period === "year") {
    const start = startOfYear(now);
    const previousEnd = new Date(start);
    const previousStart = new Date(start.getFullYear() - 1, 0, 1);

    return {
      start,
      end: now,
      previousStart,
      previousEnd,
      label: "Este año"
    };
  }

  const start = startOfMonth(now);
  const previousEnd = new Date(start);
  const previousStart = startOfMonth(new Date(start.getFullYear(), start.getMonth() - 1, 1));

  return {
    start,
    end: now,
    previousStart,
    previousEnd,
    label: "Este mes"
  };
}

export function isInRange(date: string, start: Date, end: Date) {
  const current = new Date(date);
  return current >= start && current < end;
}

export function getCurrentWeekRange(reference = new Date()) {
  const start = startOfWeek(reference);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
