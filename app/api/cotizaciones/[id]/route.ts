import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCotizacionPayload } from "@/lib/cotizaciones";
import type { Cotizacion, UpdateCotizacionInput } from "@/types/cotizaciones";

type RouteContext = {
  params: {
    id: string;
  };
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_REGEX.test(value);
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: "ID de cotización inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cotizaciones")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    if (!data) {
      return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ data: data as Cotizacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: "ID de cotización inválido." }, { status: 400 });
    }

    const body = (await request.json()) as UpdateCotizacionInput;
    const payload = normalizeCotizacionPayload({
      ...body,
      contexto_chat: body.contexto_chat ? [...body.contexto_chat] : body.contexto_chat,
      adjuntos: body.adjuntos ? [...body.adjuntos] : body.adjuntos
    }) as UpdateCotizacionInput;
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cotizaciones")
      .update(payload)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    if (!data) {
      return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ data: data as Cotizacion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: "ID de cotización inválido." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: current, error: currentError } = await supabase
      .from("cotizaciones")
      .select("estado")
      .eq("id", params.id)
      .single();

    if (currentError || !current) {
      const status = currentError?.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError?.message ?? "Not found" }, { status });
    }

    if (current.estado !== "borrador") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar cotizaciones en borrador." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("cotizaciones").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
