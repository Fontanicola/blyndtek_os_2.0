"use client";

import { useEffect, useState } from "react";
import { Badge, Button, EmptyState, Input } from "@/components/ui";
import { FileTextIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import type { ModuloCatalogo } from "@/types/diagnostico";

type ModulosResponse = {
  data?: ModuloCatalogo[];
  error?: string;
};

type ModuloResponse = {
  data?: ModuloCatalogo;
  error?: string;
};

type ModuloDraft = {
  nombre: string;
  descripcion: string;
  categoria: string;
  precio_ideal: string;
  precio_minimo: string;
  incremento_mensual: string;
};

const emptyDraft: ModuloDraft = {
  nombre: "",
  descripcion: "",
  categoria: "",
  precio_ideal: "",
  precio_minimo: "",
  incremento_mensual: ""
};

function parseNumber(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number | null) {
  return `$${Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 0
  })} USD`;
}

export function ModulosCatalogoClient() {
  const [modulos, setModulos] = useState<ModuloCatalogo[]>([]);
  const [draft, setDraft] = useState<ModuloDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchModulos() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/modulos-catalogo", { cache: "no-store" });
      const payload = (await response.json()) as ModulosResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo cargar el catálogo.");
      }

      setModulos(payload.data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchModulos();
  }, []);

  async function createModulo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.nombre.trim()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/modulos-catalogo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: draft.nombre.trim(),
          descripcion: draft.descripcion.trim() || null,
          categoria: draft.categoria.trim() || null,
          precio_ideal: parseNumber(draft.precio_ideal),
          precio_minimo: parseNumber(draft.precio_minimo),
          incremento_mensual: parseNumber(draft.incremento_mensual)
        })
      });
      const payload = (await response.json()) as ModuloResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo crear el módulo.");
      }

      setModulos((current) => [payload.data as ModuloCatalogo, ...current]);
      setDraft(emptyDraft);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el módulo.");
    } finally {
      setSaving(false);
    }
  }

  async function updateModulo(id: string, patch: Partial<ModuloCatalogo>) {
    setError(null);

    const previous = modulos;
    setModulos((current) =>
      current.map((modulo) => (modulo.id === id ? { ...modulo, ...patch } : modulo))
    );

    try {
      const response = await fetch(`/api/modulos-catalogo/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(patch)
      });
      const payload = (await response.json()) as ModuloResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo actualizar el módulo.");
      }

      setModulos((current) =>
        current.map((modulo) => (modulo.id === id ? (payload.data as ModuloCatalogo) : modulo))
      );
    } catch (updateError) {
      setModulos(previous);
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el módulo.");
    }
  }

  async function deleteModulo(id: string) {
    setError(null);

    const previous = modulos;
    setModulos((current) => current.filter((modulo) => modulo.id !== id));

    try {
      const response = await fetch(`/api/modulos-catalogo/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = (await response.json()) as ModuloResponse;
        throw new Error(payload.error ?? "No se pudo eliminar el módulo.");
      }
    } catch (deleteError) {
      setModulos(previous);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el módulo.");
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-component border border-danger/20 bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <form onSubmit={createModulo} className="rounded-card border border-line-soft bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-title text-carbon">Nuevo módulo</h2>
            <p className="mt-1 text-sm text-graphite">
              Sumá bloques del catálogo para futuras propuestas.
            </p>
          </div>
          <Button type="submit" loading={saving} disabled={!draft.nombre.trim()}>
            <PlusIcon size={16} aria-hidden="true" />
            Crear módulo
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Input
            label="Nombre"
            value={draft.nombre}
            onChange={(event) => setDraft((current) => ({ ...current, nombre: event.target.value }))}
          />
          <Input
            label="Categoría"
            value={draft.categoria}
            onChange={(event) => setDraft((current) => ({ ...current, categoria: event.target.value }))}
          />
          <Input
            label="Precio ideal"
            type="number"
            value={draft.precio_ideal}
            onChange={(event) => setDraft((current) => ({ ...current, precio_ideal: event.target.value }))}
          />
          <Input
            label="Precio mínimo"
            type="number"
            value={draft.precio_minimo}
            onChange={(event) => setDraft((current) => ({ ...current, precio_minimo: event.target.value }))}
          />
          <Input
            label="Incremento mensual"
            type="number"
            value={draft.incremento_mensual}
            onChange={(event) =>
              setDraft((current) => ({ ...current, incremento_mensual: event.target.value }))
            }
          />
          <Input
            label="Descripción"
            value={draft.descripcion}
            onChange={(event) => setDraft((current) => ({ ...current, descripcion: event.target.value }))}
          />
        </div>
      </form>

      <section className="rounded-card border border-line-soft bg-white">
        <div className="border-b border-line-soft px-5 py-4">
          <h2 className="text-lg font-title text-carbon">Catálogo de módulos</h2>
          <p className="mt-1 text-sm text-graphite">Valores de referencia para propuesta e informe.</p>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-graphite">Cargando módulos...</p>
        ) : modulos.length === 0 ? (
          <EmptyState icon={FileTextIcon} titulo="Sin módulos cargados" descripcion="Creá el primer módulo para usarlo en informes y propuestas." className="rounded-none border-0" />
        ) : (
          <div className="divide-y divide-line-soft">
            {modulos.map((modulo) => (
              <article key={modulo.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.2fr_1fr_auto]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={modulo.nombre}
                      onChange={(event) => updateModulo(modulo.id, { nombre: event.target.value })}
                      className="min-w-0 flex-1 rounded-component border border-transparent bg-transparent px-0 py-1 font-label text-carbon outline-none transition-colors duration-fast focus:border-line focus:bg-white focus:px-2"
                    />
                    <Badge variant={modulo.activo ? "success" : "ghost"}>
                      {modulo.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <textarea
                    value={modulo.descripcion ?? ""}
                    onChange={(event) => updateModulo(modulo.id, { descripcion: event.target.value || null })}
                    rows={2}
                    className="w-full resize-none rounded-component border border-transparent bg-transparent px-0 py-1 text-sm text-graphite outline-none transition-colors duration-fast focus:border-line focus:bg-white focus:px-2"
                    placeholder="Descripción del módulo"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-label text-graphite">Categoría</p>
                    <input
                      value={modulo.categoria ?? ""}
                      onChange={(event) => updateModulo(modulo.id, { categoria: event.target.value || null })}
                      className="mt-1 w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-label text-graphite">Mensual</p>
                    <input
                      type="number"
                      value={modulo.incremento_mensual ?? 0}
                      onChange={(event) =>
                        updateModulo(modulo.id, { incremento_mensual: parseNumber(event.target.value) })
                      }
                      className="mt-1 w-full rounded-component border border-line bg-white px-3 py-2 text-sm text-carbon"
                    />
                  </div>
                  <p className="text-sm text-graphite">
                    Ideal: <span className="font-label text-carbon">{formatCurrency(modulo.precio_ideal)}</span>
                  </p>
                  <p className="text-sm text-graphite">
                    Mínimo: <span className="font-label text-carbon">{formatCurrency(modulo.precio_minimo)}</span>
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateModulo(modulo.id, { activo: !modulo.activo })}
                  >
                    {modulo.activo ? "Pausar" : "Activar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteModulo(modulo.id)}>
                    <TrashIcon size={15} aria-hidden="true" />
                    Eliminar
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
