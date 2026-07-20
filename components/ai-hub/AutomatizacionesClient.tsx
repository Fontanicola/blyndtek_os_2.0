"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Toast } from "@/components/ui";
import { ClockIcon, InboxIcon, PauseIcon, PlayIcon, SettingsIcon } from "@/components/ui/icons";
import { formatAgentesRelativeTime } from "@/lib/agentes/hub";
import { formatAutomatizacionHorario, normalizeAutomationTime } from "@/lib/agentes/automatizaciones";
import type { AutomatizacionConAgente, AutomatizacionFrecuencia } from "@/types/agentes";

type AutomatizacionesClientProps = {
  initialAutomatizaciones: AutomatizacionConAgente[];
};

const frecuenciaOptions: Array<{ value: AutomatizacionFrecuencia; label: string }> = [
  { value: "diaria", label: "Diaria" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" }
];

const weekdayOptions = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" }
];

function agentBadgeVariant(tipo?: string | null) {
  if (tipo === "analista") {
    return "success" as const;
  }

  if (tipo === "generador") {
    return "warning" as const;
  }

  if (tipo === "ejecutor") {
    return "signal" as const;
  }

  if (tipo === "vigilante") {
    return "danger" as const;
  }

  return "ghost" as const;
}

export function AutomatizacionesClient({ initialAutomatizaciones }: AutomatizacionesClientProps) {
  const [automatizaciones, setAutomatizaciones] = useState(initialAutomatizaciones);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error"; visible: boolean }>({
    message: "",
    type: "info",
    visible: false
  });
  const [drafts, setDrafts] = useState<Record<string, Pick<AutomatizacionConAgente, "frecuencia" | "dia_semana" | "dia_mes" | "hora">>>(
    Object.fromEntries(
      initialAutomatizaciones.map((item) => [
        item.id,
        {
          frecuencia: item.frecuencia,
          dia_semana: item.dia_semana,
          dia_mes: item.dia_mes,
          hora: normalizeAutomationTime(item.hora)
        }
      ])
    )
  );

  function showToast(message: string, type: "success" | "info" | "warning" | "error" = "info") {
    setToast({ message, type, visible: true });
  }

  function hideToast() {
    setToast((current) => ({ ...current, visible: false }));
  }

  async function patchAutomation(id: string, payload: Record<string, unknown>) {
    setSavingId(id);

    try {
      const response = await fetch(`/api/automatizaciones/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as { data?: AutomatizacionConAgente; error?: string };

      if (!response.ok || !result.data) {
        throw new Error(result.error ?? "No se pudo actualizar la automatización.");
      }

      setAutomatizaciones((current) => current.map((item) => (item.id === id ? result.data! : item)));
      setDrafts((current) => ({
        ...current,
        [id]: {
          frecuencia: result.data!.frecuencia,
          dia_semana: result.data!.dia_semana,
          dia_mes: result.data!.dia_mes,
          hora: normalizeAutomationTime(result.data!.hora)
        }
      }));
      showToast("Automatización actualizada.", "success");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo actualizar la automatización.", "error");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function toggleAutomation(item: AutomatizacionConAgente) {
    await patchAutomation(item.id, { activa: !item.activa });
  }

  async function saveSchedule(item: AutomatizacionConAgente) {
    const draft = drafts[item.id];
    if (!draft) {
      return;
    }

    const saved = await patchAutomation(item.id, {
      frecuencia: draft.frecuencia,
      dia_semana: draft.frecuencia === "semanal" ? draft.dia_semana ?? 1 : null,
      dia_mes: draft.frecuencia === "mensual" ? draft.dia_mes ?? 1 : null,
      hora: normalizeAutomationTime(draft.hora)
    });

    if (saved) {
      setEditingId(null);
    }
  }

  if (automatizaciones.length === 0) {
    return (
      <EmptyState
        icon={InboxIcon}
        titulo="No hay automatizaciones cargadas"
        descripcion="Cuando un agente tenga una tarea recurrente, va a aparecer acá para poder pausarla o editar su horario."
      />
    );
  }

  return (
    <div className="space-y-4">
      {automatizaciones.map((item) => {
        const draft = drafts[item.id] ?? {
          frecuencia: item.frecuencia,
          dia_semana: item.dia_semana,
          dia_mes: item.dia_mes,
          hora: normalizeAutomationTime(item.hora)
        };
        const isEditing = editingId === item.id;

        return (
          <Card key={item.id} padding="md" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-title text-lg text-carbon">{item.nombre}</h2>
                  <Badge variant={agentBadgeVariant(item.agentes?.tipo)}>{item.agentes?.nombre ?? "Agente"}</Badge>
                  <Badge variant={item.activa ? "success" : "ghost"}>{item.activa ? "Activa" : "Pausada"}</Badge>
                </div>
                {item.descripcion ? <p className="text-sm leading-6 text-graphite">{item.descripcion}</p> : null}
                <p className="flex items-center gap-2 text-sm text-graphite">
                  <ClockIcon size={16} />
                  {formatAutomatizacionHorario(item)}
                </p>
                <p className="text-xs text-graphite">
                  Última ejecución: {item.ultima_ejecucion ? formatAgentesRelativeTime(item.ultima_ejecucion) : "Nunca ejecutada"}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant={item.activa ? "secondary" : "primary"}
                  size="sm"
                  loading={savingId === item.id}
                  onClick={() => void toggleAutomation(item)}
                >
                  {item.activa ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                  {item.activa ? "Pausar" : "Reanudar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingId(isEditing ? null : item.id)}>
                  <SettingsIcon size={16} />
                  Editar horario
                </Button>
              </div>
            </div>

            {isEditing ? (
              <div className="grid gap-3 rounded-card border border-line-soft bg-paper/40 p-4 md:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-label uppercase tracking-widest text-graphite">Frecuencia</span>
                  <select
                    value={draft.frecuencia}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: {
                          ...draft,
                          frecuencia: event.target.value as AutomatizacionFrecuencia
                        }
                      }))
                    }
                    className="h-12 w-full rounded-component border border-line bg-white px-4 text-sm text-carbon outline-none transition-colors duration-fast ease-fast focus:border-signal focus:ring-2 focus:ring-signal/20"
                  >
                    {frecuenciaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {draft.frecuencia === "semanal" ? (
                  <label className="space-y-2">
                    <span className="text-xs font-label uppercase tracking-widest text-graphite">Día semana</span>
                    <select
                      value={draft.dia_semana ?? 1}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            dia_semana: Number(event.target.value)
                          }
                        }))
                      }
                      className="h-12 w-full rounded-component border border-line bg-white px-4 text-sm text-carbon outline-none transition-colors duration-fast ease-fast focus:border-signal focus:ring-2 focus:ring-signal/20"
                    >
                      {weekdayOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {draft.frecuencia === "mensual" ? (
                  <label className="space-y-2">
                    <span className="text-xs font-label uppercase tracking-widest text-graphite">Día mes</span>
                    <Input
                      type="number"
                      value={String(draft.dia_mes ?? 1)}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            dia_mes: Number(event.target.value)
                          }
                        }))
                      }
                    />
                  </label>
                ) : null}

                <label className="space-y-2">
                  <span className="text-xs font-label uppercase tracking-widest text-graphite">Hora</span>
                  <Input
                    type="time"
                    value={normalizeAutomationTime(draft.hora)}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: {
                          ...draft,
                          hora: event.target.value
                        }
                      }))
                    }
                  />
                </label>

                <div className="flex items-end gap-2">
                  <Button size="sm" onClick={() => void saveSchedule(item)} loading={savingId === item.id}>
                    Guardar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </div>
  );
}
