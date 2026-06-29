"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, EntityMultiSelect, EntitySelect, Input, Modal } from "@/components/ui";
import { useFeatures } from "@/lib/hooks/useFeatures";
import { useProyectos } from "@/lib/hooks/useProyectos";
import type { Cliente } from "@/types/clientes";
import type { Cotizacion } from "@/types/cotizaciones";
import type { CreateProyectoInput, Proyecto } from "@/types/proyectos";
import type { Usuario } from "@/types/auth";
import { ProyectoCard } from "./ProyectoCard";
import { ProyectoFicha } from "./ProyectoFicha";

type ProyectosClientProps = {
  usuario: Usuario | null;
  clientes: Array<Pick<Cliente, "id" | "empresa" | "estado">>;
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  usuarios: Array<Pick<Usuario, "id" | "nombre" | "email" | "rol">>;
};

type ProyectosViewMode = "list" | "detail";

function getClienteNombre(clienteId: string, clientes: ProyectosClientProps["clientes"]) {
  return clientes.find((cliente) => cliente.id === clienteId)?.empresa ?? "Cliente";
}

function getCotizacionLabel(cotizacion: ProyectosClientProps["cotizaciones"][number]) {
  const precio = cotizacion.precio_total != null ? ` · USD ${cotizacion.precio_total}` : "";
  return `${cotizacion.empresa}${precio}`;
}

function getUserLabel(usuario: ProyectosClientProps["usuarios"][number]) {
  return usuario.nombre;
}

