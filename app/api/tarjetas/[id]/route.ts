import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tarjeta, UpdateTarjetaInput } from "@/types/tarjetas";

type RouteContext = {
  params: {
    id: string;
  };
};

const TIPOS_TARJETA = ["debito", "credito", "prepaga"] as const;

function isValidUltimos4(value: string | undefined) {
  return Boolean(value && /^\d{4}$/.test(value));
}

function isValidTipo(value: string | undefined): value is Tarjeta["tipo"] {
  return Boolean(value && TIPOS_TARJETA.includes(value as (typeof TIPOS_TARJETA)[number]));
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateTarjetaInput;
    const payload: Partial<Tarjeta> = {};

    if (typeof body.alias === "string") {
      const alias = body.alias.trim();
      if (!alias) {
        return NextResponse.json({ error: "alias is required" }, { status: 400 });
      }
      payload.alias = alias;
    }

    if ("banco" in body) {
      payload.banco = normalizeOptionalText(body.banco ?? null);
    }

    if ("titular" in body) {
      payload.titular = normalizeOptionalText(body.titular ?? null);
    }

    if (typeof body.ultimos_4 === "string") {
      const ultimos4 = body.ultimos_4.trim();
      if (!isValidUltimos4(ultimos4)) {
        return NextResponse.json({ error: "ultimos_4 must be exactly 4 numeric digits" }, { status: 400 });
      }
      payload.ultimos_4 = ultimos4;
    }

    if ("vencimiento" in body) {
      payload.vencimiento = normalizeOptionalText(body.vencimiento ?? null);
    }

    if (typeof body.tipo === "string") {
      if (!isValidTipo(body.tipo)) {
        return NextResponse.json({ error: "tipo is required" }, { status: 400 });
      }
      payload.tipo = body.tipo;
    }

    if ("uso_habitual" in body) {
      payload.uso_habitual = normalizeOptionalText(body.uso_habitual ?? null);
    }

    if ("notas" in body) {
      payload.notas = normalizeOptionalText(body.notas ?? null);
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("tarjetas").update(payload).eq("id", context.params.id).select("*").single();

    if (error) {
      const status = error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data: data as Tarjeta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("tarjetas").delete().eq("id", context.params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
