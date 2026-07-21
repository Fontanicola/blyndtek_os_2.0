"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FilterIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type FilterPopoverProps = {
  children: ReactNode;
  activeCount?: number;
  className?: string;
  align?: "left" | "right";
  label?: string;
  iconOnly?: boolean;
};

export function FilterPopover({
  children,
  activeCount = 0,
  className,
  align = "left",
  label = "Filtros",
  iconOnly = false
}: FilterPopoverProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((current) => !current)}
        className={cn("relative", iconOnly && "px-2.5")}
      >
        <FilterIcon />
        {!iconOnly ? label : null}
        {activeCount > 0 ? (
          <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-[10px] font-label leading-none text-white">
            {activeCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 w-[340px] rounded-card border border-[#EAECF0] bg-white p-4 shadow-modal",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
