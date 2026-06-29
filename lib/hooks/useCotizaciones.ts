"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CONDICIONES_COMERCIALES_DEFAULT,
  DATOS_PROPUESTA_DEFAULT,
  SUPUESTOS_DEFAULT
} from "@/lib/cotizador/defaults";
import type {
  Cotizacion,
  CreateCotizacionInput,
  EstadoCotizacion,
  DatosPropuesta,
  Beneficio,
  DiferenciadorBlyndtek,
  UpdateCotizacionInput
} from "@/types/cotizaciones";

type CotizacionesResponse<T> = {
  data?: T;
  error?: string;
};

type DeleteResponse = {
  success?: boolean;
  error?: string;
};

type CotizacionFilters = {
  estado?: EstadoCotizacion;
  lead_id?: string;
  cliente_id?: string;
};

function cloneFirmantes(firmantes: DatosPropuesta["firmantes"]) {
  return (firmantes ?? []).map((firmante) => ({ ...firmante }));
}

function normalizeDatosPropuesta(
  empresa: string,
  datosPropuesta: Cotizacion["datos_propuesta"]
) {
  const fallback = {
    ...DATOS_PROPUESTA_DEFAULT,
    preparado_para: empresa,
    firmantes: cloneFirmantes(DATOS_PROPUESTA_DEFAULT.firmantes)
  };

  if (!datosPropuesta) {
    return fallback;
  }

  return {
    ...fallback,
    ...datosPropuesta,
    preparado_para: datosPropuesta.preparado_para || empresa,
    firmantes: cloneFirmantes(datosPropuesta.firmantes)
  };
}

function normalizeCotizacion(cotizacion: Cotizacion): Cotizacion {
  return {
    ...cotizacion,
    beneficios: (cotizacion.beneficios ?? []).map((beneficio: Beneficio) => ({ ...beneficio })),
    por_que_nosotros: (cotizacion.por_que_nosotros ?? []).map(
      (item: DiferenciadorBlyndtek) => ({ ...item })
    ),
    mantenimiento_detalle: cotizacion.mantenimiento_detalle
      ? {
          incluye: (cotizacion.mantenimiento_detalle.incluye ?? []).map((categoria) => ({
            categoria: categoria.categoria,
            items: [...(categoria.items ?? [])]
          })),
          no_incluye: [...(cotizacion.mantenimiento_detalle.no_incluye ?? [])]
        }
      : null,
    supuestos: [...(cotizacion.supuestos ?? SUPUESTOS_DEFAULT)],
    condiciones_comerciales: [...(cotizacion.condiciones_comerciales ?? CONDICIONES_COMERCIALES_DEFAULT)],
    datos_propuesta: normalizeDatosPropuesta(cotizacion.empresa, cotizacion.datos_propuesta),
    hitos: [...(cotizacion.hitos ?? [])],
    modulos: [...(cotizacion.modulos ?? [])],
    contexto_chat: [...(cotizacion.contexto_chat ?? [])],
    adjuntos: [...(cotizacion.adjuntos ?? [])]
  };
}

function buildQueryString(filters?: CotizacionFilters) {
  const searchParams = new URLSearchParams();

  if (filters?.estado) {
    searchParams.set("estado", filters.estado);
  }

  if (filters?.lead_id) {
    searchParams.set("lead_id", filters.lead_id);
  }

  if (filters?.cliente_id) {
    searchParams.set("cliente_id", filters.cliente_id);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function useCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [cotizacionActual, setCotizacionActual] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const initialLoadRef = useRef(true);

  const fetchCotizaciones = useCallback(async (filters?: CotizacionFilters) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cotizaciones${buildQueryString(filters)}`);
      const payload = (await response.json()) as CotizacionesResponse<Cotizacion[]>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudieron cargar las cotizaciones.");
      }

      setCotizaciones(payload.data.map(normalizeCotizacion));
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "No se pudieron cargar las cotizaciones."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCotizacion = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cotizaciones/${id}`);
      const payload = (await response.json()) as CotizacionesResponse<Cotizacion>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo cargar la cotización.");
      }

      const normalized = normalizeCotizacion(payload.data);
      initialLoadRef.current = true;
      dirtyRef.current = false;
      setCotizacionActual(normalized);
      return normalized;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudo cargar la cotización.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCotizacion = useCallback(async (input: CreateCotizacionInput) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
      const payload = (await response.json()) as CotizacionesResponse<Cotizacion>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear la cotización.");
      }

      const normalized = normalizeCotizacion(payload.data as Cotizacion);
      setCotizaciones((current) => [normalized, ...current]);
      setCotizacionActual(normalized);
      dirtyRef.current = false;
      initialLoadRef.current = true;
      return normalized;
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "No se pudo crear la cotización.";
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateCotizacion = useCallback((id: string, input: UpdateCotizacionInput) => {
    setCotizacionActual((current) => {
      if (!current || current.id !== id) {
        return current;
      }

      dirtyRef.current = true;
      initialLoadRef.current = false;
      const next = {
        ...current,
        ...input
      };

      setCotizaciones((list) => list.map((item) => (item.id === id ? next : item)));
      return next;
    });
  }, []);

  const persistCotizacion = useCallback(async (id: string, input: UpdateCotizacionInput) => {
    const response = await fetch(`/api/cotizaciones/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = (await response.json()) as CotizacionesResponse<Cotizacion>;

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo guardar la cotización.");
    }

    return payload.data;
  }, []);

  const updateEstado = useCallback(async (id: string, estado: EstadoCotizacion) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/cotizaciones/${id}/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ estado })
      });
      const payload = (await response.json()) as CotizacionesResponse<Cotizacion>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo actualizar el estado.");
      }

      const normalized = normalizeCotizacion(payload.data);
      setCotizacionActual(normalized);
      setCotizaciones((current) => current.map((item) => (item.id === id ? normalized : item)));
      dirtyRef.current = false;
      return normalized;
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "No se pudo actualizar el estado.";
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteCotizacion = useCallback(async (id: string) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/cotizaciones/${id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as DeleteResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "No se pudo eliminar la cotización.");
      }

      setCotizaciones((current) => current.filter((item) => item.id !== id));

      if (cotizacionActual?.id === id) {
        setCotizacionActual(null);
      }
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la cotización.";
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, [cotizacionActual?.id]);

  useEffect(() => {
    if (!cotizacionActual || !dirtyRef.current || initialLoadRef.current) {
      return;
    }

    setSaving(true);

    const timeoutId = window.setTimeout(() => {
      void persistCotizacion(cotizacionActual.id, cotizacionActual)
      .then((saved) => {
        dirtyRef.current = false;
          const normalized = normalizeCotizacion(saved);
          setCotizacionActual(normalized);
          setCotizaciones((current) =>
            current.map((item) => (item.id === normalized.id ? normalized : item))
          );
        })
        .catch((persistError) => {
          setError(
            persistError instanceof Error
              ? persistError.message
              : "No se pudo guardar la cotización."
          );
        })
        .finally(() => {
          setSaving(false);
        });
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cotizacionActual, persistCotizacion]);

  return {
    cotizaciones,
    cotizacionActual,
    loading,
    saving,
    error,
    setCotizacionActual,
    fetchCotizaciones,
    fetchCotizacion,
    createCotizacion,
    updateCotizacion,
    updateEstado,
    deleteCotizacion
  };
}
