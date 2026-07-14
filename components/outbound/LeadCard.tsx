"use client";

import { Badge, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { isLeadOverdue } from "@/lib/leads";
import type { Usuario } from "@/types/auth";
import type { Lead } from "@/types/leads";

type LeadCardProps = {
  lead: Lead;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (lead: Lead) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  responsableUsuario?: Pick<Usuario, "nombre" | "foto_url"> | null;
};

function getLeadBackgroundClass(etapa: Lead["etapa"]) {
  if (etapa === "ganado") {
    return "!bg-success-light";
  }

  return "!bg-white";
}

export function LeadCard({
  lead,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  responsableUsuario
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
        "w-full rounded-card p-4 text-left shadow-soft transition-all duration-fast ease-fast hover:shadow-card",
        getLeadBackgroundClass(lead.etapa),
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

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={lead.canal === "outbound" ? "signal" : "warning"} className="text-[10px]">
            {lead.canal === "outbound" ? "Outbound" : "Inbound"}
          </Badge>

          {lead.valor_estimado !== null ? (
            <span className="text-sm font-label text-carbon">
              USD {lead.valor_estimado.toLocaleString("en-US")}
            </span>
          ) : null}
        </div>
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

        <UserAvatar
          name={responsableUsuario?.nombre ?? lead.responsable_id}
          fotoUrl={responsableUsuario?.foto_url ?? null}
          size="xs"
          className="shrink-0"
          textClassName="text-[9px]"
        />
      </div>
    </button>
  );
}
