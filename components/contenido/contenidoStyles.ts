import type { BadgeVariant } from "@/types/ui";
import type { PiezaContenidoEstado } from "@/types/contenido";

export const PIEZA_ESTADO_LABELS: Record<PiezaContenidoEstado, string> = {
  idea: "Idea",
  en_diseno: "En diseño",
  lista: "Lista",
  programada: "Programada",
  publicada: "Publicada",
  fallida: "Fallida"
};

export const PIEZA_ESTADO_BADGES: Record<PiezaContenidoEstado, BadgeVariant> = {
  idea: "default",
  en_diseno: "warning",
  lista: "signal",
  programada: "success",
  publicada: "success",
  fallida: "danger"
};

export const PILAR_COLOR_OPTIONS = [
  { value: "signal", label: "Signal", className: "bg-signal" },
  { value: "success", label: "Success", className: "bg-success" },
  { value: "warning", label: "Warning", className: "bg-warning" },
  { value: "danger", label: "Danger", className: "bg-danger" },
  { value: "graphite", label: "Graphite", className: "bg-graphite" }
];

export function getPilarDotClass(color?: string | null) {
  const option = PILAR_COLOR_OPTIONS.find((item) => item.value === color);
  return option?.className ?? "bg-signal";
}
