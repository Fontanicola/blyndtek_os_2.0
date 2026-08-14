"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EmptyState,
  SavingIndicator,
  Toast
} from "@/components/ui";
import {
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  InboxIcon,
  SparklesIcon
} from "@/components/ui/icons";
import type { CronistaLogDiario, CronistaLogEstado } from "@/types/agentes";

type CronistaClientProps = {
  fecha: string;
  initialLog: CronistaLogDiario | null;
  recentLogs: CronistaLogDiario[];
};

const factLabels: Record<keyof CronistaLogDiario["datos_duros"], string> = {
  leads_nuevos: "Leads nuevos",
  cambios_etapa_leads: "Cambios de etapa",
  cobros: "Cobros",
  egresos: "Egresos",
  features_completadas: "Features completadas",
  fases_movidas: "Fases movidas",
  diagnosticos_ejecutados: "Diagnósticos",
  incidentes_sistemas: "Incidentes"
};

function statusLabel(estado: CronistaLogEstado) {
  switch (estado) {
    case "sin_contexto_humano":
      return "Sin contexto humano";
    case "procesando":
      return "Procesando";
    case "completado":
      return "Completado";
    case "fallido":
      return "Requiere revisión";
  }
}

function statusVariant(estado: CronistaLogEstado) {
  switch (estado) {
    case "completado":
      return "success" as const;
    case "procesando":
      return "signal" as const;
    case "fallido":
      return "danger" as const;
    case "sin_contexto_humano":
      return "warning" as const;
  }
}

