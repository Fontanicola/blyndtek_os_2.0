import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Diagnostico } from "@/types/diagnostico";

type RouteContext = {
  params: {
    id: string;
  };
};

type DiagnosticoWithLead = Diagnostico & {
  lead?: {
    id: string;
    empresa: string;
    vendedor_id: string | null;
  } | null;
};

type SaveDiagnosticoBody = {
  respuestas?: Record<string, unknown>;
  completo?: boolean;
};

async function assertCanAccessLead(leadId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }), supabase: null };
  }

  if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }), supabase: null };
  }

  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, vendedor_id")
    .eq("id", leadId)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return { error: NextResponse.json({ error: error.message }, { status }), supabase: null };
  }

  if (currentUser.rol === "comercial" && lead?.vendedor_id !== currentUser.id) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }), supabase: null };
  }

  return { error: null, supabase };
}

function normalizeRespuestas(respuestas: Record<string, unknown> | undefined) {
  if (!respuestas) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(respuestas)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
      .filter(([key]) => Boolean(key))
  );
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const access = await assertCanAccessLead(params.id);

    if (access.error || !access.supabase) {
      return access.error;
    }

    const { data, error } = await access.supabase
      .from("diagnosticos")
      .select("*")
      .eq("lead_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: (data?.[0] ?? null) as Diagnostico | null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  try {
    const access = await assertCanAccessLead(params.id);

    if (access.error || !access.supabase) {
      return access.error;
    }

    const existing = await access.supabase
      .from("diagnosticos")
      .select("*")
      .eq("lead_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }

    if (existing.data?.[0]) {
      return NextResponse.json({ data: existing.data[0] as Diagnostico });
    }

    const { data, error } = await access.supabase
      .from("diagnosticos")
      .insert({ lead_id: params.id, estado: "pendiente", respuestas: {} })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo crear el diagnóstico." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data as Diagnostico }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const access = await assertCanAccessLead(params.id);

    if (access.error || !access.supabase) {
      return access.error;
    }

    const body = (await request.json()) as SaveDiagnosticoBody;
    const respuestas = normalizeRespuestas(body.respuestas);

    const { data: current, error: currentError } = await access.supabase
      .from("diagnosticos")
      .select("*")
      .eq("lead_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (currentError) {
      const status = currentError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: currentError.message }, { status });
    }

    const merged = {
      ...((current as DiagnosticoWithLead).respuestas ?? {}),
      ...respuestas
    };
    const completePatch = body.completo
      ? { estado: "respondido", completado_por: "admin", fecha_completado: new Date().toISOString() }
      : {};

    const { data, error } = await access.supabase
      .from("diagnosticos")
      .update({
        respuestas: merged,
        ...completePatch
      })
      .eq("id", current.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo guardar el diagnóstico." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data as Diagnostico });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
