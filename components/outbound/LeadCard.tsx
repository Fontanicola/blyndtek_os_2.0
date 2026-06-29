"use client";

import { cn } from "@/lib/cn";
import { isLeadOverdue } from "@/lib/leads";
import type { Lead } from "@/types/leads";

type LeadCardProps = {
  lead: Lead;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (lead: Lead) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
};

function getInitials(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.slice(0, 2).toUpperCase();
}

export function LeadCard({
  lead,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false
}: LeadCardProps) {
  const meta = [lead.rubro, lead.ubicacion].filter(Boolean).join(" · ");
  const overdue = isLeadOverdue(lead);

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={() => onDragStart?.(lead)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "w-full rounded-card bg-white p-4 text-left shadow-soft transition-all duration-fast ease-fast hover:shadow-card",
        "border-l-2 border-transparent",
        overdue && "border-warning",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-label text-carbon">{lead.empresa}</p>
          {meta ? <p className="mt-1 text-xs text-graphite">{meta}</p> : null}
        </div>

        {lead.valor_estimado !== null ? (
          <span className="shrink-0 text-sm font-label text-carbon">
            USD {lead.valor_estimado.toLocaleString("en-US")}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          {[
            lead.llamada_hecho,
            lead.seg1_hecho,
            lead.seg2_hecho
          ].map((isDone, index) => (
            <span
              key={`${lead.id}-touch-${index}`}
              className={cn(
                "inline-flex h-2 w-2 rounded-full border border-line",
                isDone ? "border-success bg-success" : "bg-paper"
              )}
            />
          ))}
        </div>

        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-light text-[10px] font-label text-signal">
          {getInitials(lead.responsable_id)}
        </div>
      </div>
    </button>
  );
}
