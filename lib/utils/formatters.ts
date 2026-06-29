import type { Hito } from "@/types/cotizaciones";
import type { FaseRoadmap } from "@/types/roadmap";

export function formatUSD(amount: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
  });

  return `$${formatter.format(amount)} USD`;
}

export function formatFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(fecha));
}

export function formatSemanas(semanas: number): string {
  return `${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
}

export function calcularFechaEntrega(fechaInicio: Date, semanas: number): Date {
  const result = new Date(fechaInicio);
  const workingDaysToAdd = Math.max(semanas, 0) * 5;
  let addedDays = 0;

  while (addedDays < workingDaysToAdd) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();

    if (day !== 0 && day !== 6) {
      addedDays += 1;
    }
  }

  return result;
}

export function generarFasesRoadmap(hitos: Hito[], plazoSemanas: number): FaseRoadmap[] {
  const totalWeeks = Math.max(plazoSemanas, 1);

  if (hitos.length === 0) {
    return [
      {
        nombre: "Fase 01",
        semanaInicio: 1,
        semanaFin: totalWeeks,
        hito: null,
        modulos: []
      }
    ];
  }

  return hitos.map((hito, index) => {
    const start = Math.floor((index * totalWeeks) / hitos.length) + 1;
    const rawEnd = Math.floor(((index + 1) * totalWeeks) / hitos.length);
    const end = index === hitos.length - 1 ? totalWeeks : Math.max(rawEnd, start);

    return {
      nombre: `Fase ${String(index + 1).padStart(2, "0")}`,
      semanaInicio: start,
      semanaFin: end,
      hito,
      modulos: []
    };
  });
}
