"use client";

import { useCallback, useEffect, useState } from "react";
import { addMonths, formatMonthKey, startOfMonth } from "@/lib/finanzas";
import type { CajaMovimientosPayload, FiltroMovimientosCaja } from "@/types/finanzas";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

function getCurrentMonth() {
  return formatMonthKey(startOfMonth(new Date()));
}

function moveMonth(month: string, offset: number) {
  const [year = NaN, monthValue = NaN] = month.split("-").map(Number);
  return formatMonthKey(addMonths(new Date(year, monthValue - 1, 1), offset));
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function buildMovimientosQuery(mesDesde: string, mesHasta: string | null, tipo: FiltroMovimientosCaja) {
  const searchParams = new URLSearchParams();
  searchParams.set("mes_desde", mesDesde);
  if (mesHasta && mesHasta !== mesDesde) {
    searchParams.set("mes_hasta", mesHasta);
  }
  if (tipo !== "todos") {
    searchParams.set("tipo", tipo);
  }
  return searchParams.toString();
}

export function useCajaMovimientos(cajaId: string | null, initialMonth?: string) {
  const [mesSeleccionado, setMesSeleccionado] = useState(initialMonth ?? getCurrentMonth());
  const [mesHasta, setMesHasta] = useState<string | null>(null);
  const [tipo, setTipo] = useState<FiltroMovimientosCaja>("todos");
  const [data, setData] = useState<CajaMovimientosPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSingleMonth = !mesHasta || mesHasta === mesSeleccionado;

  const fetchMovimientos = useCallback(
    async (
      next?:
        | string
        | {
            mesDesde?: string;
            mesHasta?: string | null;
            tipo?: FiltroMovimientosCaja;
          }
    ) => {
      if (!cajaId) {
        setData(null);
        return null;
      }

      const resolvedMesDesde = typeof next === "string" ? next : next?.mesDesde ?? mesSeleccionado;
      const resolvedMesHasta =
        typeof next === "string" ? null : next?.mesHasta === undefined ? mesHasta : next.mesHasta;
      const resolvedTipo = typeof next === "string" ? tipo : next?.tipo ?? tipo;

      setLoading(true);
      setError(null);

      try {
        const query = buildMovimientosQuery(resolvedMesDesde, resolvedMesHasta, resolvedTipo);
        const response = await fetch(`/api/cajas/${cajaId}/movimientos?${query}`);
        const payload = await readJsonResponse<ApiResponse<CajaMovimientosPayload>>(response);

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudieron cargar los movimientos de la caja.");
        }

        setData(payload.data);
        return payload.data;
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los movimientos de la caja.";
        setError(message);
        throw fetchError;
      } finally {
        setLoading(false);
      }
    },
    [cajaId, mesHasta, mesSeleccionado, tipo]
  );

  const mesAnterior = useCallback(() => {
    if (!isSingleMonth) {
      return;
    }
    setMesSeleccionado((current) => moveMonth(current, -1));
    setMesHasta(null);
  }, [isSingleMonth]);

  const mesSiguiente = useCallback(() => {
    if (!isSingleMonth) {
      return;
    }
    setMesSeleccionado((current) => moveMonth(current, 1));
    setMesHasta(null);
  }, [isSingleMonth]);

  const setRango = useCallback((nextMesDesde: string, nextMesHasta?: string | null) => {
    setMesSeleccionado(nextMesDesde);
    setMesHasta(nextMesHasta && nextMesHasta !== nextMesDesde ? nextMesHasta : null);
  }, []);

  const seleccionarMes = useCallback((month: string) => {
    setMesSeleccionado(month);
    setMesHasta(null);
  }, []);

  useEffect(() => {
    if (!cajaId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    void fetchMovimientos({
      mesDesde: mesSeleccionado,
      mesHasta,
      tipo
    }).catch(() => undefined);
  }, [cajaId, fetchMovimientos, mesHasta, mesSeleccionado, tipo]);

  return {
    data,
    movimientos: data?.movimientos ?? [],
    resumenMes: data?.resumen_periodo ?? null,
    resumenPeriodo: data?.resumen_periodo ?? null,
    mesSeleccionado,
    mesDesde: mesSeleccionado,
    mesHasta,
    isSingleMonth,
    tipoSeleccionado: tipo,
    setMesSeleccionado,
    seleccionarMes,
    setMesHasta,
    setRango,
    setTipo,
    mesAnterior,
    mesSiguiente,
    fetchMovimientos,
    loading,
    error
  };
}
