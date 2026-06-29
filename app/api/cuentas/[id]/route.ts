import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CuentaServicio, UpdateCuentaServicioInput } from "@/types/cuentas";

type RouteContext = {
  params: {
    id: string;
  };
};

function isAdmin(role: string | null | undefined) {
  return role === "admin";
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAdmin(currentUser?.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden editar cuentas." }, { status: 403 });
    }

    const body = (await request.json()) as UpdateCuentaServicioInput;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cuentas_servicios")
      .update({
        ...body,
        servicio: body.servicio?.trim() || body.servicio,
        para_que: body.para_que ?? null,
        cuenta_email: body.cuenta_email ?? null,
        notas_acceso: body.notas_acceso ?? null
      })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as CuentaServicio });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAdmin(currentUser?.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden eliminar cuentas." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("cuentas_servicios").delete().eq("id", params.id);

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
