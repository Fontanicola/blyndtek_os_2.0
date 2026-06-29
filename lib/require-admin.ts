import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { Usuario } from "@/types/auth";

export async function getAdminUser() {
  const usuario = await getCurrentUser();

  if (!usuario || usuario.rol !== "admin") {
    return null;
  }

  return usuario;
}

export async function requireAdminResponse() {
  const usuario = await getAdminUser();

  if (!usuario) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return usuario;
}

export function isForbiddenResponse(value: Usuario | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