export function ProyectosClient({ usuario, clientes, cotizaciones, usuarios }: ProyectosClientProps) {
  const isAdmin = usuario?.rol === "admin";
  const { proyectos, loading, error, setProyectos, createProyecto, updateProyecto } = useProyectos();
  const { features, fetchFeatures, createFeature, updateFeature, deleteFeature } = useFeatures();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [mobileMode, setMobileMode] = useState<ProyectosViewMode>("list");
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<Proyecto["estado"] | "todos">("todos");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectForm, setProjectForm] = useState<CreateProyectoInput>({
    cotizacion_id: "",
    cliente_id: "",
    nombre: "",
    estado: "por_empezar",
    responsable_id: usuario?.id ?? null,
    devs_asignados: [],
    fecha_inicio: null,
    entrega_comprometida: null,
    entrega_real: null,
    valor_total: null,
    notas_arquitectura: null,
    roadmap_publico_activo: false
  });

  useEffect(() => {
    if (!selectedProjectId && proyectos.length > 0) {
      setSelectedProjectId(proyectos[0]?.id ?? null);
    }
  }, [proyectos, selectedProjectId]);

  const selectedProject = useMemo(
    () => proyectos.find((proyecto) => proyecto.id === selectedProjectId) ?? null,
    [proyectos, selectedProjectId]
  );

  useEffect(() => {
    if (selectedProject) {
      void fetchFeatures(selectedProject.id);
    }
  }, [fetchFeatures, selectedProject]);

  const filteredProjects = useMemo(() => {
    return proyectos.filter((proyecto) => {
      const matchesSearch =
        proyecto.nombre.toLowerCase().includes(search.toLowerCase()) ||
        getClienteNombre(proyecto.cliente_id, clientes).toLowerCase().includes(search.toLowerCase());
      const matchesEstado = estadoFilter === "todos" || proyecto.estado === estadoFilter;

      return matchesSearch && matchesEstado;
    });
  }, [clientes, estadoFilter, proyectos, search]);

  async function handleCreateProyecto() {
    if (!projectForm.nombre.trim() || !projectForm.cliente_id.trim()) {
      return;
    }

    const created = await createProyecto({
      ...projectForm,
      nombre: projectForm.nombre.trim(),
      cotizacion_id: projectForm.cotizacion_id.trim(),
      cliente_id: projectForm.cliente_id.trim()
    });

    setNewProjectOpen(false);
    setSelectedProjectId(created.id);
    setMobileMode("detail");
  }

  async function handleProyectoUpdated(updated: Proyecto) {
    setProyectos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  if (loading && proyectos.length === 0) {
    return <div className="text-sm text-graphite">Cargando proyectos...</div>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-title text-carbon">Proyectos</h1>
          <p className="mt-1 text-sm text-graphite">
            Desarrollo vivo, features, cuentas de servicios y roadmap interno.
          </p>
        </div>

        <Button onClick={() => setNewProjectOpen(true)}>Nuevo proyecto</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <Card padding="lg" className="space-y-4 md:sticky md:top-0 md:h-[calc(100vh-160px)]">
          <div className="space-y-3">
            <Input
              label="Buscar"
              placeholder="Buscar por nombre o cliente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {(["todos", "por_empezar", "en_desarrollo", "implementacion", "entregado", "soporte", "pausado"] as const).map(
                (estado) => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setEstadoFilter(estado)}
                    className={[
                      "rounded-pill px-3 py-1.5 text-sm font-label transition-colors duration-fast ease-fast",
                      estadoFilter === estado
                        ? "bg-signal-light text-signal"
                        : "bg-paper text-graphite hover:bg-white hover:text-carbon"
                    ].join(" ")}
                  >
                    {estado === "todos" ? "Todos" : estado.replaceAll("_", " ")}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((proyecto) => (
                <ProyectoCard
                  key={proyecto.id}
                  proyecto={proyecto}
                  clienteNombre={getClienteNombre(proyecto.cliente_id, clientes)}
                  onClick={() => {
                    setSelectedProjectId(proyecto.id);
                    setMobileMode("detail");
                  }}
                  selected={selectedProjectId === proyecto.id}
                />
              ))
            ) : (
              <Card padding="lg">
                <p className="text-sm text-graphite">No hay proyectos con esos filtros.</p>
              </Card>
            )}
          </div>
        </Card>

        <div className={mobileMode === "detail" ? "block" : "hidden md:block"}>
          {selectedProject ? (
            <>
              <div className="mb-4 flex md:hidden">
                <Button variant="secondary" size="sm" onClick={() => setMobileMode("list")}>
                  ← Volver
                </Button>
              </div>
              <ProyectoFicha
                proyecto={selectedProject}
                clienteNombre={getClienteNombre(selectedProject.cliente_id, clientes)}
                isAdmin={isAdmin}
                features={features}
                proyectos={proyectos}
                usuarios={usuarios}
                onProyectoUpdated={handleProyectoUpdated}
                onUpdateProyecto={async (input) => {
                  const updated = await updateProyecto(selectedProject.id, input);
                  return updated;
                }}
                onCreateFeature={async (input) => createFeature(selectedProject.id, input)}
                onUpdateFeature={async (id, input) => updateFeature(id, input)}
                onDeleteFeature={async (id) => deleteFeature(id)}
              />
            </>
          ) : (
            <Card padding="lg" className="flex min-h-[320px] items-center justify-center">
              <p className="text-sm text-graphite">Seleccioná un proyecto para ver su ficha</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        title="Nuevo proyecto"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nombre"
              value={projectForm.nombre}
              onChange={(event) => setProjectForm((current) => ({ ...current, nombre: event.target.value }))}
            />
            <EntitySelect
              label="Cotización"
              value={projectForm.cotizacion_id || null}
              allowEmpty
              placeholder="Sin cotización"
              options={cotizaciones.map((cotizacion) => ({
                id: cotizacion.id,
                label: getCotizacionLabel(cotizacion)
              }))}
              onChange={(id) =>
                setProjectForm((current) => ({ ...current, cotizacion_id: id ?? "" }))
              }
            />
            <EntitySelect
              label="Cliente"
              value={projectForm.cliente_id || null}
              required
              placeholder="Seleccionar cliente"
              options={clientes.map((cliente) => ({
                id: cliente.id,
                label: cliente.empresa,
                sublabel: cliente.estado === "activo" ? "Activo" : "Inactivo"
              }))}
              onChange={(id) =>
                setProjectForm((current) => ({ ...current, cliente_id: id ?? "" }))
              }
            />
            <div className="space-y-1">
              <label className="block text-sm font-label text-carbon">Estado</label>
              <select
                value={projectForm.estado}
                onChange={(event) =>
                  setProjectForm((current) => ({
                    ...current,
                    estado: event.target.value as Proyecto["estado"]
                  }))
                }
                className="w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
              >
                <option value="por_empezar">Por empezar</option>
                <option value="en_desarrollo">En desarrollo</option>
                <option value="implementacion">Implementación</option>
                <option value="entregado">Entregado</option>
                <option value="soporte">Soporte</option>
                <option value="pausado">Pausado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <EntitySelect
              label="Responsable"
              value={projectForm.responsable_id ?? null}
              allowEmpty
              placeholder="Sin responsable"
              options={usuarios.map((usuarioOption) => ({
                id: usuarioOption.id,
                label: getUserLabel(usuarioOption)
              }))}
              onChange={(id) =>
                setProjectForm((current) => ({
                  ...current,
                  responsable_id: id
                }))
              }
            />

            <EntityMultiSelect
              label="Devs asignados"
              values={projectForm.devs_asignados ?? []}
              placeholder="Agregar devs"
              options={usuarios.map((usuarioOption) => ({
                id: usuarioOption.id,
                label: getUserLabel(usuarioOption),
                sublabel: usuarioOption.rol
              }))}
              onChange={(ids) =>
                setProjectForm((current) => ({
                  ...current,
                  devs_asignados: ids
                }))
              }
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button variant="ghost" onClick={() => setNewProjectOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!projectForm.nombre.trim() || !projectForm.cliente_id.trim()}
              onClick={() => {
                void handleCreateProyecto();
              }}
            >
              Crear
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
