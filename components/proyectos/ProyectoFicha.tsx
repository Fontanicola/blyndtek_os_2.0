"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState, EntityMultiSelect, EntitySelect, Input } from "@/components/ui";
import { ClockIcon, ImageIcon, SettingsIcon } from "@/components/ui/icons";
import { NotasVinculadasSection } from "@/components/notas";
import { useCronometro } from "@/lib/hooks/useCronometro";
import { useFasesProyecto } from "@/lib/hooks/useFasesProyecto";
import { cn } from "@/lib/cn";
import { PROYECTO_ESTADO_LABELS, PROYECTO_ESTADO_OPTIONS } from "@/lib/proyectos";
import { formatDurationHours, formatDurationShort } from "@/lib/tiempo";
import { formatFecha, formatUSD } from "@/lib/utils/formatters";
import type { CuentaServicio, CreateCuentaServicioInput } from "@/types/cuentas";
import type { Cliente } from "@/types/clientes";
import type { Feature } from "@/types/features";
import type { Proyecto, UpdateProyectoInput } from "@/types/proyectos";
import type { Usuario } from "@/types/auth";
import type { ProyectoTiempoResponse } from "@/types/sesionesTiempo";
import { CuentaServicioCard } from "./CuentaServicioCard";
import { CuentaServicioModal } from "./CuentaServicioModal";
import { FasesEstadoKanban } from "./features-kanban";
import { DeliveryHandoff } from "./DeliveryHandoff";

type ProyectoFichaProps = {
  proyecto: Proyecto;
  clienteNombre: string;
  isAdmin: boolean;
  features: Feature[];
  clientes: Array<Pick<Cliente, "id" | "empresa">>;
  usuarios: Array<Pick<Usuario, "id" | "nombre" | "email" | "rol" | "foto_url">>;
  proyectos: Array<Pick<Proyecto, "id" | "nombre" | "estado" | "cliente_id">>;
  onProyectoUpdated: (proyecto: Proyecto) => void | Promise<void>;
  onUpdateProyecto: (input: UpdateProyectoInput) => Promise<Proyecto>;
};

type TabKey = "general" | "handoff" | "features" | "cuentas" | "roadmap";

