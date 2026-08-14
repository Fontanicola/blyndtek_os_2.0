"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, EntityMultiSelect, EntitySelect, Input, Modal, PageSkeleton } from "@/components/ui";
import { CalendarIcon, ProyectosIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useFeatures } from "@/lib/hooks/useFeatures";
import { useProyectos } from "@/lib/hooks/useProyectos";
import type { Cliente } from "@/types/clientes";
import type { Cotizacion } from "@/types/cotizaciones";
import type { CreateProyectoInput, Proyecto } from "@/types/proyectos";
import type { Usuario } from "@/types/auth";
import { ProyectoCard } from "./ProyectoCard";
import { ProyectoFicha } from "./ProyectoFicha";
import { TimelineProyectos } from "./TimelineProyectos";

type ProyectosClientProps = {
  usuario: Usuario | null;
  clientes: Array<Pick<Cliente, "id" | "empresa" | "estado">>;
  cotizaciones: Array<Pick<Cotizacion, "id" | "empresa" | "precio_total">>;
  usuarios: Array<Pick<Usuario, "id" | "nombre" | "email" | "rol" | "foto_url">>;
  initialSelectedProjectId?: string | null;
};

type ProyectosViewMode = "list" | "detail";
type MainViewMode = "projects" | "timeline";

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

function getProjectCompactLabel(proyecto: Proyecto, clienteNombre: string) {
  const first = clienteNombre.trim().charAt(0) || proyecto.nombre.trim().charAt(0) || "P";
  const second = proyecto.nombre.trim().charAt(0) || "";
  return `${first}${second}`.toUpperCase();
}

