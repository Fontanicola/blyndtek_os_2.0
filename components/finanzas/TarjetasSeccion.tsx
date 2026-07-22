"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, EmptyState, Input, Modal } from "@/components/ui";
import { WalletIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useTarjetas } from "@/lib/hooks/useTarjetas";
import type { Tarjeta, TipoTarjeta, CreateTarjetaInput } from "@/types/tarjetas";

type TarjetasSeccionProps = {
  showToast?: (message: string, type?: "success" | "info" | "warning" | "error") => void;
};

type TarjetaFormState = {
  alias: string;
  banco: string;
  titular: string;
  ultimos_4: string;
  vencimiento: string;
  tipo: TipoTarjeta;
  uso_habitual: string;
  notas: string;
};

const tipoLabels: Record<TipoTarjeta, string> = {
  debito: "Débito",
  credito: "Crédito",
  prepaga: "Prepaga"
};

const typeCardClasses: Record<TipoTarjeta, string> = {
  debito: "bg-gradient-to-br from-signal via-signal-hover to-carbon-soft",
  credito: "bg-gradient-to-br from-carbon via-carbon-soft to-graphite",
  prepaga: "bg-gradient-to-br from-graphite via-carbon-soft to-carbon"
};

const typeAccentClasses: Record<TipoTarjeta, string> = {
  debito: "bg-signal-light/20",
  credito: "bg-white/10",
  prepaga: "bg-white/10"
};

