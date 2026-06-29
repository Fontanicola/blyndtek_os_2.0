"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import {
  COTIZACION_ESTADO_LABELS,
  isParametrosStepComplete
} from "@/lib/cotizaciones";
import type { Cotizacion } from "@/types/cotizaciones";

type Step = 1 | 2 | 3 | 4 | 5;

type CotizadorLayoutProps = {
  cotizacion: Cotizacion;
  saving: boolean;
  activeStep: Step;
  onStepChange: (step: Step) => void;
  children: ReactNode;
};

const steps: Array<{ step: Step; label: string }> = [
  { step: 1, label: "Parámetros" },
  { step: 2, label: "Contexto & Adjuntos" },
  { step: 3, label: "Módulos (IA)" },
  { step: 4, label: "Preview PDF" },
  { step: 5, label: "Aceptación" }
];

function getEstadoVariant(estado: Cotizacion["estado"]) {
  if (estado === "enviada") {
    return "signal" as const;
  }

  if (estado === "aceptada") {
    return "success" as const;
  }

  if (estado === "rechazada") {
    return "danger" as const;
  }

  return "default" as const;
}

export function CotizadorLayout({
  cotizacion,
  saving,
  activeStep,
  onStepChange,
  children
}: CotizadorLayoutProps) {
  const router = useRouter();
  const allStepsCompleted = cotizacion.estado === "aceptada";
  const currentStepComplete =
    allStepsCompleted || (activeStep === 1 ? isParametrosStepComplete(cotizacion) : activeStep < 5);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/cotizador")}>
          ← Volver a cotizaciones
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-graphite">
            {saving ? "Guardando..." : "Guardado ✓"}
          </span>
        </div>
      </div>

      <div className="space-y-4 rounded-card bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-title text-carbon">{cotizacion.empresa}</h1>
          <Badge variant={getEstadoVariant(cotizacion.estado)}>
            {COTIZACION_ESTADO_LABELS[cotizacion.estado]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-line-soft pt-4">
          {steps.map((item) => {
            const isActive = item.step === activeStep;
            const isCompleted = allStepsCompleted || item.step < activeStep;
            const canNavigate =
              allStepsCompleted ||
              item.step < activeStep ||
              (item.step === activeStep + 1 && currentStepComplete);
            const isAcceptedTheme = allStepsCompleted;

            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (canNavigate || isActive) {
                    onStepChange(item.step);
                  }
                }}
                disabled={!canNavigate && !isActive}
                className={[
                  "inline-flex items-center gap-2 border-b pb-2 text-sm transition-colors duration-fast ease-fast",
                  isAcceptedTheme
                    ? "border-success text-success"
                    : isActive
                    ? "border-signal text-signal"
                    : isCompleted
                      ? "border-transparent text-graphite"
                      : "border-transparent text-graphite/40",
                  !canNavigate && !isActive ? "cursor-not-allowed" : "hover:text-carbon"
                ].join(" ")}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs">
                  {isCompleted ? "✓" : item.step}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
