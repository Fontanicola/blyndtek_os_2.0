import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cliente, CreateClienteInput, EstadoCliente } from "@/types/clientes";

function parseEstado(searchParams: URLSearchParams): EstadoCliente | null {
  const estado = searchParams.get("estado");

  if (estado === "activo" || estado === "inactivo") {
    return estado;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const estado = parseEstado(request.nextUrl.searchParams);

    let query = supabase.from("clientes").select("*").order("empresa", { ascending: true });

    if (estado) {
      query = query.eq("estado", estado);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Cliente[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateClienteInput;

    if (!body.empresa?.trim()) {
      return NextResponse.json({ error: "Empresa is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const payload: CreateClienteInput = {
      ...body,
      empresa: body.empresa.trim()
    };

    const { data, error } = await supabase
      .from("clientes")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as Cliente }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
