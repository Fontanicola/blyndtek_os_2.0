import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente, UpdateClienteInput } from "@/types/clientes";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    if (currentUser.rol === "comercial" && data?.vendedor_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    return NextResponse.json({ data: data as Cliente });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as UpdateClienteInput;
    const supabase = createAdminClient();
    const { data: existingCliente, error: existingClienteError } = await supabase
      .from("clientes")
      .select("id, vendedor_id")
      .eq("id", params.id)
      .single();

    if (existingClienteError) {
      const status = existingClienteError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: existingClienteError.message }, { status });
    }

    if (currentUser.rol === "comercial" && existingCliente?.vendedor_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("clientes")
      .update(body)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Cliente });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: existingCliente, error: existingClienteError } = await supabase
      .from("clientes")
      .select("id, vendedor_id")
      .eq("id", params.id)
      .single();

    if (existingClienteError) {
      const status = existingClienteError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: existingClienteError.message }, { status });
    }

    if (currentUser.rol === "comercial" && existingCliente?.vendedor_id !== currentUser.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("clientes")
      .update({ estado: "inactivo" })
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Cliente });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
