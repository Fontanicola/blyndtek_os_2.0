"use client";

import { useCallback, useEffect, useState } from "react";
import type { Cobro, CreateCobroInput, EstadoCobro, UpdateCobroInput } from "@/types/cobros";
import type {
  CarteraClienteItem,
  ConfigFinanzas,
  MetricasFinanzas,
  TesoreriaFinanzas
} from "@/types/finanzas";
import type {
  CreateEgresoInput,
  Egreso,
  EgresoRecurrenteConfig,
  UpdateEgresoInput
} from "@/types/egresos";
import type {
  CreateSuscripcionInput,
  EstadoSuscripcion,
  Suscripcion,
  UpdateSuscripcionInput
} from "@/types/suscripciones";
import type { ComisionListado } from "@/types/comisiones";

type ApiResponse<T> = {
  data?: T;
  error?: string;
  cobro?: Cobro | null;
};

type DeleteResponse = {
  success?: boolean;
  error?: string;
};

type CobroFilters = {
  estado?: EstadoCobro;
  tipo?: Cobro["tipo"];
  fecha_desde?: string;
  fecha_hasta?: string;
  cliente_id?: string;
  proyecto_id?: string;
  suscripcion_id?: string;
  cotizacion_id?: string;
};

type EgresoFilters = {
  categoria?: Egreso["categoria"];
  fecha_desde?: string;
  fecha_hasta?: string;
};

type SuscripcionFilters = {
  estado?: EstadoSuscripcion;
  cliente_id?: string;
  proyecto_id?: string;
  cotizacion_id?: string;
  producto_id?: string;
};

