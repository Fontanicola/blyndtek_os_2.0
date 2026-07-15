import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { crearOActualizarContrato } from "@/lib/contratos/crearOActualizarContrato";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Cobro } from "@/types/cobros";
import type { Contrato, ContratoCobroResumen, ContratoDetalle, CreateContratoInput } from "@/types/contratos";

type RouteContext = {
  params: {
    id: string;
  };
};

type ClienteMinimo = {
  id: string;
  vendedor_id: string | null;
};

function emptyResumen(): ContratoCobroResumen {
  return {
    cobrado: { cantidad: 0, monto: 0 },
    pendiente: { cantidad: 0, monto: 0 },
    facturado: { cantidad: 0, monto: 0 },
    vencido: { cantidad: 0, monto: 0 },
    total: { cantidad: 0, monto: 0 }
  };
}

async function fetchClienteWithAccess(supabase: ReturnType<typeof createAdminClient>, clienteId: string, currentUserId: string, rol: string) {
  const { data, error } = await supabase.from("clientes").select("id, vendedor_id").eq("id", clienteId).single();

  if (error) {
    return { error: error.message, status: error.code === "PGRST116" ? 404 : 500 } as const;
  }

  const cliente = data as ClienteMinimo;

  if (rol === "comercial" && cliente.vendedor_id !== currentUserId) {
    return { error: "No autorizado.", status: 403 } as const;
  }

  if (rol !== "admin" && rol !== "comercial") {
    return { error: "No autorizado.", status: 403 } as const;
  }

  return { data: cliente } as const;
}

async function fetchActiveContrato(supabase: ReturnType<typeof createAdminClient>, clienteId: string): Promise<Contrato | null> {
  const { data, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("estado", "activo")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Contrato;
}

function buildCobrosResumen(cobros: Cobro[]): ContratoCobroResumen {
  const resumen = emptyResumen();

  for (const cobro of cobros) {
    if (cobro.estado !== "cobrado" && cobro.estado !== "pendiente" && cobro.estado !== "facturado" && cobro.estado !== "vencido") {
      continue;
    }

    resumen[cobro.estado].cantidad += 1;
    resumen[cobro.estado].monto += cobro.monto;
    resumen.total.cantidad += 1;
    resumen.total.monto += cobro.monto;
  }

  return resumen;
}

async function buildContratoData(
  supabase: ReturnType<typeof createAdminClient>,
  clienteId: string
): Promise<ContratoDetalle> {
  const contrato = await fetchActiveContrato(supabase, clienteId);

  if (!contrato) {
    return {
      contrato: null,
      cobros_resumen: emptyResumen()
    };
  }

  const { data: cobros, error } = await supabase
    .from("cobros")
    .select("*")
    .eq("contrato_id", contrato.id)
    .order("fecha_vencimiento", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    contrato,
    cobros_resumen: buildCobrosResumen((cobros ?? []) as Cobro[])
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const access = await fetchClienteWithAccess(supabase, params.id, currentUser.id, currentUser.rol);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const data = await buildContratoData(supabase, params.id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const access = await fetchClienteWithAccess(supabase, params.id, currentUser.id, currentUser.rol);

    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await request.json()) as CreateContratoInput;
    const resumen = await crearOActualizarContrato(supabase, params.id, body);

    return NextResponse.json({ data: resumen }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
