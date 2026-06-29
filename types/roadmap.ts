import type { Hito } from "@/types/cotizaciones";

export type FaseRoadmap = {
  nombre: string;
  semanaInicio: number;
  semanaFin: number;
  hito: Hito | null;
  modulos: string[];
};
