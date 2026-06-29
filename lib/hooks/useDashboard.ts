"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardPeriod, DashboardResponse } from "@/types/dashboard";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export function useDashboard(period: DashboardPeriod) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (nextPeriod: DashboardPeriod) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/dashboard?period=${nextPeriod}`);
      const payload = (await response.json()) as ApiResponse<DashboardResponse>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo cargar el dashboard.");
      }

      setDashboard(payload.data);
      return payload.data;
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "No se pudo cargar el dashboard.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard(period);
  }, [fetchDashboard, period]);

  return {
    dashboard,
    loading,
    error,
    fetchDashboard
  };
}
