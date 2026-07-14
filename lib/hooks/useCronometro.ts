"use client";

import { useCallback, useEffect, useState } from "react";
import type { SesionTiempo } from "@/types/sesionesTiempo";

export type CronometroSesionActiva = SesionTiempo & {
  usuario_nombre?: string;
  fase_nombre?: string;
  proyecto_id?: string | null;
  proyecto_nombre?: string;
  segundos?: number;
};

type StartedSessionResponse = {
  data?: SesionTiempo;
  error?: string;
};

type PauseResponse = {
  data?: SesionTiempo;
  error?: string;
};

type ActiveResponse = {
  data?: CronometroSesionActiva | null;
  error?: string;
};

type CronometroError = Error & {
  status?: number;
  data?: unknown;
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function getElapsedSeconds(inicio: string) {
  const start = new Date(inicio).getTime();
  if (Number.isNaN(start)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export function useCronometro() {
  const [sesionActiva, setSesionActiva] = useState<CronometroSesionActiva | null>(null);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);

  const refreshSesionActiva = useCallback(async () => {
    try {
      const response = await fetch("/api/sesiones-tiempo/activa", {
        cache: "no-store"
      });
      const payload = await readJson<ActiveResponse>(response);

      if (!response.ok) {
        if (response.status === 401) {
          setSesionActiva(null);
          setTiempoTranscurrido(0);
          return null;
        }

        throw new Error(payload.error ?? "No se pudo cargar el cronómetro activo.");
      }

      setSesionActiva(payload.data ?? null);
      return payload.data ?? null;
    } catch {
      setSesionActiva(null);
      setTiempoTranscurrido(0);
      return null;
    }
  }, []);

  const iniciar = useCallback(
    async (faseId: string) => {
      const response = await fetch(`/api/fases/${faseId}/tiempo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const payload = await readJson<StartedSessionResponse>(response);

      if (!response.ok || !payload.data) {
        const error = new Error(payload.error ?? "No se pudo iniciar el cronómetro.") as CronometroError;
        error.status = response.status;
        error.data = payload.data ?? null;
        throw error;
      }

      await refreshSesionActiva();
      return payload.data;
    },
    [refreshSesionActiva]
  );

  const pausar = useCallback(
    async (sesionId: string, nota?: string) => {
      const response = await fetch(`/api/sesiones-tiempo/${sesionId}/pausar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(typeof nota === "string" ? { nota } : {})
      });
      const payload = await readJson<PauseResponse>(response);

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo pausar el cronómetro.");
      }

      await refreshSesionActiva();
      return payload.data;
    },
    [refreshSesionActiva]
  );

  useEffect(() => {
    void refreshSesionActiva();
    const interval = window.setInterval(() => {
      void refreshSesionActiva();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [refreshSesionActiva]);

  useEffect(() => {
    if (!sesionActiva) {
      setTiempoTranscurrido(0);
      return;
    }

    const update = () => {
      setTiempoTranscurrido(getElapsedSeconds(sesionActiva.inicio));
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [sesionActiva]);

  return {
    sesionActiva,
    tiempoTranscurrido,
    refreshSesionActiva,
    iniciar,
    pausar
  };
}
