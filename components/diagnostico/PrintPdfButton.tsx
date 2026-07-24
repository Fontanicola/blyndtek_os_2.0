"use client";

import { useEffect } from "react";
import { DownloadIcon } from "@/components/ui/icons";

export function PrintPdfButton() {
  function printReport() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={printReport}
      className="no-print inline-flex items-center justify-center gap-2 rounded-component border border-line bg-white px-4 py-2 text-sm font-label text-carbon transition-colors duration-fast hover:bg-paper"
      aria-label="Descargar informe como PDF"
    >
      <DownloadIcon size={16} aria-hidden="true" />
      Descargar PDF
    </button>
  );
}

export function PrintOnLoad() {
  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      await document.fonts?.ready;
      await Promise.all(
        Array.from(document.images).map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              })
        )
      );
      window.print();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
