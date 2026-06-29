import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateCuentaServicioInput, CuentaServicio } from "@/types/cuentas";

type RouteContext = {
  params: {
    id: string;
  };
};

function isAdmin(role: string | null | undefined) {
  return role === "admin";
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAdmin(currentUser?.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden ver las cuentas." }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cuentas_servicios")
      .select("*")
      .eq("proyecto_id", params.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as CuentaServicio[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();
    if (!isAdmin(currentUser?.rol)) {
      return NextResponse.json({ error: "Solo administradores pueden crear cuentas." }, { status: 403 });
    }

    const body = (await request.json()) as Omit<CreateCuentaServicioInput, "proyecto_id">;

    if (!body.servicio?.trim()) {
      return NextResponse.json({ error: "servicio is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cuentas_servicios")
      .insert({
        proyecto_id: params.id,
        servicio: body.servicio.trim(),
        para_que: body.para_que ?? null,
        cuenta_email: body.cuenta_email ?? null,
        notas_acceso: body.notas_acceso ?? null
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as CuentaServicio }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