type RoadmapConfigDraft = {
  url_sistema: string;
  roadmap_pin: string;
  credenciales_cliente: {
    usuario: string;
    contraseña: string;
    notas: string;
  };
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "general", label: "General" },
  { key: "handoff", label: "Handoff" },
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
        <p className="text-xs font-label text-graphite">{label}</p>
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
      <p className="text-xs font-label text-graphite">{label}</p>
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
      <p className="text-xs font-label text-graphite">{label}</p>
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
  clientes,
  usuarios,
  proyectos,
  onProyectoUpdated,
  onUpdateProyecto
}: ProyectoFichaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearchParams = searchParams ?? new URLSearchParams();
  const queryTab = currentSearchParams.get("view") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(tabs.some((tab) => tab.key === queryTab) ? queryTab ?? "general" : "general");
  const [cuentas, setCuentas] = useState<CuentaServicio[]>([]);
  const [cuentaModalOpen, setCuentaModalOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaServicio | null>(null);
  const [roadmapOrigin, setRoadmapOrigin] = useState("");
  const [roadmapConfigOpen, setRoadmapConfigOpen] = useState(true);
  const imagenSistemaInputRef = useRef<HTMLInputElement | null>(null);
  const [imagenSistemaUploading, setImagenSistemaUploading] = useState(false);
  const [imagenSistemaError, setImagenSistemaError] = useState<string | null>(null);
  const [tiempoProyecto, setTiempoProyecto] = useState<ProyectoTiempoResponse | null>(null);

  function changeActiveTab(tab: TabKey) {
    setActiveTab(tab);
    const params = new URLSearchParams(currentSearchParams.toString());
    params.set("project_id", proyecto.id);
    if (tab === "general") {
      params.delete("view");
    } else {
      params.set("view", tab);
    }
    router.replace(`/proyectos?${params.toString()}`, { scroll: false });
  }
  const [tiempoProyectoLoading, setTiempoProyectoLoading] = useState(false);
  const [roadmapConfigDraft, setRoadmapConfigDraft] = useState<RoadmapConfigDraft>({
    url_sistema: proyecto.url_sistema ?? "",
    roadmap_pin: proyecto.roadmap_pin ?? "",
    credenciales_cliente: {
      usuario: proyecto.credenciales_cliente?.usuario ?? "",
      contraseña: proyecto.credenciales_cliente?.contraseña ?? "",
      notas: proyecto.credenciales_cliente?.notas ?? ""
      }
    });
  const [githubRepoDraft, setGithubRepoDraft] = useState(proyecto.github_repo ?? "");
  const [githubRepoSaving, setGithubRepoSaving] = useState(false);
  const [githubRepoError, setGithubRepoError] = useState<string | null>(null);
  const { fases, fetchFases, setFases } = useFasesProyecto();
  const cronometro = useCronometro();

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

  useEffect(() => {
    setFases([]);
    void fetchFases(proyecto.id);
  }, [fetchFases, proyecto.id, setFases]);

  useEffect(() => {
    setRoadmapConfigDraft({
      url_sistema: proyecto.url_sistema ?? "",
      roadmap_pin: proyecto.roadmap_pin ?? "",
      credenciales_cliente: {
        usuario: proyecto.credenciales_cliente?.usuario ?? "",
        contraseña: proyecto.credenciales_cliente?.contraseña ?? "",
        notas: proyecto.credenciales_cliente?.notas ?? ""
      }
    });
  }, [proyecto.credenciales_cliente, proyecto.roadmap_pin, proyecto.url_sistema]);

  useEffect(() => {
    setGithubRepoDraft(proyecto.github_repo ?? "");
  }, [proyecto.github_repo]);

  const fetchTiempoProyecto = useCallback(async () => {
    setTiempoProyectoLoading(true);

    try {
      const response = await fetch(`/api/proyectos/${proyecto.id}/tiempo`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as { data?: ProyectoTiempoResponse; error?: string };

      if (response.ok && payload.data) {
        setTiempoProyecto(payload.data);
      } else {
        setTiempoProyecto(null);
      }
    } catch {
      setTiempoProyecto(null);
    } finally {
      setTiempoProyectoLoading(false);
    }
  }, [proyecto.id]);

  useEffect(() => {
    void fetchTiempoProyecto();
  }, [fetchTiempoProyecto]);

  const roadmapPath = proyecto.roadmap_slug ?? proyecto.roadmap_token;
  const roadmapUrl = useMemo(() => `${roadmapOrigin}/roadmap/${roadmapPath}`, [roadmapOrigin, roadmapPath]);
  const imagenSistemaPreviewUrl = roadmapPath ? `/api/roadmap/${roadmapPath}/imagen-sistema` : null;

  const fasesOrdenadas = useMemo(
    () => [...fases].sort((first, second) => first.orden - second.orden || first.nombre.localeCompare(second.nombre)),
    [fases]
  );

  const faseProgress = useMemo(() => {
    return fasesOrdenadas.map((fase) => {
      const faseFeatures = features.filter((feature) => feature.fase_id === fase.id);
      const completed = faseFeatures.filter((feature) => feature.estado === "lista").length;

      return {
        fase,
        completed,
        total: faseFeatures.length
      };
    });
  }, [features, fasesOrdenadas]);

  const tiempoProyectoVisual = useMemo(() => {
    const base = tiempoProyecto ?? {
      total_segundos: 0,
      por_fase: [],
      por_usuario: []
    };
    const activeSession = cronometro.sesionActiva;

    if (!activeSession || activeSession.proyecto_id !== proyecto.id) {
      return base;
    }

    const liveSeconds = cronometro.tiempoTranscurrido;
    const porFase = base.por_fase.map((fase) => {
      if (fase.fase_id !== activeSession.fase_id) {
        return fase;
      }

      const porUsuario: Array<(typeof fase.por_usuario)[number]> = [...fase.por_usuario];
      const currentIndex = porUsuario.findIndex((item) => item.usuario_id === activeSession.usuario_id);

      if (currentIndex >= 0) {
        const currentUser = porUsuario[currentIndex];
        if (currentUser) {
          porUsuario[currentIndex] = {
            ...currentUser,
            segundos: currentUser.segundos + liveSeconds
          };
        }
      } else {
        porUsuario.push({
          usuario_id: activeSession.usuario_id,
          nombre: activeSession.usuario_nombre ?? "Sin nombre",
          segundos: liveSeconds
        });
      }

      return {
        ...fase,
        segundos: fase.segundos + liveSeconds,
        por_usuario: porUsuario
      };
    });

    const porUsuario: typeof base.por_usuario = base.por_usuario.map((item) =>
      item.usuario_id === activeSession.usuario_id
        ? { ...item, segundos: item.segundos + liveSeconds }
        : item
    );

    if (!porUsuario.some((item) => item.usuario_id === activeSession.usuario_id)) {
      porUsuario.push({
        usuario_id: activeSession.usuario_id,
        nombre: activeSession.usuario_nombre ?? "Sin nombre",
        segundos: liveSeconds
      });
    }

    return {
      total_segundos: base.total_segundos + liveSeconds,
      por_fase: porFase,
      por_usuario: porUsuario
    };
  }, [cronometro.sesionActiva, cronometro.tiempoTranscurrido, proyecto.id, tiempoProyecto]);

  const tiempoPorFaseOrdenado = useMemo(
    () =>
      [...tiempoProyectoVisual.por_fase].sort(
        (first, second) => second.segundos - first.segundos || first.nombre.localeCompare(second.nombre)
      ),
    [tiempoProyectoVisual.por_fase]
  );

  const tiempoPorUsuarioVisible = useMemo(
    () => tiempoProyectoVisual.por_usuario.filter((usuario) => usuario.segundos > 0),
    [tiempoProyectoVisual.por_usuario]
  );

  async function iniciarCronometro(faseId: string) {
    await cronometro.iniciar(faseId);
    await fetchTiempoProyecto();
  }

  async function pausarCronometro(sesionId: string, nota?: string) {
    await cronometro.pausar(sesionId, nota);
    await fetchTiempoProyecto();
  }

  async function saveRoadmapConfig() {
    await persistProyecto({
      url_sistema: roadmapConfigDraft.url_sistema.trim() ? roadmapConfigDraft.url_sistema.trim() : null,
      roadmap_pin: roadmapConfigDraft.roadmap_pin.trim() ? roadmapConfigDraft.roadmap_pin.trim() : null,
      credenciales_cliente: {
        usuario: roadmapConfigDraft.credenciales_cliente.usuario.trim() || null,
        contraseña: roadmapConfigDraft.credenciales_cliente.contraseña.trim() || null,
        notas: roadmapConfigDraft.credenciales_cliente.notas.trim() || null
      }
    });
  }

  async function uploadImagenSistema(file: File | null) {
    if (!file) {
      return;
    }

    setImagenSistemaUploading(true);
    setImagenSistemaError(null);

    try {
      const formData = new FormData();
      formData.append("imagen", file);

      const response = await fetch(`/api/proyectos/${proyecto.id}/imagen-sistema`, {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as { data?: Proyecto; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo subir la imagen.");
      }

      await onProyectoUpdated(payload.data);
    } catch (error) {
      setImagenSistemaError(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setImagenSistemaUploading(false);
      if (imagenSistemaInputRef.current) {
        imagenSistemaInputRef.current.value = "";
      }
    }
  }

  async function deleteImagenSistema() {
    setImagenSistemaUploading(true);
    setImagenSistemaError(null);

    try {
      const response = await fetch(`/api/proyectos/${proyecto.id}/imagen-sistema`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { data?: Proyecto; error?: string };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo quitar la imagen.");
      }

      await onProyectoUpdated(payload.data);
    } catch (error) {
      setImagenSistemaError(error instanceof Error ? error.message : "No se pudo quitar la imagen.");
    } finally {
      setImagenSistemaUploading(false);
    }
  }

  async function saveGitHubRepo() {
    const value = githubRepoDraft.trim();
    if (value && !/^[^/\s]+\/[^/\s]+$/.test(value)) {
      setGithubRepoError("El repositorio debe tener formato owner/repo.");
      return;
    }

    setGithubRepoSaving(true);
    setGithubRepoError(null);
    try {
      await persistProyecto({
        github_repo: value ? value : null
      });
      setGithubRepoError(null);
    } catch (error) {
      setGithubRepoError(error instanceof Error ? error.message : "No se pudo guardar el repositorio.");
    } finally {
      setGithubRepoSaving(false);
    }
  }

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
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex-shrink-0 border-b border-line-soft pb-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeActiveTab(tab.key)}
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
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "general" ? (
          <div className="h-full min-h-0 overflow-y-auto pr-1">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
              <Card padding="lg" className="space-y-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-title text-carbon">{clienteNombre}</h2>
                    <Badge variant={getEstadoVariant(proyecto.estado)}>
                      {PROYECTO_ESTADO_LABELS[proyecto.estado]}
                    </Badge>
                  </div>
                  <p className="text-base text-graphite">{proyecto.nombre}</p>
                </div>

                <section className="space-y-3">
                  <h3 className="text-sm font-title text-carbon">General</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-label text-graphite">Cliente</p>
                      <p className="rounded-component bg-paper px-3 py-2 text-sm text-carbon">{clienteNombre}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-label text-graphite">Estado</p>
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
                  <p className="text-xs text-graphite">
                    Se actualiza automáticamente a medida que completás subtareas en Features.
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-label text-graphite">
                      Repositorio de GitHub
                    </p>
                    <p className="text-xs text-graphite">Necesario para usar AI Dev en las fases de este proyecto.</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={githubRepoDraft}
                        onChange={(event) => setGithubRepoDraft(event.target.value)}
                        placeholder="owner/repo"
                        className="w-full"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        void saveGitHubRepo();
                      }}
                      loading={githubRepoSaving}
                      >
                        Guardar
                      </Button>
                  </div>
                  {githubRepoError ? <p className="text-xs text-danger">{githubRepoError}</p> : null}
                </section>

                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-title text-carbon">Tiempo invertido</h3>
                      <p className="mt-1 text-xs text-graphite">
                        Tiempo acumulado por fases y usuarios desde que comenzó el proyecto.
                      </p>
                    </div>
                    <div className="rounded-card bg-paper px-4 py-3 text-right">
                      <p className="text-xs font-label text-graphite">Total</p>
                      <p className="text-lg font-title text-carbon">{formatDurationHours(tiempoProyectoVisual.total_segundos)}</p>
                      <p className="text-xs text-graphite">{formatDurationShort(tiempoProyectoVisual.total_segundos)}</p>
                    </div>
                  </div>

                  {tiempoProyectoLoading && !tiempoProyecto ? (
                    <Card padding="sm">
                      <p className="text-sm text-graphite">Cargando tiempo invertido...</p>
                    </Card>
                  ) : tiempoPorFaseOrdenado.length > 0 ? (
                    <div className="space-y-3">
                      {tiempoPorFaseOrdenado.map((fase) => (
                        <Card key={fase.fase_id} padding="sm" className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-label text-carbon">{fase.nombre}</p>
                            <Badge variant="default">{formatDurationShort(fase.segundos)}</Badge>
                          </div>

                          {fase.por_usuario.length > 1 ? (
                            <div className="flex flex-wrap gap-2">
                              {fase.por_usuario.map((usuario) => (
                                <Badge key={usuario.usuario_id} variant="ghost">
                                  {usuario.nombre}: {formatDurationShort(usuario.segundos)}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card padding="sm">
                      <EmptyState
                        icon={ClockIcon}
                        titulo="Todavía no hay sesiones registradas"
                        descripcion="El tiempo por fase aparece cuando se usa el cronómetro del proyecto."
                        className="min-h-[130px] border-0 bg-transparent"
                      />
                    </Card>
                  )}

                  {tiempoPorUsuarioVisible.length > 1 ? (
                    <Card padding="sm" className="space-y-3">
                      <p className="text-xs font-label text-graphite">Por usuario</p>
                      <div className="flex flex-wrap gap-2">
                        {tiempoPorUsuarioVisible.map((usuario) => (
                          <Badge key={usuario.usuario_id} variant="default">
                            {usuario.nombre}: {formatDurationShort(usuario.segundos)}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  ) : null}
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

                <NotasVinculadasSection
                  entityType="proyecto"
                  entityId={proyecto.id}
                  entityLabel={proyecto.nombre}
                  href={`/proyectos?project_id=${proyecto.id}`}
                />

                <div className="space-y-2 rounded-card bg-paper p-4">
                  <p className="text-xs font-label text-graphite">Resumen</p>
                  <p className="text-sm text-carbon">
                    Precio total: {proyecto.valor_total !== null ? formatUSD(proyecto.valor_total) : "Sin definir"}
                  </p>
                  <p className="text-sm text-carbon">
                    Entrega comprometida: {proyecto.entrega_comprometida ? formatFecha(proyecto.entrega_comprometida) : "Sin fecha"}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        ) : null}

        {activeTab === "handoff" ? <DeliveryHandoff proyectoId={proyecto.id} /> : null}

        {activeTab === "features" ? (
          <div className="h-full min-h-0 overflow-hidden pr-1">
            <FasesEstadoKanban
              proyecto={proyecto}
              tiempoProyecto={tiempoProyecto}
              sesionActiva={cronometro.sesionActiva}
              tiempoTranscurrido={cronometro.tiempoTranscurrido}
              usuarios={usuarios}
              onIniciarCronometro={iniciarCronometro}
              onPausarCronometro={pausarCronometro}
            />
          </div>
        ) : null}

        {activeTab === "cuentas" ? (
          isAdmin ? (
            <div className="h-full min-h-0 space-y-4 overflow-y-auto pr-1">
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
                    <EmptyState
                      icon={SettingsIcon}
                      titulo="Todavía no hay cuentas o servicios cargados"
                      descripcion="Agregá accesos y servicios asociados al proyecto para centralizar la operación."
                      className="border-0 bg-transparent"
                    />
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
                clientes={clientes}
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
          <div className="h-full min-h-0 overflow-y-auto pr-1">
            <div className="space-y-4">
              <Card padding="lg" className="space-y-4 border border-line-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-title text-carbon">Configuración del roadmap público</h3>
                    <p className="text-sm text-graphite">
                      Definí la URL del sistema, el acceso de credenciales y el PIN para compartir con el cliente.
                    </p>
                  </div>

                  <Button variant="primary" onClick={() => void saveRoadmapConfig()}>
                    Guardar configuración
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="URL del sistema"
                    type="url"
                    value={roadmapConfigDraft.url_sistema}
                    onChange={(event) =>
                      setRoadmapConfigDraft((current) => ({ ...current, url_sistema: event.target.value }))
                    }
                    placeholder="https://sistema.cliente.com"
                  />

                  <Input
                    label="PIN de acceso"
                    value={roadmapConfigDraft.roadmap_pin}
                    onChange={(event) =>
                      setRoadmapConfigDraft((current) => ({
                        ...current,
                        roadmap_pin: event.target.value.replace(/\D/g, "").slice(0, 6)
                      }))
                    }
                    placeholder="1234"
                  />
                </div>

                <div className="space-y-3 rounded-card border border-line-soft bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-label text-graphite">
                        Imagen de preview del sistema
                      </p>
                      <p className="text-sm text-graphite">
                        Se muestra como banner en la card “Sistema en vivo” del roadmap público.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={proyecto.imagen_sistema_storage_path ? "secondary" : "primary"}
                        size="sm"
                        loading={imagenSistemaUploading}
                        onClick={() => imagenSistemaInputRef.current?.click()}
                      >
                        {proyecto.imagen_sistema_storage_path ? "Cambiar" : "Subir imagen"}
                      </Button>
                      {proyecto.imagen_sistema_storage_path ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={imagenSistemaUploading}
                          onClick={() => void deleteImagenSistema()}
                        >
                          Quitar
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <input
                    ref={imagenSistemaInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void uploadImagenSistema(event.target.files?.[0] ?? null)}
                  />

                  {proyecto.imagen_sistema_storage_path && imagenSistemaPreviewUrl ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-component border border-line-soft bg-paper sm:max-w-md">
                      <Image
                        key={proyecto.imagen_sistema_storage_path}
                        src={imagenSistemaPreviewUrl}
                        alt="Preview del sistema"
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, 448px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <EmptyState
                      icon={ImageIcon}
                      titulo="Todavía no hay imagen cargada"
                      descripcion="Subí una captura manual para mostrar el preview en el roadmap público."
                      className="min-h-[150px] sm:max-w-md"
                    />
                  )}

                  {imagenSistemaError ? <p className="text-sm text-danger">{imagenSistemaError}</p> : null}
                </div>

                <div className="space-y-3 rounded-card bg-paper p-4">
                  <button
                    type="button"
                    onClick={() => setRoadmapConfigOpen((current) => !current)}
                    className="flex items-center gap-2 text-left text-sm font-label text-carbon"
                  >
                    <span className="text-graphite">{roadmapConfigOpen ? "▾" : "▸"}</span>
                    Credenciales del cliente
                  </button>

                  <p className="text-xs text-graphite">
                    Estas credenciales solo se revelan en el roadmap público si el cliente ingresa el PIN de acceso
                    que definas abajo.
                  </p>

                  <div
                    className={cn(
                      "grid gap-3 overflow-hidden transition-[max-height,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
                      roadmapConfigOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <Input
                      label="Usuario"
                      value={roadmapConfigDraft.credenciales_cliente.usuario}
                      onChange={(event) =>
                        setRoadmapConfigDraft((current) => ({
                          ...current,
                          credenciales_cliente: {
                            ...current.credenciales_cliente,
                            usuario: event.target.value
                          }
                        }))
                      }
                      placeholder="usuario"
                    />
                    <Input
                      label="Contraseña"
                      type="password"
                      value={roadmapConfigDraft.credenciales_cliente.contraseña}
                      onChange={(event) =>
                        setRoadmapConfigDraft((current) => ({
                          ...current,
                          credenciales_cliente: {
                            ...current.credenciales_cliente,
                            contraseña: event.target.value
                          }
                        }))
                      }
                      placeholder="••••••••"
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-label text-graphite">Notas</p>
                      <textarea
                        value={roadmapConfigDraft.credenciales_cliente.notas}
                        onChange={(event) =>
                          setRoadmapConfigDraft((current) => ({
                            ...current,
                            credenciales_cliente: {
                              ...current.credenciales_cliente,
                              notas: event.target.value
                            }
                          }))
                        }
                        className="min-h-[96px] w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20"
                        placeholder="Notas de acceso, dominios, aclaraciones..."
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card padding="lg" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-title text-carbon">Roadmap público</h3>
                    <p className="mt-1 text-sm text-graphite">
                      La vista pública se activa con el slug único del proyecto.
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
                  <p className="text-xs font-label text-graphite">Link público</p>
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

              {fasesOrdenadas.length > 0 ? (
                <Card padding="lg" className="space-y-4">
                  <div>
                    <h3 className="text-base font-title text-carbon">Fases planificadas</h3>
                    <p className="mt-1 text-sm text-graphite">
                      Referencia interna del roadmap con el avance real de cada fase.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {faseProgress.map(({ fase, completed, total }) => (
                      <div key={fase.id} className="rounded-card border border-line-soft bg-paper p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-label text-carbon">{fase.nombre}</p>
                            <p className="text-xs text-graphite">
                              {fase.fecha_estimada_inicio || fase.fecha_estimada_fin
                                ? [
                                    fase.fecha_estimada_inicio ? formatFecha(fase.fecha_estimada_inicio) : null,
                                    fase.fecha_estimada_fin ? formatFecha(fase.fecha_estimada_fin) : null
                                  ]
                                    .filter(Boolean)
                                    .join(" - ")
                                : "Sin fechas estimadas"}
                            </p>
                          </div>
                          <Badge variant="default">
                            {completed}/{total} features completadas
                          </Badge>
                        </div>

                        {fase.descripcion ? (
                          <div className="mt-3 space-y-2 border-t border-line-soft pt-3">
                            {fase.descripcion ? <p className="text-sm text-carbon">{fase.descripcion}</p> : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