function formatDate(value: string) {
  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

export function CronistaClient({ fecha, initialLog, recentLogs }: CronistaClientProps) {
  const router = useRouter();
  const [log, setLog] = useState(initialLog);
  const [respuesta, setRespuesta] = useState(initialLog?.respuesta_cruda ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    initialLog?.estado === "completado" ? "saved" : "idle"
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "warning" | "error";
    visible: boolean;
  }>({ message: "", type: "info", visible: false });

  const factCounts = useMemo(() => {
    if (!log) {
      return [];
    }

    return (Object.keys(factLabels) as Array<keyof CronistaLogDiario["datos_duros"]>)
      .map((key) => ({ label: factLabels[key], count: log.datos_duros[key].length }))
      .filter((item) => item.count > 0);
  }, [log]);

  function showToast(message: string, type: "success" | "info" | "warning" | "error") {
    setToast({ message, type, visible: true });
  }

  async function generateQuestions() {
    setGenerating(true);

    try {
      const response = await fetch("/api/agentes/cronista/generar-preguntas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha })
      });
      const payload = (await response.json()) as {
        data?: { log?: CronistaLogDiario };
        error?: string;
      };

      if (!response.ok || !payload.data?.log) {
        throw new Error(payload.error ?? "No se pudieron generar las preguntas del día.");
      }

      setLog(payload.data.log);
      setRespuesta(payload.data.log.respuesta_cruda ?? "");
      setSaveState(payload.data.log.estado === "completado" ? "saved" : "idle");
      showToast("Preguntas generadas con los datos reales del día.", "success");
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudieron generar las preguntas.", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function saveResponse() {
    if (!respuesta.trim()) {
      showToast("Escribí una respuesta antes de guardar.", "warning");
      return;
    }

    setSaving(true);
    setSaveState("saving");

    try {
      const response = await fetch("/api/agentes/cronista/procesar-respuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, respuesta })
      });
      const payload = (await response.json()) as {
        data?: { log?: CronistaLogDiario };
        error?: string;
      };

      if (!response.ok || !payload.data?.log) {
        throw new Error(payload.error ?? "No se pudo guardar el contexto del día.");
      }

      setLog(payload.data.log);
      setSaveState("saved");
      showToast("Contexto guardado y log estructurado.", "success");
      router.refresh();
    } catch (error) {
      setSaveState("idle");
      showToast(error instanceof Error ? error.message : "No se pudo guardar el contexto.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!log) {
    return (
      <>
        <EmptyState
          icon={InboxIcon}
          titulo="Todavía no hay preguntas para hoy"
          descripcion="La automatización las genera a las 21:00. También podés prepararlas ahora con los datos disponibles."
          accion={{ label: generating ? "Generando..." : "Generar preguntas de hoy", onClick: () => void generateQuestions() }}
        />
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onHide={() => setToast((current) => ({ ...current, visible: false }))}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card padding="md" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft pb-3">
              <div>
                <p className="font-title text-lg text-carbon">{formatDate(fecha)}</p>
                <p className="mt-1 text-sm text-graphite">{log.preguntas.length} preguntas basadas en la actividad registrada.</p>
              </div>
              <Badge variant={statusVariant(log.estado)}>{statusLabel(log.estado)}</Badge>
            </div>

            <ol className="space-y-2">
              {log.preguntas.map((pregunta, index) => (
                <li key={pregunta.id} className="flex gap-3 rounded-md border border-line-soft bg-white px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-signal-light text-xs font-label text-signal">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-carbon">{pregunta.texto}</p>
                </li>
              ))}
            </ol>

            <label className="block space-y-2" htmlFor="respuesta-cronista">
              <span className="text-sm font-label text-carbon">Tu contexto</span>
              <textarea
                id="respuesta-cronista"
                value={respuesta}
                onChange={(event) => {
                  setRespuesta(event.target.value);
                  setSaveState("idle");
                }}
                maxLength={12_000}
                rows={7}
                placeholder="Respondé en texto libre. Podés contestar todas las preguntas juntas y ser breve."
                className="w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-carbon outline-none transition-colors duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <SavingIndicator estado={saveState} />
              <Button
                type="button"
                size="sm"
                loading={saving}
                disabled={!respuesta.trim()}
                onClick={() => void saveResponse()}
              >
                <CheckCircleIcon size={16} />
                Guardar contexto
              </Button>
            </div>
          </Card>

          {log.log_estructurado ? (
            <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <BookOpenIcon className="h-5 w-5 shrink-0 text-signal" />
                <div className="min-w-0">
                  <p className="text-sm font-label text-carbon">Log Markdown listo</p>
                  <p className="text-xs text-graphite">Incluye una marca explícita si todavía falta contexto humano.</p>
                </div>
              </div>
              <a
                href={`/api/agentes/cronista/logs/${fecha}/markdown`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-label text-signal underline decoration-signal/40 underline-offset-2 hover:decoration-signal"
              >
                <DownloadIcon size={16} />
                Abrir Markdown
              </a>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card padding="md" className="space-y-3">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-signal" />
              <h2 className="font-title text-base text-carbon">Base del día</h2>
            </div>
            {factCounts.length > 0 ? (
              <div className="divide-y divide-line-soft rounded-md border border-line-soft">
                {factCounts.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-graphite">{item.label}</span>
                    <span className="font-label text-carbon">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={InboxIcon}
                titulo="Sin hechos duros relevantes"
                descripcion="Las preguntas no presuponen actividad que no esté registrada."
                className="min-h-[120px]"
              />
            )}
          </Card>

          <Card padding="md" className="space-y-3">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-signal" />
              <h2 className="font-title text-base text-carbon">Últimos logs</h2>
            </div>
            {recentLogs.length > 0 ? (
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Fecha</DataTableHead>
                    <DataTableHead>Estado</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {recentLogs.slice(0, 7).map((item) => (
                    <DataTableRow key={item.id}>
                      <DataTableCell className="whitespace-nowrap text-carbon">{item.fecha}</DataTableCell>
                      <DataTableCell>
                        <Badge variant={statusVariant(item.estado)}>{statusLabel(item.estado)}</Badge>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            ) : (
              <EmptyState
                icon={BookOpenIcon}
                titulo="Todavía no hay historial"
                descripcion="El log de hoy será el primero."
                className="min-h-[120px]"
              />
            )}
          </Card>
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </>
  );
}
