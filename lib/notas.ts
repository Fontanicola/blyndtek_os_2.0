import type { Json } from "@/types/supabase";
import type { Nota } from "@/types/notas";
import type { NotaEtiquetaColor } from "@/types/notasEtiquetas";

export const NOTA_ETIQUETA_COLOR_OPTIONS = [
  { value: "default" as const, label: "Default", swatchClass: "bg-paper", dotClass: "bg-graphite" },
  { value: "amarillo" as const, label: "Amarillo", swatchClass: "bg-postit-amarillo", dotClass: "bg-warning" },
  { value: "rosa" as const, label: "Rosa", swatchClass: "bg-postit-rosa", dotClass: "bg-[#DB2777]" },
  { value: "celeste" as const, label: "Celeste", swatchClass: "bg-postit-celeste", dotClass: "bg-signal" },
  { value: "verde" as const, label: "Verde", swatchClass: "bg-postit-verde", dotClass: "bg-success" },
  { value: "violeta" as const, label: "Violeta", swatchClass: "bg-postit-violeta", dotClass: "bg-[#7C3AED]" }
] as const;

const NOTE_TAG_COLOR_CLASS_MAP: Record<NotaEtiquetaColor, { swatchClass: string; dotClass: string }> = {
  default: { swatchClass: "bg-paper", dotClass: "bg-graphite" },
  amarillo: { swatchClass: "bg-postit-amarillo", dotClass: "bg-warning" },
  rosa: { swatchClass: "bg-postit-rosa", dotClass: "bg-[#DB2777]" },
  celeste: { swatchClass: "bg-postit-celeste", dotClass: "bg-signal" },
  verde: { swatchClass: "bg-postit-verde", dotClass: "bg-success" },
  violeta: { swatchClass: "bg-postit-violeta", dotClass: "bg-[#7C3AED]" }
};

export function normalizeNotaEtiquetaColor(value: unknown): NotaEtiquetaColor {
  if (typeof value !== "string" || value === "default" || !value.trim()) {
    return "default";
  }

  if (value === "amarillo" || value === "rosa" || value === "celeste" || value === "verde" || value === "violeta") {
    return value;
  }

  return "default";
}

export function getNotaEtiquetaColorClasses(color: NotaEtiquetaColor | null | undefined) {
  return NOTE_TAG_COLOR_CLASS_MAP[color ?? "default"];
}

export function sanitizeNotaTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter((tag) => {
      if (!tag) {
        return false;
      }

      if (seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectText(value: unknown, chunks: string[]) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      chunks.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, chunks));
    return;
  }

  if (isRecord(value)) {
    Object.entries(value).forEach(([key, child]) => {
      if (key === "text" && typeof child === "string") {
        const trimmed = child.trim();
        if (trimmed) {
          chunks.push(trimmed);
        }
        return;
      }

      if (key === "content" || key === "attrs" || key === "marks") {
        collectText(child, chunks);
      }
    });
  }
}

export function createEmptyTipTapContent(): Json {
  return {
    type: "doc",
    content: [{ type: "paragraph" }]
  };
}

export function extractPlainTextFromContent(content: unknown): string {
  const chunks: string[] = [];
  collectText(content, chunks);
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

export function getNotaPreview(content: unknown) {
  const text = extractPlainTextFromContent(content);

  if (!text) {
    return "Sin contenido";
  }

  return text.slice(0, 140);
}

export function sortNotas(notes: Nota[]) {
  return [...notes].sort((first, second) => {
    if (first.fijada !== second.fijada) {
      return first.fijada ? -1 : 1;
    }

    return new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime();
  });
}

export function matchesNotaSearch(note: Nota, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const titleMatch = note.titulo.toLowerCase().includes(query);
  const contentMatch = extractPlainTextFromContent(note.contenido).toLowerCase().includes(query);

  return titleMatch || contentMatch;
}

export type LinkedNotaEntity =
  | { tipo: "cliente"; id: string; nombre: string }
  | { tipo: "proyecto"; id: string; nombre: string }
  | { tipo: "lead"; id: string; nombre: string };

export function getLinkedNotaEntity(note: Pick<Nota, "cliente_id" | "proyecto_id" | "lead_id">) {
  if (note.cliente_id) {
    return { tipo: "cliente", id: note.cliente_id } as const;
  }

  if (note.proyecto_id) {
    return { tipo: "proyecto", id: note.proyecto_id } as const;
  }

  if (note.lead_id) {
    return { tipo: "lead", id: note.lead_id } as const;
  }

  return null;
}
