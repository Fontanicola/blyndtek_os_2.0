"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EntityMultiSelect, EntitySelect, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { PROYECTO_ESTADO_LABELS, PROYECTO_ESTADO_OPTIONS } from "@/lib/proyectos";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { CuentaServicio, CreateCuentaServicioInput } from "@/types/cuentas";
import type { CreateFeatureInput, Feature, UpdateFeatureInput } from "@/types/features";
import type { Proyecto, UpdateProyectoInput } from "@/types/proyectos";
import type { Usuario } from "@/types/auth";
import { CuentaServicioCard } from "./CuentaServicioCard";
import { CuentaServicioModal } from "./CuentaServicioModal";
import { FeaturesKanban } from "./FeaturesKanban";

type ProyectoFichaProps = {
  proyecto: Proyecto;
  clienteNombre: string;
  isAdmin: boolean;
  features: Feature[];
  usuarios: Array<Pick<Usuario, "id" | "nombre" | "email" | "rol">>;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado">>;
  onProyectoUpdated: (proyecto: Proyecto) => void | Promise<void>;
  onUpdateProyecto: (input: UpdateProyectoInput) => Promise<Proyecto>;
  onCreateFeature: (input: CreateFeatureInput) => Promise<{ data?: Feature; project?: Proyecto | null }>;
  onUpdateFeature: (id: string, input: UpdateFeatureInput) => Promise<{ data?: Feature; project?: Proyecto | null }>;
  onDeleteFeature: (id: string) => Promise<{ success?: boolean; project?: Proyecto | null }>;
};

type TabKey = "general" | "features" | "cuentas" | "roadmap";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "general", label: "General" },
  { key: "features", label: "Features" },
  { key: "cuentas", label: "Cuentas y servicios" },
  { key: "roadmap", label: "Roadmap" }
];

function getEstadoVariant(estado: Proyecto["estado"]) {
  if (estado === "en_desarrollo" || estado === "implementacion") {
    return "signal" as const;
  }

  if (estado === "entregado") {
    return "success" as const;
  }

  if (estado === "pausado") {
    return "warning" as const;
  }

  return "default" as const;
}

function InlineField({
  label,
  value,
  onSave,
  type = "text",
  placeholder = "Sin dato"
}: {
  label: string;
  value: string | null;
  onSave: (value: string | null) => void | Promise<void>;
  type?: "text" | "date" | "number";
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  async function commit() {
    setEditing(false);
    const next = draft.trim();
    await onSave(next.length > 0 ? next : null);
  }

  if (!editing) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-component bg-paper px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-white"
        >
          {value ? value : <span className="text-graphite">{placeholder}</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      <Input
        autoFocus
        type={type}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && type !== "text") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onSave,
  placeholder = "Sin dato"
}: {
  label: string;
  value: string | null;
  onSave: (value: string | null) => void | Promise<void>;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  async function commit() {
    setEditing(false);
    const next = draft.trim();
    await onSave(next.length > 0 ? next : null);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            void commit();
          }}
          className={cn(
            "min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon",
            "transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          )}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-component bg-paper px-3 py-2 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-white"
        >
          {value ? value : <span className="text-graphite">{placeholder}</span>}
        </button>
      )}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-pill bg-paper">
        <div className="h-2 rounded-pill bg-signal transition-all duration-normal ease-normal" style={{ width: `${value}%` }} />
      </div>
      <p className="text-xs text-graphite">{value}% completado</p>
    </div>
  );
}

