"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-paper p-6 text-carbon">
        <main className="w-full max-w-lg rounded-card border border-line bg-white p-6 shadow-card">
          <p className="text-xs font-label uppercase tracking-wide text-danger">Error inesperado</p>
          <h1 className="mt-2 text-xl font-title">Blyndtek OS no pudo completar esta pantalla.</h1>
          <p className="mt-2 text-sm text-graphite">El incidente fue registrado automáticamente para su diagnóstico.</p>
          <button type="button" onClick={reset} className="mt-5 rounded-component bg-signal px-4 py-2 text-sm font-label text-white">
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
