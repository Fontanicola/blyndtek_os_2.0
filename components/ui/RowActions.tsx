"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MoreVerticalIcon } from "./icons";
import { cn } from "@/lib/cn";

export type RowActionKind = "view" | "edit" | "duplicate" | "update" | "changeState" | "download" | "destructive";
export type RowAction = { kind: RowActionKind; label: string; onClick: () => void | Promise<void>; icon?: ReactNode; disabled?: boolean };

const order: RowActionKind[] = ["view", "edit", "duplicate", "update", "changeState", "download", "destructive"];

export function RowActions({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ordered = useMemo(() => [...actions].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)), [actions]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [open]);

  if (!ordered.length) return null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button type="button" aria-label="Más acciones" onClick={() => setOpen((value) => !value)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-graphite transition-colors duration-fast ease-fast hover:bg-paper hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/20">
        <MoreVerticalIcon size={16} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-44 rounded-md border border-line-soft bg-white p-1.5 shadow-modal">
          {ordered.map((action) => (
            <button key={`${action.kind}-${action.label}`} type="button" disabled={action.disabled} onClick={() => { setOpen(false); void action.onClick(); }} className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-fast ease-fast hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50", action.kind === "destructive" ? "text-danger hover:bg-danger-light" : "text-carbon")}>
              {action.icon ? <span className="shrink-0">{action.icon}</span> : null}<span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
