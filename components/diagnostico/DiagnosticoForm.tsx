"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, SavingIndicator } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { DiagnosticoPublicPayload } from "@/types/diagnostico";

type DiagnosticoFormProps = {
  initialPayload: DiagnosticoPublicPayload;
  saveUrl: string;
  onCompleted?: (payload: DiagnosticoPublicPayload["diagnostico"]) => void;
  compact?: boolean;
};

type SavingState = "idle" | "saving" | "saved";

type ApiResponse = {
  data?: DiagnosticoPublicPayload["diagnostico"];
  error?: string;
};

const MIN_RESPUESTAS_PARA_ENVIAR = 5;

function groupPreguntas(preguntas: DiagnosticoPublicPayload["preguntas"]) {
  return preguntas.reduce<Array<{ categoria: string; preguntas: DiagnosticoPublicPayload["preguntas"] }>>(
    (groups, pregunta) => {
      const current = groups.find((group) => group.categoria === pregunta.categoria);

      if (current) {
        current.preguntas.push(pregunta);
        return groups;
      }

      return [...groups, { categoria: pregunta.categoria, preguntas: [pregunta] }];
    },
    []
  );
}

export function DiagnosticoForm({
  initialPayload,
  saveUrl,
  onCompleted,
  compact = false
}: DiagnosticoFormProps) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(initialPayload.diagnostico.respuestas ?? {});
  const [savingState, setSavingState] = useState<SavingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(initialPayload.diagnostico.estado === "respondido");
  const [submitLoading, setSubmitLoading] = useState(false);
  const grupos = useMemo(() => groupPreguntas(initialPayload.preguntas), [initialPayload.preguntas]);
  const answeredCount = useMemo(
    () => Object.values(respuestas).filter((value) => value.trim().length > 0).length,
    [respuestas]
  );
  const canSubmit = answeredCount >= Math.min(MIN_RESPUESTAS_PARA_ENVIAR, initialPayload.preguntas.length);

  useEffect(() => {
    if (submitted) {
      return;
    }

    setSavingState("saving");
    setError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(saveUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ respuestas })
        });
        const payload = (await response.json()) as ApiResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo guardar el diagnóstico.");
        }

        setSavingState("saved");
      } catch (saveError) {
        setSavingState("idle");
        setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el diagnóstico.");
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [respuestas, saveUrl, submitted]);

  function setRespuesta(preguntaId: string, value: string) {
    setRespuestas((current) => ({
      ...current,
      [preguntaId]: value
    }));
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setSubmitLoading(true);
    setError(null);

    try {
      const response = await fetch(saveUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ respuestas, completo: true })
      });
      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo enviar el diagnóstico.");
      }

      setSubmitted(true);
      setSavingState("saved");
      onCompleted?.(payload.data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo enviar el diagnóstico.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className={cn("rounded-card border border-success/20 bg-success-light p-6", compact && "p-4")}>
        <p className="text-lg font-title text-carbon">Diagnóstico enviado</p>
        <p className="mt-2 text-sm text-graphite">
          Gracias. Ya tenemos la información necesaria para analizar la operación y preparar los próximos pasos.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-graphite">
          {answeredCount} de {initialPayload.preguntas.length} respuestas con contenido
        </p>
        <SavingIndicator estado={savingState} />
      </div>

      {error ? (
        <div className="rounded-component border border-danger/20 bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {grupos.map((grupo) => (
        <section key={grupo.categoria} className="space-y-3">
          <h2 className={cn("font-title text-carbon", compact ? "text-base" : "text-xl")}>
            {grupo.categoria}
          </h2>

          <div className="space-y-3">
            {grupo.preguntas.map((pregunta) => (
              <label key={pregunta.id} className="block space-y-2">
                <span className="block text-sm font-label text-carbon">{pregunta.pregunta}</span>
                <textarea
                  value={respuestas[pregunta.id] ?? ""}
                  onChange={(event) => setRespuesta(pregunta.id, event.target.value)}
                  rows={compact ? 3 : 4}
                  className="w-full resize-y rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  placeholder="Escribí con tus palabras. No hay respuestas correctas o incorrectas."
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
        <p className="max-w-md text-sm text-graphite">
          Podés enviarlo cuando hayas respondido al menos {Math.min(MIN_RESPUESTAS_PARA_ENVIAR, initialPayload.preguntas.length)} preguntas.
        </p>
        <Button onClick={handleSubmit} disabled={!canSubmit} loading={submitLoading}>
          Enviar diagnóstico
        </Button>
      </div>
    </div>
  );
}
