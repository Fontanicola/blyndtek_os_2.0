"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sortWikiArticulos } from "@/lib/wiki";
import type {
  CreateWikiArticuloInput,
  CreateWikiCategoriaInput,
  UpdateWikiArticuloInput,
  WikiArticulo,
  WikiCategoria
} from "@/types/wiki";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type WikiArticuloFilters = {
  categoria_id?: string | null;
  buscar?: string | null;
};

function buildQueryString(filters?: WikiArticuloFilters) {
  const searchParams = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function useWiki() {
  const [categorias, setCategorias] = useState<Array<WikiCategoria & { cantidad_articulos: number }>>([]);
  const [articulos, setArticulos] = useState<WikiArticulo[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [loadingArticulos, setLoadingArticulos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentArticuloFiltersRef = useRef<WikiArticuloFilters>({});
  const pendingTimerRef = useRef<Record<string, number>>({});
  const pendingPayloadRef = useRef<Record<string, UpdateWikiArticuloInput>>({});
  const inFlightRef = useRef(0);

  const syncSavingState = useCallback(() => {
    setSaving(Object.keys(pendingTimerRef.current).length > 0 || inFlightRef.current > 0);
  }, []);

  const fetchCategorias = useCallback(async () => {
    setLoadingCategorias(true);
    setError(null);

    try {
      const response = await fetch("/api/wiki-categorias");
      const payload = (await response.json()) as ApiResponse<Array<WikiCategoria & { cantidad_articulos: number }>>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las categorías de la wiki.");
      }

      setCategorias(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las categorías de la wiki.";
      setError(message);
      return [];
    } finally {
      setLoadingCategorias(false);
    }
  }, []);

  const fetchArticulos = useCallback(async (filters?: WikiArticuloFilters) => {
    setLoadingArticulos(true);
    setError(null);
    currentArticuloFiltersRef.current = filters ?? {};

    try {
      const response = await fetch(`/api/wiki-articulos${buildQueryString(filters)}`);
      const payload = (await response.json()) as ApiResponse<WikiArticulo[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar los artículos.");
      }

      setArticulos(sortWikiArticulos(payload.data));
      return payload.data;
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los artículos.";
      setError(message);
      return [];
    } finally {
      setLoadingArticulos(false);
    }
  }, []);

  const fetchArticulo = useCallback(async (id: string) => {
    const response = await fetch(`/api/wiki-articulos/${id}`);
    const payload = (await response.json()) as ApiResponse<WikiArticulo>;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar el artículo.");
    }

    return payload.data;
  }, []);

  const persistArticulo = useCallback(
    async (id: string, input: UpdateWikiArticuloInput) => {
      const response = await fetch(`/api/wiki-articulos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as ApiResponse<WikiArticulo>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo actualizar el artículo.");
      }

      setArticulos((current) => sortWikiArticulos(current.map((item) => (item.id === id ? payload.data! : item))));
      return payload.data;
    },
    []
  );

  const updateArticulo = useCallback(
    async (id: string, input: UpdateWikiArticuloInput) => {
      setError(null);

      setArticulos((current) =>
        sortWikiArticulos(
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...input
                }
              : item
          ) as WikiArticulo[]
        )
      );

      pendingPayloadRef.current[id] = {
        ...(pendingPayloadRef.current[id] ?? {}),
        ...input
      };

      if (pendingTimerRef.current[id]) {
        window.clearTimeout(pendingTimerRef.current[id]);
      }

      syncSavingState();

      pendingTimerRef.current[id] = window.setTimeout(() => {
        const payload = pendingPayloadRef.current[id] ?? {};
        delete pendingPayloadRef.current[id];
        delete pendingTimerRef.current[id];
        inFlightRef.current += 1;
        syncSavingState();

        void persistArticulo(id, payload)
          .then(() => {
            void fetchArticulos(currentArticuloFiltersRef.current);
            void fetchCategorias();
          })
          .catch((persistError) => {
            const message =
              persistError instanceof Error ? persistError.message : "No se pudo guardar el artículo.";
            setError(message);
          })
          .finally(() => {
            inFlightRef.current -= 1;
            syncSavingState();
          });
      }, 1500);
    },
    [fetchArticulos, fetchCategorias, persistArticulo, syncSavingState]
  );

  const createCategoria = useCallback(
    async (input: CreateWikiCategoriaInput) => {
      setError(null);

      const response = await fetch("/api/wiki-categorias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as ApiResponse<WikiCategoria>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear la categoría.");
      }

      await fetchCategorias();
      return payload.data;
    },
    [fetchCategorias]
  );

  const createArticulo = useCallback(
    async (input: CreateWikiArticuloInput) => {
      setError(null);

      const response = await fetch("/api/wiki-articulos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as ApiResponse<WikiArticulo>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear el artículo.");
      }

      await fetchArticulos(currentArticuloFiltersRef.current);
      await fetchCategorias();
      return payload.data;
    },
    [fetchArticulos, fetchCategorias]
  );

  const deleteArticulo = useCallback(
    async (id: string) => {
      setError(null);

      const response = await fetch(`/api/wiki-articulos/${id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as ApiResponse<null>;

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar el artículo.");
      }

      await fetchArticulos(currentArticuloFiltersRef.current);
      await fetchCategorias();
    },
    [fetchArticulos, fetchCategorias]
  );

  useEffect(() => {
    const pendingTimers = pendingTimerRef.current;
    return () => {
      Object.values(pendingTimers).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return {
    categorias,
    articulos,
    loadingCategorias,
    loadingArticulos,
    saving,
    error,
    setCategorias,
    setArticulos,
    fetchCategorias,
    fetchArticulos,
    fetchArticulo,
    createCategoria,
    createArticulo,
    updateArticulo,
    deleteArticulo
  };
}
