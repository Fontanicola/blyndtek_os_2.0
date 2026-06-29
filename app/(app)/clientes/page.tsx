"use client";

import { useEffect, useMemo, useState } from "react";
import { ClienteCard, ClienteFicha, ClienteModal } from "@/components/clientes";
import { Button, Input } from "@/components/ui";
import { useInboundLeads } from "@/lib/hooks/useInboundLeads";
import { useClientes } from "@/lib/hooks/useClientes";
import type { CreateClienteInput, EstadoCliente } from "@/types/clientes";
import { useLeads } from "@/lib/hooks/useLeads";

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function ClientesPage() {
  const { clientes, loading, error, fetchClientes, createCliente, updateCliente } = useClientes();
  const { leads: outboundLeads } = useLeads();
  const { leads: inboundLeads } = useInboundLeads();
  const [estado, setEstado] = useState<EstadoCliente>("activo");
  const [busqueda, setBusqueda] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  useEffect(() => {
    void fetchClientes({ estado });
  }, [estado, fetchClientes]);

  useEffect(() => {
    if (!selectedClienteId && clientes.length > 0) {
      const firstCliente = clientes[0];

      if (firstCliente) {
        setSelectedClienteId(firstCliente.id);
      }
    }

    if (clientes.length === 0) {
      setSelectedClienteId(null);
    }
  }, [clientes, selectedClienteId]);

  const filteredClientes = useMemo(() => {
    const query = busqueda.trim().toLowerCase();

    if (!query) {
      return clientes;
    }

    return clientes.filter((cliente) => cliente.empresa.toLowerCase().includes(query));
  }, [busqueda, clientes]);

  const selectedCliente =
    filteredClientes.find((cliente) => cliente.id === selectedClienteId) ??
    clientes.find((cliente) => cliente.id === selectedClienteId) ??
    null;

  const leadOptions = useMemo(
    () =>
      [...outboundLeads, ...inboundLeads]
        .map((lead) => ({
          id: lead.id,
          label: lead.empresa,
          sublabel: [lead.canal, lead.etapa].filter(Boolean).join(" · ")
        }))
        .sort((first, second) => first.label.localeCompare(second.label)),
    [inboundLeads, outboundLeads]
  );

  async function handleCreateCliente(input: CreateClienteInput) {
    const cliente = await createCliente(input);
    setSelectedClienteId(cliente.id);
    setMobileView("detail");
  }

  return (
    <div className="h-full">
      <div className="grid h-full gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          className={[
            "rounded-card bg-white shadow-card",
            mobileView === "detail" ? "hidden lg:flex" : "flex",
            "min-h-0 flex-col overflow-hidden"
          ].join(" ")}
        >
          <div className="space-y-4 border-b border-line-soft p-4">
            <Input
              placeholder="Buscar cliente"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              leftIcon={<SearchIcon />}
            />

            <div className="inline-flex rounded-pill bg-paper p-1">
              {(["activo", "inactivo"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEstado(value)}
                  className={[
                    "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
                    estado === value
                      ? "bg-white text-carbon shadow-soft"
                      : "text-graphite hover:text-carbon"
                  ].join(" ")}
                >
                  {value === "activo" ? "Activos" : "Inactivos"}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {filteredClientes.length > 0 ? (
              <div className="space-y-3">
                {filteredClientes.map((cliente) => (
                  <ClienteCard
                    key={cliente.id}
                    cliente={cliente}
                    selected={cliente.id === selectedCliente?.id}
                    onClick={() => {
                      setSelectedClienteId(cliente.id);
                      setMobileView("detail");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-card border border-dashed border-line bg-paper p-6 text-center">
                <p className="text-sm text-graphite">No hay clientes para mostrar</p>
                <Button onClick={() => setIsModalOpen(true)}>Nuevo cliente</Button>
              </div>
            )}
          </div>

          <div className="border-t border-line-soft p-4">
            <Button className="w-full" onClick={() => setIsModalOpen(true)}>
              Nuevo cliente
            </Button>
          </div>
        </aside>

        <section
          className={[
            "rounded-card bg-white shadow-card",
            mobileView === "list" ? "hidden lg:block" : "block",
            "min-h-0 overflow-hidden"
          ].join(" ")}
        >
          {selectedCliente ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-line-soft p-4 lg:hidden">
                <Button variant="ghost" size="sm" onClick={() => setMobileView("list")}>
                  ← Volver
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <ClienteFicha
                  cliente={selectedCliente}
                  onUpdate={(input) => void updateCliente(selectedCliente.id, input)}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-graphite">
              Seleccioná un cliente para ver su ficha
            </div>
          )}
        </section>
      </div>

      {error ? (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-component bg-danger px-4 py-3 text-sm text-white shadow-modal">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="fixed bottom-6 right-6 rounded-component bg-carbon px-4 py-3 text-sm text-white shadow-modal">
          Cargando clientes...
        </div>
      ) : null}

      <ClienteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateCliente}
        leadOptions={leadOptions}
      />
    </div>
  );
}
