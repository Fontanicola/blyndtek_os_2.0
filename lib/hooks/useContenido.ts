"use client";

import type { MarcaContenido, PiezaContenido, PiezaContenidoEstado, PilarContenido } from "@/types/contenido";

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

export async function createPieza(payload: Partial<Pick<PiezaContenido, "titulo" | "pilar_id">> = {}) {
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

export async function subirImagenPieza(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/piezas-contenido/${id}/imagen`, {
    method: "POST",
    body: formData
  });
  return parseResponse<PiezaContenido>(response);
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
    createPieza,
    updatePieza,
    deletePieza,
    subirImagenPieza
  };
}