function buildQueryString(filters?: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function useFinanzas() {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [egresosRecurrentesConfig, setEgresosRecurrentesConfig] = useState<EgresoRecurrenteConfig[]>([]);
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([]);
  const [comisiones, setComisiones] = useState<ComisionListado[]>([]);
  const [metricas, setMetricas] = useState<MetricasFinanzas | null>(null);
  const [config, setConfig] = useState<ConfigFinanzas | null>(null);
  const [carteraClientes, setCarteraClientes] = useState<CarteraClienteItem[]>([]);
  const [tesoreria, setTesoreria] = useState<TesoreriaFinanzas | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCobros = useCallback(async (filters?: CobroFilters) => {
    const response = await fetch(`/api/cobros${buildQueryString(filters)}`);
    const payload = await readJsonResponse<ApiResponse<Cobro[]>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron cargar los cobros.");
    }

    setCobros(payload.data);
    return payload.data;
  }, []);

  const fetchCobro = useCallback(async (id: string) => {
    const response = await fetch(`/api/cobros/${id}`);
    const payload = await readJsonResponse<ApiResponse<Cobro>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar el cobro.");
    }

    return payload.data;
  }, []);

  const createCobro = useCallback(async (input: CreateCobroInput) => {
    const response = await fetch("/api/cobros", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Cobro>>(response);

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo crear el cobro.";
      throw new Error(message);
    }

    setCobros((current) => [payload.data as Cobro, ...current]);
    return payload.data;
  }, []);

  const updateCobro = useCallback(async (id: string, input: UpdateCobroInput) => {
    const response = await fetch(`/api/cobros/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Cobro>>(response);

    if (!response.ok || !payload.data) {
      const message = payload.error ?? "No se pudo actualizar el cobro.";
      throw new Error(message);
    }

    setCobros((current) => current.map((item) => (item.id === id ? payload.data! : item)));
    return payload.data;
  }, []);

  const deleteCobro = useCallback(async (id: string) => {
    const response = await fetch(`/api/cobros/${id}`, {
      method: "DELETE"
    });
    const payload = await readJsonResponse<DeleteResponse>(response);

    if (!response.ok || !payload.success) {
      const message = payload.error ?? "No se pudo eliminar el cobro.";
      throw new Error(message);
    }

    setCobros((current) => current.filter((item) => item.id !== id));
  }, []);

  const fetchEgresos = useCallback(async (filters?: EgresoFilters) => {
    const response = await fetch(`/api/egresos${buildQueryString(filters)}`);
    const payload = await readJsonResponse<ApiResponse<Egreso[]>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron cargar los egresos.");
    }

    setEgresos(payload.data);
    return payload.data;
  }, []);

  const createEgreso = useCallback(async (input: CreateEgresoInput) => {
    const response = await fetch("/api/egresos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Egreso>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo crear el egreso.");
    }

    setEgresos((current) => [payload.data as Egreso, ...current]);
    return payload.data;
  }, []);

  const updateEgreso = useCallback(async (id: string, input: UpdateEgresoInput) => {
    const response = await fetch(`/api/egresos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Egreso>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo actualizar el egreso.");
    }

    setEgresos((current) => current.map((item) => (item.id === id ? payload.data! : item)));
    return payload.data;
  }, []);

  const deleteEgreso = useCallback(async (id: string) => {
    const response = await fetch(`/api/egresos/${id}`, {
      method: "DELETE"
    });
    const payload = await readJsonResponse<DeleteResponse>(response);

    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? "No se pudo eliminar el egreso.");
    }

    setEgresos((current) => current.filter((item) => item.id !== id));
  }, []);

  const fetchEgresosRecurrentesConfig = useCallback(async () => {
    const response = await fetch("/api/egresos/recurrentes-config");
    const payload = await readJsonResponse<ApiResponse<EgresoRecurrenteConfig[]>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron cargar las plantillas recurrentes.");
    }

    setEgresosRecurrentesConfig(payload.data);
    return payload.data;
  }, []);

  const generarEgresosRecurrentesMes = useCallback(async (mes?: string) => {
    const response = await fetch("/api/egresos/generar-recurrentes-mes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(mes ? { mes } : {})
    });
    const payload = await readJsonResponse<ApiResponse<{ month: string; configs: number; generados: number; existentes: number }>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron generar los egresos recurrentes del mes.");
    }

    return payload.data;
  }, []);

  const toggleEgresoRecurrenteMesPagado = useCallback(async (configId: string, month: string, pagado: boolean) => {
    const response = await fetch(`/api/egresos/recurrentes-config/${configId}/historial`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ month, pagado })
    });
    const payload = await readJsonResponse<ApiResponse<Egreso>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo actualizar el historial del egreso recurrente.");
    }

    setEgresos((current) => {
      const found = current.some((item) => item.id === payload.data!.id);
      if (found) {
        return current.map((item) => (item.id === payload.data!.id ? payload.data! : item));
      }

      return [payload.data!, ...current];
    });

    return payload.data;
  }, []);

  const fetchSuscripciones = useCallback(async (filters?: SuscripcionFilters) => {
    const response = await fetch(`/api/suscripciones${buildQueryString(filters as Record<string, string | undefined>)}`);
    const payload = await readJsonResponse<ApiResponse<Suscripcion[]>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron cargar las suscripciones.");
    }

    setSuscripciones(payload.data);
    return payload.data;
  }, []);

  const fetchComisiones = useCallback(async (filters?: { vendedor_id?: string; estado?: "pendiente" | "pagada" | "cancelada" }) => {
    const response = await fetch(`/api/comisiones${buildQueryString(filters as Record<string, string | undefined>)}`);
    const payload = await readJsonResponse<ApiResponse<ComisionListado[]>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron cargar las comisiones.");
    }

    setComisiones(payload.data);
    return payload.data;
  }, []);

  const createSuscripcion = useCallback(async (input: CreateSuscripcionInput) => {
    const response = await fetch("/api/suscripciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Suscripcion>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo crear la suscripción.");
    }

    setSuscripciones((current) => [payload.data as Suscripcion, ...current]);
    return payload.data;
  }, []);

  const updateSuscripcion = useCallback(async (id: string, input: UpdateSuscripcionInput) => {
    const response = await fetch(`/api/suscripciones/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<Suscripcion>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo actualizar la suscripción.");
    }

    setSuscripciones((current) => current.map((item) => (item.id === id ? payload.data! : item)));
    return payload.data;
  }, []);

  const deleteSuscripcion = useCallback(async (id: string) => {
    const response = await fetch(`/api/suscripciones/${id}`, {
      method: "DELETE"
    });
    const payload = await readJsonResponse<DeleteResponse>(response);

    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? "No se pudo eliminar la suscripción.");
    }

    setSuscripciones((current) => current.filter((item) => item.id !== id));
  }, []);

  const activarSuscripcion = useCallback(async (id: string) => {
    const response = await fetch(`/api/suscripciones/${id}/activar`, {
      method: "POST"
    });
    const payload = await readJsonResponse<ApiResponse<Suscripcion>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo activar la suscripción.");
    }

    setSuscripciones((current) => current.map((item) => (item.id === id ? payload.data! : item)));
    return payload.data;
  }, []);

  const fetchMetricas = useCallback(async () => {
    const response = await fetch("/api/finanzas/metricas");
    const payload = await readJsonResponse<ApiResponse<MetricasFinanzas>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron cargar las métricas.");
    }

    setMetricas(payload.data);
    return payload.data;
  }, []);

  const fetchCarteraClientes = useCallback(async () => {
    const response = await fetch("/api/finanzas/cartera-clientes");
    const payload = await readJsonResponse<ApiResponse<CarteraClienteItem[]>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar la cartera por cliente.");
    }

    setCarteraClientes(payload.data);
    return payload.data;
  }, []);

  const fetchTesoreria = useCallback(async () => {
    const response = await fetch("/api/finanzas/tesoreria");
    const payload = await readJsonResponse<ApiResponse<TesoreriaFinanzas>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar la tesorería.");
    }

    setTesoreria(payload.data);
    return payload.data;
  }, []);

  const fetchConfig = useCallback(async () => {
    const response = await fetch("/api/config-finanzas");
    const payload = await readJsonResponse<ApiResponse<ConfigFinanzas>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo cargar la configuración financiera.");
    }

    setConfig(payload.data);
    return payload.data;
  }, []);

  const updateConfig = useCallback(async (input: { caja_inicial: number }) => {
    const response = await fetch("/api/config-finanzas", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const payload = await readJsonResponse<ApiResponse<ConfigFinanzas>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo actualizar la configuración financiera.");
    }

    setConfig(payload.data);
    return payload.data;
  }, []);

  const generarCobrosMensuales = useCallback(async () => {
    const response = await fetch("/api/finanzas/generar-cobros-mensuales", {
      method: "POST"
    });
    const payload = await readJsonResponse<ApiResponse<{ generados: number }>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron generar los cobros del mes.");
    }

    return payload.data;
  }, []);

  const marcarVencidos = useCallback(async () => {
    const response = await fetch("/api/finanzas/marcar-vencidos", {
      method: "POST"
    });
    const payload = await readJsonResponse<ApiResponse<{ vencidos: number }>>(response);

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudieron marcar los cobros vencidos.");
    }

    return payload.data;
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setSaving(true);
    setError(null);

    try {
      await Promise.all([
        fetchCobros(),
        fetchEgresos(),
        fetchEgresosRecurrentesConfig(),
        fetchSuscripciones(),
        fetchComisiones(),
        fetchMetricas(),
        fetchConfig(),
        fetchCarteraClientes(),
        fetchTesoreria()
      ]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los datos financieros.");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  }, [
    fetchCobros,
    fetchCarteraClientes,
    fetchComisiones,
    fetchConfig,
    fetchEgresos,
    fetchEgresosRecurrentesConfig,
    fetchMetricas,
    fetchSuscripciones,
    fetchTesoreria
  ]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  return {
    cobros,
    egresos,
    egresosRecurrentesConfig,
    suscripciones,
    comisiones,
    metricas,
    config,
    carteraClientes,
    tesoreria,
    loading,
    saving,
    error,
    setCobros,
    setEgresos,
    setSuscripciones,
    setComisiones,
    setMetricas,
    setConfig,
    fetchCobros,
    fetchCobro,
    createCobro,
    updateCobro,
    deleteCobro,
    fetchEgresos,
    fetchEgresosRecurrentesConfig,
    createEgreso,
    updateEgreso,
    deleteEgreso,
    generarEgresosRecurrentesMes,
    toggleEgresoRecurrenteMesPagado,
    fetchSuscripciones,
    fetchComisiones,
    createSuscripcion,
    updateSuscripcion,
    deleteSuscripcion,
    activarSuscripcion,
    fetchMetricas,
    fetchCarteraClientes,
    fetchTesoreria,
    fetchConfig,
    updateConfig,
    generarCobrosMensuales,
    marcarVencidos,
    refreshAll
  };
}
