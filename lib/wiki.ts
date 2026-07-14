import type { Json } from "@/types/supabase";
import type { WikiArticulo } from "@/types/wiki";
import { extractPlainTextFromContent } from "@/lib/notas";

export function createEmptyWikiContent(): Json {
  return {
    type: "doc",
    content: [{ type: "paragraph" }]
  };
}

export function getWikiPreview(content: unknown) {
  const text = extractPlainTextFromContent(content);

  if (!text) {
    return "Sin contenido";
  }

  return text.slice(0, 140);
}

export function sortWikiArticulos(articulos: WikiArticulo[]) {
  return [...articulos].sort((first, second) => {
    if (first.orden !== second.orden) {
      return first.orden - second.orden;
    }

    return new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime();
  });
}

export function matchesWikiSearch(articulo: WikiArticulo, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const titleMatch = articulo.titulo.toLowerCase().includes(query);
  const contentMatch = extractPlainTextFromContent(articulo.contenido).toLowerCase().includes(query);

  return titleMatch || contentMatch;
}
