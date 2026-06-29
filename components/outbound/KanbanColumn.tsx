"use client";

import type { ReactNode } from "react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { EtapaLead, Lead } from "@/types/leads";
import { LeadCard } from "./LeadCard";

type KanbanColumnProps = {
  etapa: EtapaLead;
  label: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onAddLead: (etapa: EtapaLead) => void;
  draggedLeadId?: string | null;
  isDropTarget?: boolean;
  onDropLead?: (etapa: EtapaLead) => void;
  onDragEnterColumn?: (etapa: EtapaLead) => void;
  onDragLeaveColumn?: () => void;
  onDragStartLead?: (lead: Lead) => void;
  onDragEndLead?: () => void;
  footer?: ReactNode;
};

export function KanbanColumn({
  etapa,
  label,
  leads,
  onLeadClick,
  onAddLead,
  draggedLeadId = null,
  isDropTarget = false,
  onDropLead,
  onDragEnterColumn,
  onDragLeaveColumn,
  onDragStartLead,
  onDragEndLead,
  footer
}: KanbanColumnProps) {
  return (
    <section
      className={cn(
        "flex h-full min-w-[280px] max-w-[280px] flex-col rounded-card bg-paper p-3 transition-all duration-fast ease-fast",
        isDropTarget && "ring-2 ring-signal"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        onDragEnterColumn?.(etapa);
      }}
      onDragEnter={() => onDragEnterColumn?.(etapa)}
      onDragLeave={onDragLeaveColumn}
      onDrop={(event) => {
        event.preventDefault();
        onDropLead?.(etapa);
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-label text-graphite">{label}</h2>
          <Badge variant="default">{leads.length}</Badge>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick(lead)}
            draggable
            onDragStart={onDragStartLead}
            onDragEnd={onDragEndLead}
            isDragging={draggedLeadId === lead.id}
          />
        ))}

        {footer}
      </div>

      <div className="pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddLead(etapa)}
          className="w-full justify-center"
        >
          +
        </Button>
      </div>
    </section>
  );
}
