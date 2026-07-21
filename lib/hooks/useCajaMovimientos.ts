"use client";

import { useCallback, useEffect, useState } from "react";
import { addMonths, formatMonthKey, startOfMonth } from "@/lib/finanzas";
import type { CajaMovimientosPayload } from "@/types/finanzas";

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

export function useCajaMovimientos(cajaId: string | null, initialMonth?: string) {
  const [mesSeleccionado, setMesSeleccionado] = useState(initialMonth ?? getCurrentMonth());
  const [data, setData] = useState<CajaMovimientosPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovimientos = useCallback(
    async (month = mesSeleccionado) => {
      if (!cajaId) {
        setData(null);
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/cajas/${cajaId}/movimientos?mes=${month}`);
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
    [cajaId, mesSeleccionado]
  );

  const mesAnterior = useCallback(() => {
    setMesSeleccionado((current) => moveMonth(current, -1));
  }, []);

  const mesSiguiente = useCallback(() => {
    setMesSeleccionado((current) => moveMonth(current, 1));
  }, []);

  useEffect(() => {
    if (!cajaId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    void fetchMovimientos(mesSeleccionado).catch(() => undefined);
  }, [cajaId, fetchMovimientos, mesSeleccionado]);

  return {
    data,
    movimientos: data?.movimientos ?? [],
    resumenMes: data?.resumen_mes ?? null,
    mesSeleccionado,
    setMesSeleccionado,
    mesAnterior,
    mesSiguiente,
    fetchMovimientos,
    loading,
    error
  };
}
