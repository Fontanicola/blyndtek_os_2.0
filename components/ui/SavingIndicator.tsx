"use client";

import { CheckCircleIcon, LoaderIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type SavingIndicatorProps = {
  estado: "idle" | "saving" | "saved";
  className?: string;
};

export function SavingIndicator({ estado, className }: SavingIndicatorProps) {
  const label = estado === "saving" ? "Guardando" : estado === "saved" ? "Guardado" : "Sin cambios";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-label transition-colors duration-fast ease-fast",
        estado === "saving" && "bg-warning-light text-warning",
        estado === "saved" && "bg-success-light text-success",
        estado === "idle" && "bg-paper text-graphite",
        className
      )}
    >
      {estado === "saving" ? (
        <LoaderIcon size={14} className="animate-spinner" aria-hidden="true" />
      ) : estado === "saved" ? (
        <CheckCircleIcon size={14} aria-hidden="true" />
      ) : (
        <span className="h-2 w-2 rounded-pill bg-line" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
