"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardPeriod, DashboardResponse } from "@/types/dashboard";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export function useDashboard(period: DashboardPeriod) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchDashboard = useCallback(async (nextPeriod: DashboardPeriod, signal?: AbortSignal) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard?period=${nextPeriod}`, { signal });
      const payload = (await response.json()) as ApiResponse<DashboardResponse>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo cargar el dashboard.");
      }

      if (requestId !== requestIdRef.current || signal?.aborted) {
        return null;
      }

      setDashboard(payload.data);
      return payload.data;
    } catch (fetchError) {
      if (signal?.aborted) {
        return null;
      }

      if (requestId !== requestIdRef.current) {
        return null;
      }

      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudo cargar el dashboard.";
      setError(message);
      return null;
    } finally {
      if (requestId === requestIdRef.current && !signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDashboard(period, controller.signal);

    return () => {
      controller.abort();
      requestIdRef.current += 1;
    };
  }, [fetchDashboard, period]);

  return {
    dashboard,
    loading,
    error,
    fetchDashboard
  };
}
