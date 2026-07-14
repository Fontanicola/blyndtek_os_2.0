import type { Caja } from "@/types/cajas";

export const CAJA_COLOR_OPTIONS = ["success", "signal", "warning", "danger", "graphite"] as const;

export const LEGACY_CUENTA_MEDIO_ALIASES: Record<string, string> = {
  transferencia: "transferencia_bancaria",
  mercadopago: "mercado_pago",
  stripe: "dolar_app"
};

export function normalizeCajaSlug(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return LEGACY_CUENTA_MEDIO_ALIASES[value] ?? value;
}

export function getLegacyCuentaMedioValues(slug: string) {
  return Object.entries(LEGACY_CUENTA_MEDIO_ALIASES)
    .filter(([, target]) => target === slug)
    .map(([alias]) => alias);
}

export function buildCajaSlug(nombre: string) {
  const normalized = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return normalized || "caja";
}

export function formatCajaLabel(slug: string | null | undefined, cajas: Caja[]) {
  const normalized = normalizeCajaSlug(slug);
  if (!normalized) {
    return "Sin medio";
  }

  const caja = cajas.find((item) => item.slug === normalized);
  if (caja) {
    return caja.nombre;
  }

  return normalized.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getCajaColorClasses(color: string) {
  switch (color) {
    case "success":
      return "text-success";
    case "signal":
      return "text-signal";
    case "warning":
      return "text-warning";
    case "danger":
      return "text-danger";
    default:
      return "text-graphite";
  }
}

export function getCajaLightBg(color: string) {
  switch (color) {
    case "success":
      return "bg-success-light";
    case "signal":
      return "bg-signal-light";
    case "warning":
      return "bg-warning-light";
    case "danger":
      return "bg-danger-light";
    default:
      return "bg-paper";
  }
}
