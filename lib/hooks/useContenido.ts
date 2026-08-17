"use client";

import type { CanalContenido, FeedSlotContenido, MarcaContenido, PiezaContenido, PiezaContenidoEstado, PilarContenido, PlanSemanal } from "@/types/contenido";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "No se pudo completar la operación.");
  }

  return payload.data;
}

export type PiezasContenidoFiltros = {
  estado?: PiezaContenidoEstado | "todas";
  pilar_id?: string | null;
};

export type ImagenReferenciaContenido = {
  id: string;
  label: string;
  sublabel: string;
  url: string;
};

export type GenerarImagenPiezaResult = {
  prompt_fondo: string;
  fondo_storage_path: string;
  fondo_url: string;
  tokens_entrada: number | null;
  tokens_salida: number | null;
  costo_generacion_usd: number | null;
  pieza: PiezaContenido;
};

export type RenderizarPiezaResult = {
  imagenes_generadas: string[];
  pieza: PiezaContenido;
};

export type GenerarCompletoPiezaResult = RenderizarPiezaResult & {
  prompt_fondo: string | null;
  fondo_storage_path: string | null;
  actividad_id: string | null;
};

export type PlanSemanalContenido = {
  plan: PlanSemanal;
  piezas: PiezaContenido[];
};

export type GenerarPlanSemanalResult = PlanSemanalContenido & {
  contenido_generado: unknown;
};

export async function fetchMarcaBlyndtek() {
  const response = await fetch("/api/marcas-contenido/blyndtek");
  return parseResponse<MarcaContenido>(response);
}

export async function updateMarcaBlyndtek(payload: Partial<MarcaContenido>) {
  const response = await fetch("/api/marcas-contenido/blyndtek", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<MarcaContenido>(response);
}

export async function fetchPilares() {
  const response = await fetch("/api/marcas-contenido/blyndtek/pilares");
  return parseResponse<PilarContenido[]>(response);
}

export async function createPilar(payload: Pick<PilarContenido, "nombre"> & Partial<PilarContenido>) {
  const response = await fetch("/api/marcas-contenido/blyndtek/pilares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<PilarContenido>(response);
}

export async function updatePilar(id: string, payload: Partial<PilarContenido>) {
  const response = await fetch(`/api/pilares-contenido/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<PilarContenido>(response);
}

export async function deletePilar(id: string) {
  const response = await fetch(`/api/pilares-contenido/${id}`, {
    method: "DELETE"
  });
  return parseResponse<{ deleted: boolean }>(response);
}

export async function fetchPiezas(filtros: PiezasContenidoFiltros = {}) {
  const params = new URLSearchParams();
  if (filtros.estado && filtros.estado !== "todas") params.set("estado", filtros.estado);
  if (filtros.pilar_id) params.set("pilar_id", filtros.pilar_id);

  const response = await fetch(`/api/piezas-contenido${params.toString() ? `?${params.toString()}` : ""}`);
  return parseResponse<PiezaContenido[]>(response);
}

export async function fetchCanales() {
  const response = await fetch("/api/marca/canales");
  return parseResponse<CanalContenido[]>(response);
}

export async function createCanal(payload: Pick<CanalContenido, "nombre"> & Partial<Pick<CanalContenido, "plataforma" | "color">>) {
  const response = await fetch("/api/marca/canales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<CanalContenido>(response);
}

export async function fetchFeedSlots(plataforma = "instagram_feed") {
  const response = await fetch(`/api/marca/feed-slots?plataforma=${encodeURIComponent(plataforma)}`);
  return parseResponse<FeedSlotContenido[]>(response);
}

export async function updateFeedSlot(payload: Pick<FeedSlotContenido, "plataforma" | "slot_orden"> & Partial<Pick<FeedSlotContenido, "fecha_programada">>) {
  const response = await fetch("/api/marca/feed-slots", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return parseResponse<FeedSlotContenido>(response);
}

export async function createPieza(payload: Partial<Pick<PiezaContenido, "titulo" | "pilar_id" | "plataforma" | "tipo_pieza" | "fecha_programada">> = {}) {
  const response = await fetch("/api/piezas-contenido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<PiezaContenido>(response);
}

export async function updatePieza(id: string, payload: Partial<PiezaContenido>) {
  const response = await fetch(`/api/piezas-contenido/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<PiezaContenido>(response);
}

export async function deletePieza(id: string) {
  const response = await fetch(`/api/piezas-contenido/${id}`, {
    method: "DELETE"
  });
  return parseResponse<{ deleted: boolean }>(response);
}

export async function subirImagenPieza(id: string, file: File, slideIndex?: number | null) {
  const formData = new FormData();
  formData.append("file", file);
  if (typeof slideIndex === "number") {
    formData.append("slide_index", String(slideIndex));
  }

  const response = await fetch(`/api/piezas-contenido/${id}/imagen`, {
    method: "POST",
    body: formData
  });
  return parseResponse<PiezaContenido>(response);
}

export async function fetchImagenesReferenciaContenido() {
  const response = await fetch("/api/piezas-contenido/referencias");
  return parseResponse<ImagenReferenciaContenido[]>(response);
}

export async function generarImagenPieza(id: string, payload: { imagen_referencia_url?: string | null } = {}) {
  const response = await fetch(`/api/piezas-contenido/${id}/generar-imagen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<GenerarImagenPiezaResult>(response);
}

export async function generarCompletoPieza(id: string) {
  const response = await fetch(`/api/piezas-contenido/${id}/generar-completo`, {
    method: "POST"
  });
  return parseResponse<GenerarCompletoPiezaResult>(response);
}

export async function renderizarPieza(id: string) {
  const response = await fetch(`/api/piezas-contenido/${id}/renderizar`, {
    method: "POST"
  });
  return parseResponse<RenderizarPiezaResult>(response);
}

export async function publicarPieza(id: string, red: "instagram" | "linkedin") {
  const response = await fetch(`/api/piezas-contenido/${id}/publicar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ red })
  });
  return parseResponse<PiezaContenido>(response);
}

export async function fetchPlanSemanal(semanaInicio: string) {
  const params = new URLSearchParams({ semana_inicio: semanaInicio });
  const response = await fetch(`/api/planes-semanales?${params.toString()}`);
  const payload = (await response.json()) as ApiResponse<PlanSemanalContenido | null>;

  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudo cargar el plan semanal.");
  }

  return payload.data ?? null;
}

export async function generarPlanSemanal(payload: { semana_inicio: string }) {
  const response = await fetch("/api/planes-semanales/generar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<GenerarPlanSemanalResult>(response);
}

export function useContenido() {
  return {
    fetchMarcaBlyndtek,
    updateMarcaBlyndtek,
    fetchPilares,
    createPilar,
    updatePilar,
    deletePilar,
    fetchPiezas,
    fetchCanales,
    createCanal,
    fetchFeedSlots,
    updateFeedSlot,
    createPieza,
    updatePieza,
    deletePieza,
    subirImagenPieza,
    fetchImagenesReferenciaContenido,
    generarImagenPieza,
    generarCompletoPieza,
    renderizarPieza,
    publicarPieza,
    fetchPlanSemanal,
    generarPlanSemanal
  };
}