export function ProyectosClient({
  usuario,
  clientes,
  cotizaciones,
  usuarios,
  initialSelectedProjectId = null
}: ProyectosClientProps) {
  const router = useRouter();
  const isAdmin = usuario?.rol === "admin";
  const { proyectos, loading, error, setProyectos, createProyecto, updateProyecto } = useProyectos();
  const { features, fetchFeatures } = useFeatures();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialSelectedProjectId);
  const [mobileMode, setMobileMode] = useState<ProyectosViewMode>(initialSelectedProjectId ? "detail" : "list");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [mainView, setMainView] = useState<MainViewMode>(initialSelectedProjectId ? "projects" : "timeline");
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
    if (selectedProjectId) {
      return;
    }

    if (initialSelectedProjectId && proyectos.some((proyecto) => proyecto.id === initialSelectedProjectId)) {
      setSelectedProjectId(initialSelectedProjectId);
      setMobileMode("detail");
      return;
    }

    if (proyectos.length > 0) {
      setSelectedProjectId(proyectos[0]?.id ?? null);
    }
  }, [initialSelectedProjectId, proyectos, selectedProjectId]);

  const selectedProject = useMemo(
    () => proyectos.find((proyecto) => proyecto.id === selectedProjectId) ?? null,
    [proyectos, selectedProjectId]
  );

  function selectProject(id: string) {
    setSelectedProjectId(id);
    setMobileMode("detail");
    router.replace(`/proyectos?project_id=${encodeURIComponent(id)}`, { scroll: false });
  }

  useEffect(() => {
    if (selectedProject) {
      void fetchFeatures(selectedProject.id);
    }
  }, [fetchFeatures, selectedProject]);

  const filteredProjects = useMemo(() => proyectos, [proyectos]);

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
    selectProject(created.id);
  }

  async function handleProyectoUpdated(updated: Proyecto) {
    setProyectos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  if (loading && proyectos.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-label uppercase tracking-[0.14em] text-graphite">Operaciones</p>
          <h1 className="mt-1 text-2xl font-title text-carbon">Proyectos</h1>
        </div>
        <div className="flex rounded-pill border border-line-soft bg-white p-1 shadow-soft">
          <button type="button" onClick={() => setMainView("timeline")} className={cn("flex items-center gap-2 rounded-pill px-3 py-1.5 text-sm font-label", mainView === "timeline" ? "bg-signal text-white" : "text-graphite hover:text-carbon")}>
            <CalendarIcon size={15} /> Timeline
          </button>
          <button type="button" onClick={() => setMainView("projects")} className={cn("rounded-pill px-3 py-1.5 text-sm font-label", mainView === "projects" ? "bg-signal text-white" : "text-graphite hover:text-carbon")}>
            Gestión
          </button>
        </div>
      </div>
      {error ? (
        <div className="rounded-card border border-danger bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {mainView === "timeline" ? (
        <TimelineProyectos
          proyectos={proyectos}
          clientes={clientes}
          onSelectProject={(id) => {
            setMainView("projects");
            selectProject(id);
          }}
        />
      ) : null}

      {mainView === "projects" ? <div
        className={
          sidebarCollapsed
            ? "grid flex-1 min-h-0 gap-4 md:grid-cols-[88px_minmax(0,1fr)]"
            : "grid flex-1 min-h-0 gap-4 md:grid-cols-[320px_minmax(0,1fr)]"
        }
      >
        <Card
          padding="lg"
          className="flex h-full min-h-0 flex-col overflow-hidden md:sticky md:top-0"
        >
          <div
            className={cn(
              "border-b border-line-soft pb-3",
              sidebarCollapsed ? "flex justify-center" : "flex items-center justify-end gap-2"
            )}
          >
            {sidebarCollapsed ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 px-0 text-graphite"
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label="Expandir panel"
              >
                ▸
              </Button>
            ) : (
              <>
                <p className="mr-auto text-sm font-label text-carbon">Proyectos</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 px-0"
                  onClick={() => setSidebarCollapsed((current) => !current)}
                  aria-label="Achicar panel"
                >
                  ◂
                </Button>
              </>
            )}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {filteredProjects.length > 0 ? (
              sidebarCollapsed ? (
                <div className="space-y-2">
                  {filteredProjects.map((proyecto) => {
                    const clienteNombre = getClienteNombre(proyecto.cliente_id, clientes);
                    const isSelected = selectedProjectId === proyecto.id;

                    return (
                      <button
                        key={proyecto.id}
                        type="button"
                        onClick={() => {
                          selectProject(proyecto.id);
                        }}
                        title={`${clienteNombre} · ${proyecto.nombre}`}
                        className={cn(
                          "flex h-14 w-full items-center justify-center rounded-component border border-line-soft text-xs font-label transition-colors duration-fast ease-fast",
                          isSelected ? "bg-signal-light text-signal" : "bg-white text-graphite hover:bg-paper"
                        )}
                      >
                        {getProjectCompactLabel(proyecto, clienteNombre)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {filteredProjects.map((proyecto) => (
                    <ProyectoCard
                      key={proyecto.id}
                      proyecto={proyecto}
                      clienteNombre={getClienteNombre(proyecto.cliente_id, clientes)}
                      onClick={() => {
                        selectProject(proyecto.id);
                      }}
                      selected={selectedProjectId === proyecto.id}
                    />
                  ))}
                </div>
              )
            ) : (
              <EmptyState
                icon={ProyectosIcon}
                titulo="No hay proyectos"
                descripcion="Creá el primer proyecto para empezar a organizar fases, features y roadmap."
                accion={{ label: "Nuevo proyecto", onClick: () => setNewProjectOpen(true) }}
              />
            )}
          </div>

          <div className={cn("border-t border-line-soft pt-4", sidebarCollapsed ? "px-0" : "p-4")}>
            <Button
              className={cn("mx-auto", sidebarCollapsed ? "h-11 w-11 px-0" : "w-full")}
              onClick={() => setNewProjectOpen(true)}
            >
              {sidebarCollapsed ? "+" : "Nuevo proyecto"}
            </Button>
          </div>
        </Card>

        <div className={mobileMode === "detail" ? "block h-full min-h-0" : "hidden md:block md:min-h-0"}>
          {selectedProject ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="mb-4 flex md:hidden">
                <Button variant="secondary" size="sm" onClick={() => setMobileMode("list")}>
                  ← Volver
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ProyectoFicha
                  proyecto={selectedProject}
                  clienteNombre={getClienteNombre(selectedProject.cliente_id, clientes)}
                  isAdmin={isAdmin}
                  features={features}
                  clientes={clientes}
                  proyectos={proyectos}
                  usuarios={usuarios}
                  onProyectoUpdated={handleProyectoUpdated}
                  onUpdateProyecto={async (input) => {
                    const updated = await updateProyecto(selectedProject.id, input);
                    return updated;
                  }}
                />
              </div>
            </div>
          ) : (
            <Card padding="lg" className="flex min-h-[320px] items-center justify-center">
              <p className="text-sm text-graphite">Seleccioná un proyecto para ver su ficha</p>
            </Card>
          )}
        </div>
      </div> : null}

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
