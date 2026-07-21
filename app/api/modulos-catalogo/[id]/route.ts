import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ModuloCatalogo } from "@/types/diagnostico";

type RouteContext = {
  params: {
    id: string;
  };
};

type ModuloCatalogoInput = Partial<
  Pick<ModuloCatalogo, "nombre" | "descripcion" | "categoria" | "precio_ideal" | "precio_minimo" | "incremento_mensual" | "activo">
>;

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

function buildPatch(body: ModuloCatalogoInput) {
  const patch: ModuloCatalogoInput = {};

  if (typeof body.nombre === "string") {
    patch.nombre = body.nombre.trim();
  }

  if ("descripcion" in body) {
    patch.descripcion = body.descripcion?.trim() || null;
  }

  if ("categoria" in body) {
    patch.categoria = body.categoria?.trim() || null;
  }

  if (typeof body.precio_ideal === "number") {
    patch.precio_ideal = body.precio_ideal;
  }

  if (typeof body.precio_minimo === "number") {
    patch.precio_minimo = body.precio_minimo;
  }

  if (typeof body.incremento_mensual === "number") {
    patch.incremento_mensual = body.incremento_mensual;
  }

  if (typeof body.activo === "boolean") {
    patch.activo = body.activo;
  }

  return patch;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await assertAdmin();

    if (authError) {
      return authError;
    }

    const body = (await request.json()) as ModuloCatalogoInput;
    const patch = buildPatch(body);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("modulos_catalogo")
      .update(patch)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error || !data) {
      const status = error?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        { error: error?.message ?? "No se pudo actualizar el módulo." },
        { status }
      );
    }

    return NextResponse.json({ data: data as ModuloCatalogo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const authError = await assertAdmin();

    if (authError) {
      return authError;
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("modulos_catalogo").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