export function ProyectoFicha({
  proyecto,
  clienteNombre,
  isAdmin,
  features,
  usuarios,
  proyectos,
  onProyectoUpdated,
  onUpdateProyecto,
  onCreateFeature,
  onUpdateFeature,
  onDeleteFeature
}: ProyectoFichaProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [cuentas, setCuentas] = useState<CuentaServicio[]>([]);
  const [cuentaModalOpen, setCuentaModalOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaServicio | null>(null);
  const [roadmapOrigin, setRoadmapOrigin] = useState("");

  useEffect(() => {
    setRoadmapOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setCuentas([]);
      return;
    }

    void (async () => {
      const response = await fetch(`/api/proyectos/${proyecto.id}/cuentas`);
      const payload = (await response.json()) as { data?: CuentaServicio[]; error?: string };

      if (response.ok && payload.data) {
        setCuentas(payload.data);
      }
    })();
  }, [isAdmin, proyecto.id]);

  const roadmapUrl = useMemo(() => `${roadmapOrigin}/roadmap/${proyecto.roadmap_token}`, [
    proyecto.roadmap_token,
    roadmapOrigin
  ]);

  async function persistProyecto(input: UpdateProyectoInput) {
    const updated = await onUpdateProyecto(input);
    await onProyectoUpdated(updated);
    return updated;
  }

  async function saveCuenta(input: CreateCuentaServicioInput) {
    const response = editingCuenta
      ? await fetch(`/api/cuentas/${editingCuenta.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input)
        })
      : await fetch(`/api/proyectos/${proyecto.id}/cuentas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input)
        });

    const payload = (await response.json()) as { data?: CuentaServicio; error?: string };

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo guardar la cuenta.");
    }

    setCuentas((current) => {
      if (editingCuenta) {
        return current.map((cuenta) => (cuenta.id === editingCuenta.id ? payload.data! : cuenta));
      }

      return [...current, payload.data!];
    });
    setEditingCuenta(null);
  }

  async function deleteCuenta(id: string) {
    const response = await fetch(`/api/cuentas/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { success?: boolean; error?: string };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? "No se pudo eliminar la cuenta.");
    }

    setCuentas((current) => current.filter((cuenta) => cuenta.id !== id));
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-line-soft pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
              activeTab === tab.key
                ? "bg-signal-light text-signal"
                : "text-graphite hover:bg-white hover:text-carbon"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card padding="lg" className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-title text-carbon">{proyecto.nombre}</h2>
                <Badge variant={getEstadoVariant(proyecto.estado)}>
                  {PROYECTO_ESTADO_LABELS[proyecto.estado]}
                </Badge>
              </div>
              <p className="text-sm text-graphite">{clienteNombre}</p>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-title text-carbon">General</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Cliente</p>
                  <p className="rounded-component bg-paper px-3 py-2 text-sm text-carbon">{clienteNombre}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Estado</p>
                  <select
                    value={proyecto.estado}
                    onChange={async (event) => {
                      await persistProyecto({
                        estado: event.target.value as Proyecto["estado"]
                      });
                    }}
                    className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                  >
                    {PROYECTO_ESTADO_OPTIONS.map((estado) => (
                      <option key={estado} value={estado}>
                        {PROYECTO_ESTADO_LABELS[estado]}
                      </option>
                    ))}
                  </select>
                </div>

                <EntitySelect
                  label="Responsable"
                  value={proyecto.responsable_id}
                  allowEmpty
                  placeholder="Sin responsable"
                  options={usuarios.map((usuario) => ({
                    id: usuario.id,
                    label: usuario.nombre,
                    sublabel: usuario.rol
                  }))}
                  onChange={async (value) => {
                    await persistProyecto({ responsable_id: value });
                  }}
                />
                <EntityMultiSelect
                  label="Devs asignados"
                  values={proyecto.devs_asignados}
                  placeholder="Agregar devs"
                  options={usuarios.map((usuario) => ({
                    id: usuario.id,
                    label: usuario.nombre,
                    sublabel: usuario.email
                  }))}
                  onChange={async (value) => {
                    await persistProyecto({
                      devs_asignados: value
                    });
                  }}
                />
                <InlineField
                  label="Fecha inicio"
                  value={proyecto.fecha_inicio}
                  onSave={async (value) => {
                    await persistProyecto({ fecha_inicio: value });
                  }}
                  type="date"
                />
                <InlineField
                  label="Entrega comprometida"
                  value={proyecto.entrega_comprometida}
                  onSave={async (value) => {
                    await persistProyecto({ entrega_comprometida: value });
                  }}
                  type="date"
                />
                <InlineField
                  label="Entrega real"
                  value={proyecto.entrega_real}
                  onSave={async (value) => {
                    await persistProyecto({ entrega_real: value });
                  }}
                  type="date"
                />
                <InlineField
                  label="Valor total"
                  value={proyecto.valor_total !== null ? String(proyecto.valor_total) : null}
                  onSave={async (value) => {
                    await persistProyecto({ valor_total: value ? Number(value) : null });
                  }}
                  type="number"
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-title text-carbon">Avance</h3>
              <ProgressBar value={proyecto.avance_pct} />
            </section>
          </Card>

          <Card padding="lg" className="space-y-4">
            <h3 className="text-sm font-title text-carbon">Notas de arquitectura / DB</h3>
            <TextareaField
              label="Notas"
              value={proyecto.notas_arquitectura}
              onSave={async (value) => {
                await persistProyecto({ notas_arquitectura: value });
              }}
            />

            <div className="space-y-2 rounded-card bg-paper p-4">
              <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Resumen</p>
              <p className="text-sm text-carbon">
                Precio total: {proyecto.valor_total !== null ? formatUSD(proyecto.valor_total) : "Sin definir"}
              </p>
              <p className="text-sm text-carbon">
                Entrega comprometida: {proyecto.entrega_comprometida ? formatFecha(proyecto.entrega_comprometida) : "Sin fecha"}
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "features" ? (
        <FeaturesKanban
          projectId={proyecto.id}
          features={features}
          onCreateFeature={async (input) => {
            const result = await onCreateFeature(input);
            if (result.project) {
              await onProyectoUpdated(result.project);
            }
          }}
          onUpdateFeature={async (id, input) => {
            const result = await onUpdateFeature(id, input);
            if (result.project) {
              await onProyectoUpdated(result.project);
            }
            return result;
          }}
          onDeleteFeature={async (id) => {
            const result = await onDeleteFeature(id);
            if (result.project) {
              await onProyectoUpdated(result.project);
            }
          }}
          onMoveFeature={async (id, estado) => {
            return onUpdateFeature(id, { estado });
          }}
        />
      ) : null}

      {activeTab === "cuentas" ? (
        isAdmin ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-title text-carbon">Cuentas y servicios</h3>
                <p className="mt-1 text-sm text-graphite">Credenciales internas y accesos del proyecto.</p>
              </div>
              <Button variant="secondary" onClick={() => setCuentaModalOpen(true)}>
                Nueva cuenta
              </Button>
            </div>

            <div className="space-y-3">
              {cuentas.length > 0 ? (
                cuentas.map((cuenta) => (
                  <CuentaServicioCard
                    key={cuenta.id}
                    cuenta={cuenta}
                    isAdmin={isAdmin}
                    onEdit={() => {
                      setEditingCuenta(cuenta);
                      setCuentaModalOpen(true);
                    }}
                    onDelete={async () => {
                      await deleteCuenta(cuenta.id);
                    }}
                  />
                ))
              ) : (
                <Card padding="lg">
                  <p className="text-sm text-graphite">Todavía no hay cuentas/servicios cargados.</p>
                </Card>
              )}
            </div>

            <CuentaServicioModal
              isOpen={cuentaModalOpen}
              onClose={() => {
                setCuentaModalOpen(false);
                setEditingCuenta(null);
              }}
              cuenta={editingCuenta}
              proyectos={proyectos}
              defaultProyectoId={proyecto.id}
              onSave={saveCuenta}
            />
          </div>
        ) : (
          <Card padding="lg">
            <p className="text-sm text-graphite">Solo administradores pueden ver las credenciales.</p>
          </Card>
        )
      ) : null}

      {activeTab === "roadmap" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card padding="lg" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-title text-carbon">Roadmap público</h3>
                <p className="mt-1 text-sm text-graphite">
                  La vista pública se activa con el token único del proyecto.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-carbon">
                <input
                  type="checkbox"
                  checked={proyecto.roadmap_publico_activo}
                  onChange={async (event) => {
                    await persistProyecto({
                      roadmap_publico_activo: event.target.checked
                    });
                  }}
                  className="h-4 w-4 rounded border-line text-signal focus:ring-signal/20"
                />
                Activo
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-label uppercase tracking-[0.08em] text-graphite">Link público</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input value={roadmapUrl} readOnly className="flex-1" />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(roadmapUrl);
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          </Card>

          <Card padding="lg" className="space-y-3">
            <h3 className="text-sm font-title text-carbon">Preview</h3>
            <p className="text-sm text-graphite">
              La vista pública real se construye en el paso 2.2 y consume este token.
            </p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
