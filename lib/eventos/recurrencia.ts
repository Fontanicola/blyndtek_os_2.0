export type FrecuenciaReunion = "semanal" | "quincenal" | "mensual";

export type ConfiguracionRecurrencia = {
  frecuencia: FrecuenciaReunion;
  hasta: string;
};

function addMonthsKeepingDay(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function nextOccurrence(date: Date, frecuencia: FrecuenciaReunion) {
  if (frecuencia === "semanal") {
    const next = new Date(date);
    next.setDate(next.getDate() + 7);
    return next;
  }

  if (frecuencia === "quincenal") {
    const next = new Date(date);
    next.setDate(next.getDate() + 14);
    return next;
  }

  return addMonthsKeepingDay(date, 1);
}

export function buildRecurrenceOccurrences(
  fechaInicio: string,
  fechaFin: string,
  recurrence?: ConfiguracionRecurrencia | null
) {
  if (!recurrence?.frecuencia || !recurrence.hasta) {
    return [{ fecha_inicio: fechaInicio, fecha_fin: fechaFin }];
  }

  const start = new Date(fechaInicio);
  const end = new Date(fechaFin);
  const until = new Date(`${recurrence.hasta}T23:59:59`);
  const duration = end.getTime() - start.getTime();
  const occurrences: Array<{ fecha_inicio: string; fecha_fin: string }> = [];
  let current = new Date(start);

  while (current <= until && occurrences.length < 200) {
    occurrences.push({
      fecha_inicio: current.toISOString(),
      fecha_fin: new Date(current.getTime() + duration).toISOString()
    });
    current = nextOccurrence(current, recurrence.frecuencia);
  }

  return occurrences;
}
