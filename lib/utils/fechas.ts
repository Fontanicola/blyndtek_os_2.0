const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function fechaInputAString(valorInput: string): string {
  return valorInput;
}

export function hoyLocalString(reference = new Date()): string {
  return `${reference.getFullYear()}-${pad(reference.getMonth() + 1)}-${pad(reference.getDate())}`;
}

export function stringAFechaLocal(fechaString: string): Date {
  const [year = NaN, month = NaN, day = NaN] = fechaString.split("-").map((value) => Number(value));

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return new Date(NaN);
  }

  return new Date(year, month - 1, day);
}

export function esFechaSoloDia(fechaString: string | null | undefined): boolean {
  return Boolean(fechaString && DATE_ONLY_REGEX.test(fechaString));
}

export function fechaStringAFechaLocal(fechaString: string): Date {
  return esFechaSoloDia(fechaString) ? stringAFechaLocal(fechaString) : new Date(fechaString);
}

export function formatearFechaDisplay(fechaString: string): string {
  const fecha = stringAFechaLocal(fechaString);

  if (Number.isNaN(fecha.getTime())) {
    return "Sin fecha";
  }

  return fecha.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
