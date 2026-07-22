"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, UserAvatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import { CANAL_ORIGEN_LABELS, isLeadOverdue } from "@/lib/leads";
import type { Usuario } from "@/types/auth";
import type { Lead } from "@/types/leads";
import { LeadNegociacionesSection } from "@/components/leads/LeadNegociacionesSection";
import type { Tarea } from "@/types/tareas";

type LeadCardProps = {
  lead: Lead;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (lead: Lead) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  responsableUsuario?: Pick<Usuario, "nombre" | "foto_url"> | null;
  isAdmin?: boolean;
};

type LeadFollowupTask = Pick<Tarea, "id" | "titulo" | "fecha_limite" | "estado">;

function getLeadBackgroundClass(etapa: Lead["etapa"]) {
  if (etapa === "ganado") {
    return "!bg-success-light";
  }

  return "!bg-white";
}

function getLeadValueSnapshot(lead: Lead) {
  const proposedDevelopment = lead.monto_propuesto_desarrollo ?? lead.valor_estimado ?? null;
  const proposedMonthly = lead.monto_propuesto_mensual ?? null;
  const negotiatedDevelopment = lead.monto_negociado_desarrollo ?? null;
  const negotiatedMonthly = lead.monto_negociado_mensual ?? null;
  const finalDevelopment = negotiatedDevelopment ?? proposedDevelopment;
  const finalMonthly = negotiatedMonthly ?? proposedMonthly;
  const developmentChanged = negotiatedDevelopment !== null && negotiatedDevelopment !== proposedDevelopment;
  const monthlyChanged = negotiatedMonthly !== null && negotiatedMonthly !== proposedMonthly;
  const hasValue = finalDevelopment !== null || finalMonthly !== null;
  const hasNegotiation = developmentChanged || monthlyChanged;

  return {
    hasValue,
    hasNegotiation,
    developmentChanged,
    monthlyChanged,
    proposedDevelopment,
    proposedMonthly,
    negotiatedDevelopment,
    negotiatedMonthly,
    finalDevelopment,
    finalMonthly
  };
}

function formatNegotiatedValue(value: number | null) {
  if (value === null) {
    return "—";
  }

  return formatUSD(value);
}

