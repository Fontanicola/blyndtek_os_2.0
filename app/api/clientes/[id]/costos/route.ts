import { NextRequest, NextResponse } from "next/server";
import { normalizeCajaSlug } from "@/lib/cajas";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateEgresoInput, Egreso } from "@/types/egresos";

type RouteContext = {
  params: {
    id: string;
  };
};

type ClienteMinimo = {
  id: string;
  vendedor_id: string | null;
};

async function fetchClienteWithAccess(
  supabase: ReturnType<typeof createAdminClient>,
  clienteId: string,
  currentUserId: string,
  rol: string
) {
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

function toNumberOrNull(value: unknown) {
  if (typeof value !== "number") {
    return null;
  }

  return Number.isNaN(value) ? null : value;
}

async function resolveCajaSelection(
  supabase: ReturnType<typeof createAdminClient>,
  cajaId: string | null | undefined,
  cuentaMedio: string | null | undefined
) {
  if (cajaId) {
    const { data, error } = await supabase.from("cajas").select("id, slug").eq("id", cajaId).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return { caja_id: data.id, cuenta_medio: data.slug };
    }
  }

  const normalizedSlug = normalizeCajaSlug(cuentaMedio);
  if (normalizedSlug) {
    const { data, error } = await supabase.from("cajas").select("id, slug").eq("slug", normalizedSlug).maybeSingle();
    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return { caja_id: data.id, cuenta_medio: data.slug };
    }

    return { caja_id: null, cuenta_medio: normalizedSlug };
  }

  return { caja_id: null, cuenta_medio: null };
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

    const { data, error } = await supabase
      .from("egresos")
      .select("*")
      .eq("cliente_id", params.id)
      .order("fecha", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as Egreso[] });
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

    const body = (await request.json()) as CreateEgresoInput;
    const concepto = body.concepto?.trim();
    const categoria = body.categoria;
    const monto = toNumberOrNull(body.monto);
    const fecha = body.fecha?.trim();

    if (!concepto) {
      return NextResponse.json({ error: "concepto is required" }, { status: 400 });
    }

    if (!categoria) {
      return NextResponse.json({ error: "categoria is required" }, { status: 400 });
    }

    if (monto == null || monto < 0) {
      return NextResponse.json({ error: "monto must be a valid number" }, { status: 400 });
    }

    if (!fecha) {
      return NextResponse.json({ error: "fecha is required" }, { status: 400 });
    }

    const cajaSelection = await resolveCajaSelection(supabase, body.caja_id ?? null, body.cuenta_medio ?? null);
    const payload: CreateEgresoInput = {
      ...body,
      concepto,
      categoria,
      monto,
      fecha,
      cliente_id: params.id,
      recurrente: body.recurrente ?? false,
      caja_id: cajaSelection.caja_id,
      cuenta_medio: cajaSelection.cuenta_medio,
      pagado: body.pagado ?? false,
      fecha_pago: body.pagado ? body.fecha_pago ?? fecha : null,
      proyecto_id: body.proyecto_id ?? null,
      comision_id: body.comision_id ?? null,
      notas: body.notas ?? null
    };

    const { data, error } = await supabase.from("egresos").insert(payload).select("*").single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "No se pudo crear el egreso." }, { status: 500 });
    }

    return NextResponse.json({ data: data as Egreso }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
