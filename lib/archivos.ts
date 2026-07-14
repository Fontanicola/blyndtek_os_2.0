import type { Archivo, CarpetaConConteos, CarpetaContenido } from "@/types/archivos";

export function formatArchivoSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function isImageMime(tipoMime: string | null | undefined) {
  return Boolean(tipoMime?.startsWith("image/"));
}

export function getArchivoKind(tipoMime: string | null | undefined) {
  if (!tipoMime) {
    return "generic";
  }

  if (isImageMime(tipoMime)) {
    return "image";
  }

  if (tipoMime.includes("pdf")) {
    return "pdf";
  }

  if (tipoMime.includes("word") || tipoMime.includes("document")) {
    return "document";
  }

  if (tipoMime.includes("text")) {
    return "text";
  }

  return "generic";
}

export function sortCarpetasArchivos(
  carpetas: CarpetaConConteos[] | CarpetaContenido["subcarpetas"],
  archivos: Archivo[]
) {
  const sortByOrden = <T extends { orden: number; nombre: string }>(entries: T[]) =>
    [...entries].sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre));

  const sortedFolders = sortByOrden(carpetas);
  const sortedFiles = sortByOrden(archivos);

  return [...sortedFolders, ...sortedFiles].sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre));
}

export function getSeccionLabel(seccion: string) {
  switch (seccion) {
    case "clientes":
      return "Clientes";
    case "proyectos":
      return "Proyectos";
    case "comercial":
      return "Comercial";
    case "finanzas":
      return "Finanzas";
    case "general":
      return "General";
    default:
      return seccion;
  }
}
