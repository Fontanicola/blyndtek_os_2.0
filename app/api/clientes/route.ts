import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCarpetaAutomaticaCliente } from "@/lib/carpetas";
import type { Cliente, CreateClienteInput, EstadoCliente } from "@/types/clientes";

function parseEstado(searchParams: URLSearchParams): EstadoCliente | null {
  const estado = searchParams.get("estado");

  if (estado === "activo" || estado === "pausado" || estado === "inactivo") {
    return estado;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const estado = parseEstado(request.nextUrl.searchParams);

    let query = supabase.from("clientes").select("*").order("empresa", { ascending: true });

    if (currentUser.rol === "comercial") {
      query = query.eq("vendedor_id", currentUser.id);
    } else if (currentUser.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

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
    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CreateClienteInput;

    if (!body.empresa?.trim()) {
      return NextResponse.json({ error: "Empresa is required" }, { status: 400 });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const supabase = createAdminClient();
    let leadVendedorId: string | null = null;

    if (body.lead_id) {
      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .select("vendedor_id")
        .eq("id", body.lead_id)
        .maybeSingle();

      if (leadError) {
        return NextResponse.json({ error: leadError.message }, { status: 500 });
      }

      leadVendedorId = leadData?.vendedor_id ?? null;
    }

    const payload: CreateClienteInput = {
      ...body,
      empresa: body.empresa.trim(),
      vendedor_id: leadVendedorId ?? (currentUser.rol === "comercial" ? currentUser.id : body.vendedor_id ?? null)
    };

    const { data, error } = await supabase
      .from("clientes")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const cliente = data as Cliente;

    try {
      await ensureCarpetaAutomaticaCliente(supabase, {
        id: cliente.id,
        nombre: cliente.empresa
      });
    } catch (folderError) {
      const message = folderError instanceof Error ? folderError.message : "Unexpected folder error";
      console.error("No se pudo crear la carpeta automática del cliente:", message);
    }

    return NextResponse.json({ data: cliente }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
