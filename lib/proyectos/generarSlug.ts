const SLUG_SUFFIX_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generarSufijoAleatorio(length = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(bytes, (value) => SLUG_SUFFIX_CHARS[value % SLUG_SUFFIX_CHARS.length]).join("");
}

function normalizarSlugBase(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function generarSlugRoadmap(nombreCliente: string): string {
  const base = normalizarSlugBase(nombreCliente);
  const safeBase = base.length > 0 ? base : "proyecto";

  return `${safeBase}-${generarSufijoAleatorio()}`;
}
