"use client";

import type { IntegracionSocial, MarcaIdentidadSeccion } from "@/types/contenidoOperacion";

type ApiResponse<T> = { data?: T; error?: string };

async function parse<T>(response: Response) {
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || payload.data === undefined) throw new Error(payload.error ?? "No se pudo completar la operación.");
  return payload.data;
}

export async function fetchIdentidadSecciones() {
  return parse<MarcaIdentidadSeccion[]>(await fetch("/api/marca/identidad-secciones"));
}

export async function saveIdentidadSecciones(secciones: Array<Pick<MarcaIdentidadSeccion, "clave" | "titulo" | "contenido">>) {
  return parse<MarcaIdentidadSeccion[]>(await fetch("/api/marca/identidad-secciones", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secciones })
  }));
}

export async function fetchIntegracionesSociales() {
  return parse<IntegracionSocial[]>(await fetch("/api/contenido/integraciones"));
}

export async function createIntegracionSocial(payload: { red: "instagram" | "linkedin"; nombre_cuenta: string; cuenta_externa_id?: string | null }) {
  return parse<IntegracionSocial[]>(await fetch("/api/contenido/integraciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }));
}
