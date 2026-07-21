import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ModuloCatalogo } from "@/types/diagnostico";
import type { Database } from "@/types/supabase";

type ModuloCatalogoInput = Partial<
  Pick<ModuloCatalogo, "nombre" | "descripcion" | "categoria" | "precio_ideal" | "precio_minimo" | "incremento_mensual" | "activo">
>;
type ModuloCatalogoInsert = Database["public"]["Tables"]["modulos_catalogo"]["Insert"];

async function assertAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (currentUser.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  return null;
}

function normalizeInput(body: ModuloCatalogoInput) {
  return {
    nombre: body.nombre?.trim(),
    descripcion: body.descripcion?.trim() || null,
    categoria: body.categoria?.trim() || null,
    precio_ideal: Number(body.precio_ideal ?? 0),
    precio_minimo: Number(body.precio_minimo ?? 0),
    incremento_mensual: Number(body.incremento_mensual ?? 0),
    activo: body.activo ?? true
  };
}

export async function GET() {
  try {
    const authError = await assertAdmin();

    if (authError) {
      return authError;
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("modulos_catalogo")
      .select("*")
      .order("categoria", { ascending: true })
      .order("nombre", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as ModuloCatalogo[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await assertAdmin();

    if (authError) {
      return authError;
    }

    const body = (await request.json()) as ModuloCatalogoInput;
    const payload = normalizeInput(body);

    if (!payload.nombre) {
      return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
    }

    const insertPayload: ModuloCatalogoInsert = {
      ...payload,
      nombre: payload.nombre
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("modulos_catalogo")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo crear el módulo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data as ModuloCatalogo }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