export function LeadCard({
  lead,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  responsableUsuario,
  isAdmin = false
}: LeadCardProps) {
  const overdue = isLeadOverdue(lead);
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [seguimientoTask, setSeguimientoTask] = useState<LeadFollowupTask | null>(null);
  const [isLoadingSeguimiento, setIsLoadingSeguimiento] = useState(false);
  const [showFullNotes, setShowFullNotes] = useState(false);
  const valueSnapshot = useMemo(() => getLeadValueSnapshot(lead), [lead]);
  const meta = [lead.rubro, lead.ubicacion].filter(Boolean).join(" · ");
  const mainLeadValue = valueSnapshot.finalDevelopment ?? valueSnapshot.finalMonthly;
  const showMonthlyAddon = valueSnapshot.finalDevelopment !== null && valueSnapshot.finalMonthly !== null;

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    let mounted = true;

    async function loadSeguimientoTask() {
      setIsLoadingSeguimiento(true);

      try {
        const response = await fetch(`/api/tareas?lead_id=${encodeURIComponent(lead.id)}`);
        const payload = (await response.json()) as { data?: LeadFollowupTask[]; error?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "No se pudo cargar el seguimiento.");
        }

        if (mounted) {
          setSeguimientoTask(payload.data[0] ?? null);
        }
      } catch {
        if (mounted) {
          setSeguimientoTask(null);
        }
      } finally {
        if (mounted) {
          setIsLoadingSeguimiento(false);
        }
      }
    }

    void loadSeguimientoTask();

    return () => {
      mounted = false;
    };
  }, [isExpanded, lead.id]);

  const touchpoints = useMemo(
    () => [
      { key: "llamada", label: "Llamada", done: lead.llamada_hecho, date: lead.llamada_fecha },
      { key: "seg1", label: "Seguimiento 1", done: lead.seg1_hecho, date: lead.seg1_fecha },
      { key: "seg2", label: "Seguimiento 2", done: lead.seg2_hecho, date: lead.seg2_fecha }
    ].filter((item) => item.done || item.date),
    [lead.llamada_fecha, lead.llamada_hecho, lead.seg1_fecha, lead.seg1_hecho, lead.seg2_fecha, lead.seg2_hecho]
  );

  const hasDetails =
    touchpoints.length > 0 ||
    seguimientoTask !== null ||
    Boolean(lead.notas?.trim()) ||
    valueSnapshot.hasValue ||
    Boolean(lead.monto_propuesto_desarrollo !== null || lead.monto_propuesto_mensual !== null) ||
    Boolean(lead.monto_negociado_desarrollo !== null || lead.monto_negociado_mensual !== null);

  const leadMonthlyDisplay = valueSnapshot.finalMonthly && valueSnapshot.finalMonthly > 0 ? valueSnapshot.finalMonthly : null;

  return (
    <Card
      padding="md"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden",
        getLeadBackgroundClass(lead.etapa),
        "border-l-2 border-transparent",
        overdue && "border-warning",
        isDragging && "opacity-50"
      )}
    >
      <div
        draggable={draggable}
        onDragStart={() => onDragStart?.(lead)}
        onDragEnd={onDragEnd}
        className="space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-label text-carbon">{lead.empresa}</p>
            <p className="mt-1 truncate text-xs text-graphite">{meta || "Sin contexto adicional"}</p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsExpanded((current) => !current);
            }}
            aria-label={isExpanded ? "Colapsar lead" : "Expandir lead"}
            className="mt-1 shrink-0 text-sm text-graphite transition-colors duration-fast ease-fast hover:text-carbon"
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {valueSnapshot.hasValue ? (
              <div className="space-y-1">
                <p className="text-xs font-label text-graphite">
                  Valor del lead
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-title text-carbon">
                    {mainLeadValue !== null ? formatUSD(mainLeadValue) : "—"}
                  </p>
                  {valueSnapshot.developmentChanged && valueSnapshot.proposedDevelopment !== null ? (
                    <p className="text-xs text-graphite line-through">
                      {formatNegotiatedValue(valueSnapshot.proposedDevelopment)}
                    </p>
                  ) : null}
                  {showMonthlyAddon && leadMonthlyDisplay !== null ? (
                    <span className="text-xs text-graphite">+ {formatUSD(leadMonthlyDisplay)}/mes</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isAdmin && valueSnapshot.hasValue && lead.comision_estimada_usd != null ? (
              <p className="text-xs text-graphite">
                Comisión est.: {formatUSD(lead.comision_estimada_usd)} (
                {lead.comision_estimada_pct != null ? lead.comision_estimada_pct.toFixed(1) : "0.0"}%)
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Badge variant={lead.canal === "outbound" ? "signal" : "warning"} className="text-[10px]">
              {lead.canal === "outbound" ? "Outbound" : "Inbound"}
            </Badge>
            {lead.canal_origen ? (
              <Badge variant="ghost" className="text-[10px]">
                {CANAL_ORIGEN_LABELS[lead.canal_origen]}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            {["llamada", "seg1", "seg2"].map((touchpointKey, index) => {
              const touchpoint = touchpoints.find((item) => item.key === touchpointKey);

              return (
                <span
                  key={`${lead.id}-touch-${index}`}
                  className={cn(
                    "inline-flex h-2 w-2 rounded-full border border-line",
                    touchpoint?.done ? "border-success bg-success" : "bg-paper"
                  )}
                  title={touchpoint?.date ? `${touchpoint.label}: ${formatFecha(touchpoint.date)}` : touchpoint?.label}
                />
              );
            })}
          </div>

          <UserAvatar
            name={responsableUsuario?.nombre ?? lead.vendedor_nombre ?? "Sin asignar"}
            fotoUrl={responsableUsuario?.foto_url ?? null}
            size="xs"
            className="shrink-0"
            textClassName="text-[9px]"
          />
        </div>

        {isExpanded ? (
          <div className="space-y-4 border-t border-line-soft pt-4" onClick={(event) => event.stopPropagation()}>
            {touchpoints.length > 0 ? (
              <section className="space-y-2">
                <p className="text-xs font-label text-graphite">Touch points</p>
                <div className="flex flex-wrap gap-2">
                  {touchpoints.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-component border border-line-soft bg-paper px-3 py-2 text-xs text-carbon"
                    >
                      <p className="font-label text-carbon">{item.label}</p>
                      {item.date ? <p className="mt-1 text-graphite">{formatFecha(item.date)}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {isLoadingSeguimiento ? (
              <p className="text-xs text-graphite">Cargando seguimiento...</p>
            ) : seguimientoTask ? (
              <section className="space-y-2">
                <p className="text-xs font-label text-graphite">
                  Próximo seguimiento
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(`/tareas?lead_id=${lead.id}`);
                  }}
                  className="block w-full rounded-component border border-line-soft bg-paper px-3 py-2 text-left transition-colors duration-fast ease-fast hover:bg-white"
                >
                  <p className="text-sm font-label text-carbon">{seguimientoTask.titulo}</p>
                  <p className="mt-1 text-xs text-graphite">
                    {seguimientoTask.fecha_limite ? formatFecha(seguimientoTask.fecha_limite) : "Sin fecha límite"}
                  </p>
                </button>
              </section>
            ) : null}

            {lead.notas?.trim() ? (
              <section className="space-y-2">
                <p className="text-xs font-label text-graphite">
                  Notas de calificación
                </p>
                <div className="rounded-component border border-line-soft bg-paper px-3 py-2 text-sm text-carbon">
                  <p className={cn("break-words", !showFullNotes && lead.notas.length > 180 && "line-clamp-3")}>
                    {lead.notas}
                  </p>
                  {lead.notas.length > 180 ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowFullNotes((current) => !current);
                      }}
                      className="mt-2 text-xs font-label text-signal hover:underline"
                    >
                      {showFullNotes ? "Ver menos" : "Ver más"}
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            {valueSnapshot.hasValue ? (
              <section className="space-y-2">
                <p className="text-xs font-label text-graphite">Monto capturado</p>
                <div className="rounded-component border border-line-soft bg-paper px-3 py-2 text-sm text-carbon">
                  <p>
                    Desarrollo: <span className="font-label">{formatUSD(valueSnapshot.finalDevelopment ?? 0)}</span>
                    {valueSnapshot.hasNegotiation && valueSnapshot.proposedDevelopment !== null ? (
                      <span className="ml-2 text-xs text-graphite line-through">
                        {formatUSD(valueSnapshot.proposedDevelopment)}
                      </span>
                    ) : null}
                  </p>
                  {leadMonthlyDisplay !== null ? (
                    <p className="mt-1">
                      Mensual: <span className="font-label">{formatUSD(leadMonthlyDisplay)}</span>
                      {valueSnapshot.monthlyChanged && valueSnapshot.proposedMonthly !== null ? (
                        <span className="ml-2 text-xs text-graphite line-through">
                          {formatUSD(valueSnapshot.proposedMonthly)}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            <LeadNegociacionesSection lead={lead} />

            {!hasDetails ? <p className="text-xs text-graphite">Sin información adicional todavía.</p> : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
