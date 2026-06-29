"use client";

import { useRef, useState } from "react";
import { Badge, Card, Spinner } from "@/components/ui";
import { parseExcel } from "@/lib/parsers/parseExcel";
import { parsePDFToBase64 } from "@/lib/parsers/parsePDF";
import type { AdjuntoMetadata } from "@/types/cotizaciones";

type AdjuntosUploaderProps = {
  adjuntos: AdjuntoMetadata[];
  onAdjuntoAgregado: (adjunto: AdjuntoMetadata) => void;
  onAdjuntoEliminado: (nombre: string) => void;
  procesando: boolean;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 text-graphite"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M12 16V4m0 0 4 4m-4-4L8 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15.5v2A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-2" strokeLinecap="round" />
    </svg>
  );
}

function FileIcon({ tipo }: { tipo: AdjuntoMetadata["tipo"] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 text-graphite"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7l-4-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14h6M9 17h4" strokeLinecap="round" />
      <path d="M9 10h2" strokeLinecap="round" />
      <title>{tipo}</title>
    </svg>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAdjuntoTipo(file: File): AdjuntoMetadata["tipo"] | null {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf")) {
    return "pdf";
  }

  if (fileName.endsWith(".csv")) {
    return "csv";
  }

  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return "excel";
  }

  return null;
}

function getBadgeVariant(tipo: AdjuntoMetadata["tipo"]) {
  if (tipo === "pdf") {
    return "danger" as const;
  }

  return "success" as const;
}

export function AdjuntosUploader({
  adjuntos,
  onAdjuntoAgregado,
  onAdjuntoEliminado,
  procesando
}: AdjuntosUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    setError(null);

    for (const file of Array.from(fileList)) {
      const tipo = getAdjuntoTipo(file);

      if (!tipo) {
        setError("Solo se permiten archivos Excel, CSV o PDF.");
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("Cada archivo debe pesar menos de 10MB.");
        continue;
      }

      const contenido_texto =
        tipo === "pdf" ? await parsePDFToBase64(file) : await parseExcel(file);

      onAdjuntoAgregado({
        nombre: file.name,
        tipo,
        tamanio: file.size,
        contenido_texto
      });
    }
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-line-soft px-5 py-4">
        <h2 className="text-base font-title text-carbon">Archivos de contexto</h2>
        <p className="mt-1 text-sm text-graphite">
          Excel, CSV o PDF con especificaciones, datos o referencias del proyecto.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void processFiles(event.dataTransfer.files);
          }}
          disabled={procesando}
          className={[
            "flex w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors duration-fast ease-fast",
            isDragging ? "border-signal bg-signal-light" : "border-line bg-white hover:bg-paper",
            procesando ? "cursor-not-allowed opacity-70" : "cursor-pointer"
          ].join(" ")}
        >
          {procesando ? <Spinner size="md" color="signal" /> : <UploadIcon />}
          <div className="space-y-1">
            <p className="text-sm font-label text-carbon">
              {procesando ? "Procesando..." : "Arrastrá archivos o hacé click para seleccionar"}
            </p>
            <p className="text-xs text-graphite">Excel, CSV, PDF · Máx 10MB por archivo</p>
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            void processFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {error ? <p className="text-xs text-danger">{error}</p> : null}

        {adjuntos.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-success">
                {adjuntos.length} archivo(s) listo(s) para la IA
              </p>
            </div>

            <div className="space-y-2">
              {adjuntos.map((adjunto) => (
                <div
                  key={adjunto.nombre}
                  className="flex items-center justify-between gap-3 rounded-card border border-line-soft bg-paper px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileIcon tipo={adjunto.tipo} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-label text-carbon">{adjunto.nombre}</p>
                      <p className="text-xs text-graphite">{formatFileSize(adjunto.tamanio)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={getBadgeVariant(adjunto.tipo)}>{adjunto.tipo}</Badge>
                    <button
                      type="button"
                      onClick={() => onAdjuntoEliminado(adjunto.nombre)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-component text-graphite transition-colors duration-fast ease-fast hover:bg-white hover:text-carbon"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
