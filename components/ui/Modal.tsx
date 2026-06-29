"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { ModalProps, ModalSize } from "@/types/ui";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[560px]",
  lg: "max-w-[720px]",
  xl: "max-w-[960px]"
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true
}: ModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }

    if (isRendered) {
      setIsClosing(true);

      const timeoutId = window.setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 150);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isOpen, isRendered]);

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRendered, onClose]);

  if (!isRendered) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center bg-carbon/40 p-4 backdrop-blur-sm",
        isClosing ? "animate-overlay-out" : "animate-overlay-in"
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative mt-[10vh] w-full rounded-card bg-white shadow-modal",
          "max-h-[calc(100vh-20vh)] overflow-hidden",
          sizeClasses[size],
          isClosing ? "animate-modal-out" : "animate-modal-in"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
          <h2 id="modal-title" className="text-lg font-title text-carbon">
            {title}
          </h2>

          {showCloseButton ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 px-0 py-0"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </Button>
          ) : null}
        </div>

        <div className="max-h-[calc(100vh-20vh-74px)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
