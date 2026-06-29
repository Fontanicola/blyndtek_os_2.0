"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Toast } from "@/components/ui";
import { ProyectoCard } from "@/components/proyectos";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import { useFinanzas } from "@/lib/hooks/useFinanzas";
import { useProyectos } from "@/lib/hooks/useProyectos";
import type { Cobro } from "@/types/cobros";
import type { Cliente, DatosFacturacion, UpdateClienteInput } from "@/types/clientes";
import type { Proyecto } from "@/types/proyectos";
import type { Suscripcion } from "@/types/suscripciones";

type ClienteFichaProps = {
  cliente: Cliente;
  onUpdate: (input: UpdateClienteInput) => void | Promise<void>;
};

type TabKey = "datos" | "proyectos" | "cobros" | "suscripcion" | "historial";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "datos", label: "Datos generales" },
  { key: "proyectos", label: "Proyectos" },
  { key: "cobros", label: "Cobros" },
  { key: "suscripcion", label: "Suscripción" },
  { key: "historial", label: "Historial" }
];

function formatTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function InlineText({
  label,
  value,
  onSave,
  multiline = false,
  type = "text",
  placeholder = "Sin dato"
}: {
  label: string;
  value: string | null;
  onSave: (value: string | null) => void;
  multiline?: boolean;
  type?: "text" | "email";
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    if (!editing) {
      setDraft(value ?? "");
    }
  }, [editing, value]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    onSave(trimmed ? trimmed : null);
  }

  return (
    <div>
      <p className="mb-1 text-xs font-label uppercase tracking-[0.08em] text-graphite">{label}</p>
      {editing ? (
        multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            className="min-h-[120px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
          />
        ) : (
          <Input
            autoFocus
            type={type}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full rounded-component px-2 py-1 text-left text-sm text-carbon transition-colors duration-fast ease-fast hover:bg-paper"
        >
          {value || <span className="text-graphite">{placeholder}</span>}
        </button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card padding="lg" className="border border-dashed border-line bg-paper">
      <p className="text-sm text-graphite">{text}</p>
    </Card>
  );
}

function CobroBadge({ estado }: { estado: Cobro["estado"] }) {
  const variant =
    estado === "cobrado" ? "success" : estado === "vencido" ? "danger" : estado === "facturado" ? "signal" : "default";

  return <Badge variant={variant}>{estado}</Badge>;
}

function SuscripcionBadge({ estado }: { estado: Suscripcion["estado"] }) {
  const variant =
    estado === "activa" ? "success" : estado === "pausada" ? "warning" : estado === "baja" ? "danger" : "default";

  return <Badge variant={variant}>{estado}</Badge>;
}

export function ClienteFicha({ cliente, onUpdate }: ClienteFichaProps) {
  const router = useRouter();
  const { fetchProyectos } = useProyectos();
  const { fetchCobros, fetchSuscripciones, activarSuscripcion } = useFinanzas();
  const [activeTab, setActiveTab] = useState<TabKey>("datos");
  const [notaDraft, setNotaDraft] = useState("");
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null);
  const [tabLoading, setTabLoading] = useState<TabKey | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "warning" | "error";
    visible: boolean;
  }>({
    message: "",
    type: "success",
    visible: false
  });

  const notes = useMemo(() => {
    return (cliente.notas ?? "")
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }, [cliente.notas]);

  const cobrosResumen = useMemo(() => {
    return cobros.reduce(
      (accumulator, cobro) => {
        if (cobro.estado === "cobrado") {
          accumulator.cobrado += cobro.monto;
        }
        if (cobro.estado === "pendiente") {
          accumulator.pendiente += cobro.monto;
        }
        if (cobro.estado === "vencido") {
          accumulator.vencido += cobro.monto;
        }
        return accumulator;
      },
      { cobrado: 0, pendiente: 0, vencido: 0 }
    );
  }, [cobros]);

  function updateFacturacion(field: keyof DatosFacturacion, value: string | null) {
    void onUpdate({
      datos_facturacion: {
        ...(cliente.datos_facturacion ?? {}),
        [field]: value ?? undefined
      }
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTabData() {
      setTabError(null);

      try {
        if (activeTab === "proyectos") {
          setTabLoading("proyectos");
          const data = await fetchProyectos({ cliente_id: cliente.id });
          if (!cancelled) {
            setProyectos(data);
          }
        }

        if (activeTab === "cobros") {
          setTabLoading("cobros");
          const data = await fetchCobros({ cliente_id: cliente.id });
          if (!cancelled) {
            setCobros(data);
          }
        }

        if (activeTab === "suscripcion") {
          setTabLoading("suscripcion");
          const data = await fetchSuscripciones({ cliente_id: cliente.id });
          if (!cancelled) {
            setSuscripcion(data[0] ?? null);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setTabError(error instanceof Error ? error.message : "No se pudieron cargar los datos.");
        }
      } finally {
        if (!cancelled) {
          setTabLoading(null);
        }
      }
    }

    void loadTabData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, cliente.id, fetchCobros, fetchProyectos, fetchSuscripciones]);

  async function handleActivateSubscription() {
    if (!suscripcion) {
      return;
    }

    setActivating(true);

    try {
      const updated = await activarSuscripcion(suscripcion.id);
      setSuscripcion(updated);
      setToast({
        message: "Suscripción activada correctamente.",
        type: "success",
        visible: true
      });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "No se pudo activar la suscripción.",
        type: "error",
        visible: true
      });
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap gap-2 border-b border-line-soft pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
              activeTab === tab.key
                ? "bg-signal-light text-signal"
                : "text-graphite hover:bg-white hover:text-carbon"
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabError ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {tabError}
        </div>
      ) : null}

      {activeTab === "datos" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <Card padding="lg" className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-title text-carbon">{cliente.empresa}</h2>
                <Badge variant={cliente.estado === "activo" ? "success" : "default"}>
                  {cliente.estado}
                </Badge>
              </div>
              <p className="text-sm text-graphite">{cliente.pais ?? "Sin país"}</p>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-title text-carbon">Contacto</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <InlineText
                  label="Nombre"
                  value={cliente.contacto_nombre}
                  onSave={(value) => void onUpdate({ contacto_nombre: value })}
                />
                <div>
                  <InlineText
                    label="Email"
                    type="email"
                    value={cliente.contacto_email}
                    onSave={(value) => void onUpdate({ contacto_email: value })}
                  />
                  {cliente.contacto_email ? (
                    <a
                      href={`mailto:${cliente.contacto_email}`}
                      className="mt-1 inline-flex text-sm text-signal"
                    >
                      {cliente.contacto_email}
                    </a>
                  ) : null}
                </div>
                <div>
                  <InlineText
                    label="WhatsApp"
                    value={cliente.contacto_whatsapp}
                    onSave={(value) => void onUpdate({ contacto_whatsapp: value })}
                  />
                  {cliente.contacto_whatsapp ? (
                    <a
                      href={`https://wa.me/${cliente.contacto_whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-sm text-signal"
                    >
                      Abrir WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-title text-carbon">Notas</h3>
              <InlineText
                label="Notas"
                value={cliente.notas}
                onSave={(value) => void onUpdate({ notas: value })}
                multiline
              />
            </section>
          </Card>

          <Card padding="lg" className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-title text-carbon">Datos de facturación</h3>
              <InlineText
                label="CUIT"
                value={cliente.datos_facturacion?.cuit ?? null}
                onSave={(value) => updateFacturacion("cuit", value)}
              />
              <InlineText
                label="Razón social"
                value={cliente.datos_facturacion?.razon_social ?? null}
                onSave={(value) => updateFacturacion("razon_social", value)}
              />
              <InlineText
                label="Dirección"
                value={cliente.datos_facturacion?.direccion ?? null}
                onSave={(value) => updateFacturacion("direccion", value)}
              />
              <InlineText
                label="Condición IVA"
                value={cliente.datos_facturacion?.condicion_iva ?? null}
                onSave={(value) => updateFacturacion("condicion_iva", value)}
              />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-title text-carbon">Lead de origen</h3>
              <p className="text-sm text-graphite">
                {cliente.lead_id ? "Ver lead →" : "Sin lead de origen"}
              </p>
            </section>

            <div className="pt-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() =>
                  void onUpdate({
                    estado: cliente.estado === "activo" ? "inactivo" : "activo"
                  })
                }
              >
                {cliente.estado === "activo" ? "Marcar como inactivo" : "Marcar como activo"}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === "proyectos" ? (
        <Card padding="lg" className="space-y-4">
          {tabLoading === "proyectos" ? (
            <p className="text-sm text-graphite">Cargando proyectos...</p>
          ) : proyectos.length > 0 ? (
            <div className="grid gap-4">
              {proyectos.map((proyecto) => (
                <ProyectoCard
                  key={proyecto.id}
                  proyecto={proyecto}
                  clienteNombre={cliente.empresa}
                  onClick={() => router.push("/proyectos")}
                />
              ))}
            </div>
          ) : (
            <EmptyState text="Este cliente no tiene proyectos todavía." />
          )}
        </Card>
      ) : null}

      {activeTab === "cobros" ? (
        <Card padding="lg" className="space-y-4">
          {tabLoading === "cobros" ? (
            <p className="text-sm text-graphite">Cargando cobros...</p>
          ) : cobros.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Cobrado</p>
                  <p className="text-lg font-title text-carbon">{formatUSD(cobrosResumen.cobrado)}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Pendiente</p>
                  <p className="text-lg font-title text-carbon">{formatUSD(cobrosResumen.pendiente)}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Vencido</p>
                  <p className="text-lg font-title text-carbon">{formatUSD(cobrosResumen.vencido)}</p>
                </Card>
              </div>

              <div className="overflow-hidden rounded-card border border-line-soft">
                <div className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto_auto] gap-3 border-b border-line-soft bg-paper px-4 py-3 text-xs font-label uppercase tracking-[0.08em] text-graphite">
                  <span>Concepto</span>
                  <span>Tipo</span>
                  <span>Monto</span>
                  <span>Vencimiento</span>
                  <span>Estado</span>
                </div>
                <div className="divide-y divide-line-soft bg-white">
                  {cobros.map((cobro) => (
                    <div
                      key={cobro.id}
                      className="grid grid-cols-[minmax(0,2fr)_auto_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm"
                    >
                      <span className="truncate font-label text-carbon">{cobro.concepto}</span>
                      <Badge variant="default">{cobro.tipo}</Badge>
                      <span className="text-carbon">{formatUSD(cobro.monto)}</span>
                      <span className="text-graphite">{formatFecha(cobro.fecha_vencimiento)}</span>
                      <CobroBadge estado={cobro.estado} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState text="Sin cobros registrados." />
          )}
        </Card>
      ) : null}

      {activeTab === "suscripcion" ? (
        <Card padding="lg" className="space-y-4">
          {tabLoading === "suscripcion" ? (
            <p className="text-sm text-graphite">Cargando suscripción...</p>
          ) : suscripcion ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Tipo</p>
                  <p className="text-sm font-label text-carbon">{suscripcion.tipo}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Monto mensual</p>
                  <p className="text-sm font-label text-carbon">{formatUSD(suscripcion.monto_mensual)}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Ciclo</p>
                  <p className="text-sm font-label text-carbon">{suscripcion.ciclo}</p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Estado</p>
                  <div>
                    <SuscripcionBadge estado={suscripcion.estado} />
                  </div>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Fecha de inicio</p>
                  <p className="text-sm font-label text-carbon">
                    {suscripcion.fecha_inicio ? formatFecha(suscripcion.fecha_inicio) : "Sin fecha"}
                  </p>
                </Card>
                <Card padding="md" className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.08em] text-graphite">Próxima cobro</p>
                  <p className="text-sm font-label text-carbon">
                    {suscripcion.proxima_cobro ? formatFecha(suscripcion.proxima_cobro) : "Sin fecha"}
                  </p>
                </Card>
              </div>

              {suscripcion.estado === "pendiente" ? (
                <Button
                  className="w-full"
                  loading={activating}
                  onClick={() => {
                    void handleActivateSubscription();
                  }}
                >
                  Activar suscripción
                </Button>
              ) : null}
            </div>
          ) : (
            <EmptyState text="Este cliente no tiene suscripción de mantenimiento." />
          )}
        </Card>
      ) : null}

      {activeTab === "historial" ? (
        <Card padding="lg" className="space-y-4">
          <div className="space-y-2">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div
                  key={`${cliente.id}-${note}`}
                  className="rounded-card border border-line-soft bg-paper px-4 py-3 text-sm text-carbon"
                >
                  {note}
                </div>
              ))
            ) : (
              <div className="rounded-card border border-dashed border-line bg-paper px-4 py-6 text-sm text-graphite">
                Sin historial todavía
              </div>
            )}
          </div>

          <div className="space-y-2">
            <textarea
              value={notaDraft}
              onChange={(event) => setNotaDraft(event.target.value)}
              placeholder="Agregar nota"
              className="min-h-[100px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon transition-all duration-fast ease-fast placeholder:text-graphite focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  const trimmed = notaDraft.trim();

                  if (!trimmed) {
                    return;
                  }

                  void onUpdate({
                    notas: `[${formatTimestamp()}] ${trimmed}${cliente.notas ? `\n${cliente.notas}` : ""}`
                  });
                  setNotaDraft("");
                }}
              >
                Agregar nota
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((current) => ({ ...current, visible: false }))}
      />
    </div>
  );
}