function formatTarjetaFormValue(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatTarjetaDisplayValue(value: string | null) {
  return value?.trim() ? value.trim() : "Sin vencimiento";
}

function formatUltimos4(value: string) {
  return `•••• •••• •••• ${value}`;
}

function normalizeTarjetaInput(state: TarjetaFormState): CreateTarjetaInput {
  return {
    alias: state.alias.trim(),
    banco: state.banco.trim() || null,
    titular: state.titular.trim() || null,
    ultimos_4: state.ultimos_4.replace(/\D/g, "").slice(0, 4),
    vencimiento: state.vencimiento.trim() || null,
    tipo: state.tipo,
    uso_habitual: state.uso_habitual.trim() || null,
    notas: state.notas.trim() || null
  };
}

function buildInitialState(tarjeta: Tarjeta | null): TarjetaFormState {
  return {
    alias: tarjeta?.alias ?? "",
    banco: tarjeta?.banco ?? "",
    titular: tarjeta?.titular ?? "",
    ultimos_4: tarjeta?.ultimos_4 ?? "",
    vencimiento: tarjeta?.vencimiento ?? "",
    tipo: tarjeta?.tipo ?? "credito",
    uso_habitual: tarjeta?.uso_habitual ?? "",
    notas: tarjeta?.notas ?? ""
  };
}

function TarjetaCard({
  tarjeta,
  expanded,
  onToggle,
  onEdit,
  onDelete
}: {
  tarjeta: Tarjeta;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="relative" ref={menuRootRef}>
      <Card
        padding="none"
        onClick={onToggle}
        className={cn(
          "group relative overflow-hidden rounded-card text-white shadow-card transition-transform duration-fast ease-fast hover:-translate-y-0.5",
          typeCardClasses[tarjeta.tipo]
        )}
      >
        <div className={cn("absolute inset-0 opacity-80", typeAccentClasses[tarjeta.tipo])} />
        <div className="relative flex min-h-[190px] aspect-[1.6/1] flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-label tracking-[0.02em] text-white/90">{tarjeta.alias}</p>
              <p className="mt-1 text-2xl font-title tracking-[0.08em] text-white/95">{formatUltimos4(tarjeta.ultimos_4)}</p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 px-0 py-0 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((current) => !current);
              }}
            >
              ⋮
            </Button>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm text-white/80">{tarjeta.banco ?? "Banco no informado"}</p>
              <p className="text-sm font-label text-white/80">{tipoLabels[tarjeta.tipo]}</p>
            </div>

            <p className="text-sm font-label tracking-[0.08em] text-white/90">{formatTarjetaDisplayValue(tarjeta.vencimiento)}</p>
          </div>

          {expanded ? (
            <div className="mt-4 rounded-card border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <div className="grid gap-3 text-sm text-white/90">
                <div>
                  <span className="block text-xs font-label text-white/60">Titular</span>
                  <span className="block font-label">{tarjeta.titular ?? "Sin titular"}</span>
                </div>
                <div>
                  <span className="block text-xs font-label text-white/60">Uso habitual</span>
                  <span className="block">{tarjeta.uso_habitual ?? "Sin uso habitual"}</span>
                </div>
                <div>
                  <span className="block text-xs font-label text-white/60">Notas</span>
                  <span className="block">{tarjeta.notas ?? "Sin notas"}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {menuOpen ? (
        <div className="absolute right-3 top-12 z-20 w-40 rounded-card border border-line bg-white p-2 shadow-modal">
          <button
            type="button"
            className="w-full rounded-component px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
            onClick={() => {
              setMenuOpen(false);
              onEdit();
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className="w-full rounded-component px-3 py-2 text-left text-sm text-danger transition-colors duration-fast ease-fast hover:bg-danger-light"
            onClick={() => {
              setMenuOpen(false);
              const confirmed = window.confirm("¿Eliminar esta tarjeta?");
              if (confirmed) {
                onDelete();
              }
            }}
          >
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function TarjetasSeccion({ showToast }: TarjetasSeccionProps) {
  const { tarjetas, loading, error, createTarjeta, updateTarjeta, deleteTarjeta } = useTarjetas();
  const [selectedTarjeta, setSelectedTarjeta] = useState<Tarjeta | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState<TarjetaFormState>(buildInitialState(null));

  useEffect(() => {
    if (!selectedTarjeta) {
      return;
    }

    setFormState(buildInitialState(selectedTarjeta));
  }, [selectedTarjeta]);

  function openCreateModal() {
    setSelectedTarjeta(null);
    setFormError(null);
    setFormState(buildInitialState(null));
    setModalOpen(true);
  }

  function openEditModal(tarjeta: Tarjeta) {
    setSelectedTarjeta(tarjeta);
    setFormError(null);
    setFormState(buildInitialState(tarjeta));
    setModalOpen(true);
  }

  async function handleSubmit() {
    const normalized = normalizeTarjetaInput(formState);

    if (!normalized.alias) {
      setFormError("El alias es obligatorio.");
      return;
    }

    if (!/^\d{4}$/.test(normalized.ultimos_4)) {
      setFormError("Los últimos 4 dígitos deben tener exactamente 4 números.");
      return;
    }

    try {
      if (selectedTarjeta) {
        await updateTarjeta(selectedTarjeta.id, normalized);
        showToast?.("Tarjeta actualizada.", "success");
      } else {
        await createTarjeta(normalized);
        showToast?.("Tarjeta creada.", "success");
      }

      setModalOpen(false);
      setSelectedTarjeta(null);
      setFormError(null);
    } catch (mutationError) {
      setFormError(mutationError instanceof Error ? mutationError.message : "No se pudo guardar la tarjeta.");
      showToast?.(mutationError instanceof Error ? mutationError.message : "No se pudo guardar la tarjeta.", "error");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-title text-carbon">Tarjetas</h3>
          <p className="text-sm text-graphite">Tarjetero de referencia rápida para identificar medios de gasto.</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            openCreateModal();
          }}
        >
          + Nueva tarjeta
        </Button>
      </div>

      {loading ? <Card padding="md" className="text-sm text-graphite">Cargando tarjetas...</Card> : null}

      {error ? (
        <Card padding="md" className="border border-danger/20 bg-danger-light text-sm text-danger">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tarjetas.map((tarjeta) => (
          <TarjetaCard
            key={tarjeta.id}
            tarjeta={tarjeta}
            expanded={expandedId === tarjeta.id}
            onToggle={() => setExpandedId((current) => (current === tarjeta.id ? null : tarjeta.id))}
            onEdit={() => openEditModal(tarjeta)}
            onDelete={async () => {
              try {
                await deleteTarjeta(tarjeta.id);
                if (expandedId === tarjeta.id) {
                  setExpandedId(null);
                }
                showToast?.("Tarjeta eliminada.", "success");
              } catch (mutationError) {
                showToast?.(mutationError instanceof Error ? mutationError.message : "No se pudo eliminar la tarjeta.", "error");
              }
            }}
          />
        ))}

        {tarjetas.length === 0 && !loading ? (
          <Card padding="lg" className="border border-dashed border-line bg-white text-sm text-graphite">
            <EmptyState
              icon={WalletIcon}
              titulo="Todavía no hay tarjetas cargadas"
              descripcion="Agregá tarjetas para tener a mano vencimientos, usos y responsables."
              className="border-0 bg-transparent"
            />
          </Card>
        ) : null}
      </div>

      <p className="text-xs text-graphite">
        Por seguridad, acá solo guardamos datos de referencia. Para el número completo o CVV, usá tu gestor de contraseñas.
      </p>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedTarjeta ? "Editar tarjeta" : "Nueva tarjeta"} size="lg">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Alias"
              value={formState.alias}
              onChange={(event) => setFormState((current) => ({ ...current, alias: event.target.value }))}
            />
            <Input
              label="Banco"
              value={formState.banco}
              onChange={(event) => setFormState((current) => ({ ...current, banco: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Titular"
              value={formState.titular}
              onChange={(event) => setFormState((current) => ({ ...current, titular: event.target.value }))}
            />
            <Input
              label="Últimos 4 dígitos"
              inputMode="numeric"
              value={formState.ultimos_4}
              maxLength={4}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  ultimos_4: event.target.value.replace(/\D/g, "").slice(0, 4)
                }))
              }
              hint="Solo los últimos 4. No guardamos número completo ni CVV."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Vencimiento"
              value={formState.vencimiento}
              placeholder="mm/aa"
              maxLength={5}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  vencimiento: formatTarjetaFormValue(event.target.value)
                }))
              }
            />
            <div className="space-y-1">
              <label className="text-sm font-label text-carbon">Tipo</label>
              <select
                value={formState.tipo}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    tipo: event.target.value as TipoTarjeta
                  }))
                }
                className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              >
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="prepaga">Prepaga</option>
              </select>
            </div>
          </div>

          <Input
            label="Uso habitual"
            value={formState.uso_habitual}
            onChange={(event) => setFormState((current) => ({ ...current, uso_habitual: event.target.value }))}
            hint='Ej: "Suscripciones de herramientas"'
          />

          <div className="space-y-1">
            <label className="text-sm font-label text-carbon">Notas</label>
            <textarea
              value={formState.notas}
              onChange={(event) => setFormState((current) => ({ ...current, notas: event.target.value }))}
              className="min-h-[110px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
          </div>

          {formError ? <p className="text-sm text-danger">{formError}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false);
                setSelectedTarjeta(null);
                setFormError(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
