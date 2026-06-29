"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type ToastProps = {
  message: string;
  type: "success" | "info" | "warning" | "error";
  visible: boolean;
  onHide: () => void;
};

const typeClasses: Record<ToastProps["type"], string> = {
  success: "text-success",
  info: "text-signal",
  warning: "text-warning",
  error: "text-danger"
};

export function Toast({ message, type, visible, onHide }: ToastProps) {
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);

      const timeoutId = window.setTimeout(() => {
        onHide();
      }, 3000);

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setRendered(false);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [visible, onHide]);

  if (!rendered) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-component bg-carbon px-4 py-3 text-sm text-white shadow-modal transition-all duration-normal ease-normal",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <span className={cn("inline-flex h-2.5 w-2.5 rounded-full bg-current", typeClasses[type])} />
      <span>{message}</span>
    </div>
  );
}
