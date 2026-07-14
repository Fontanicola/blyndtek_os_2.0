import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateTarjetaInput, Tarjeta } from "@/types/tarjetas";

type TarjetaRow = Tarjeta;

const TIPOS_TARJETA = ["debito", "credito", "prepaga"] as const;

function isValidUltimos4(value: string | undefined) {
  return Boolean(value && /^\d{4}$/.test(value));
}

function isValidTipo(value: string | undefined): value is Tarjeta["tipo"] {
  return Boolean(value && TIPOS_TARJETA.includes(value as (typeof TIPOS_TARJETA)[number]));
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("tarjetas").select("*").order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data ?? []) as TarjetaRow[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateTarjetaInput;
    const alias = body.alias?.trim() ?? "";
    const ultimos4 = body.ultimos_4?.trim() ?? "";

    if (!alias) {
      return NextResponse.json({ error: "alias is required" }, { status: 400 });
    }

    if (!isValidUltimos4(ultimos4)) {
      return NextResponse.json({ error: "ultimos_4 must be exactly 4 numeric digits" }, { status: 400 });
    }

    if (!isValidTipo(body.tipo)) {
      return NextResponse.json({ error: "tipo is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tarjetas")
      .insert({
        alias,
        banco: normalizeOptionalText(body.banco),
        titular: normalizeOptionalText(body.titular),
        ultimos_4: ultimos4,
        vencimiento: normalizeOptionalText(body.vencimiento),
        tipo: body.tipo,
        uso_habitual: normalizeOptionalText(body.uso_habitual),
        notas: normalizeOptionalText(body.notas)
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as TarjetaRow }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
