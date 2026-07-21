import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Diagnostico, DiagnosticoPublicPayload, PreguntaDiagnostico } from "@/types/diagnostico";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    token: string;
  };
};

type SaveDiagnosticoBody = {
  respuestas?: Record<string, unknown>;
  completo?: boolean;
};

type DiagnosticoRecord = Diagnostico & {
  lead?: {
    empresa: string;
    contacto_1_nombre: string | null;
  } | null;
};

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

async function getDiagnosticoPayload(token: string): Promise<DiagnosticoPublicPayload | null> {
  const supabase = createAdminClient();
  const { data: diagnostico, error } = await supabase
    .from("diagnosticos")
    .select("*, lead:leads(empresa, contacto_1_nombre)")
    .eq("token_publico", token)
    .maybeSingle<DiagnosticoRecord>();

  if (error) {
    throw new Error(error.message);
  }

  if (!diagnostico) {
    return null;
  }

  const { data: preguntas, error: preguntasError } = await supabase
    .from("preguntas_diagnostico")
    .select("*")
    .eq("activa", true)
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true })
    .returns<PreguntaDiagnostico[]>();

  if (preguntasError) {
    throw new Error(preguntasError.message);
  }

  return {
    diagnostico: {
      id: diagnostico.id,
      token_publico: diagnostico.token_publico,
      respuestas: diagnostico.respuestas ?? {},
      estado: diagnostico.estado,
      completado_por: diagnostico.completado_por,
      fecha_completado: diagnostico.fecha_completado
    },
    lead: diagnostico.lead ?? null,
    preguntas: preguntas ?? []
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const token = params.token.trim();

    if (!token) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    const payload = await getDiagnosticoPayload(token);

    if (!payload) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const token = params.token.trim();
    const body = (await request.json()) as SaveDiagnosticoBody;
    const supabase = createAdminClient();

    const { data: current, error: currentError } = await supabase
      .from("diagnosticos")
      .select("*")
      .eq("token_publico", token)
      .maybeSingle<Diagnostico>();

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }

    if (!current) {
      return NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 });
    }

    const merged = {
      ...(current.respuestas ?? {}),
      ...normalizeRespuestas(body.respuestas)
    };
    const completePatch = body.completo
      ? { estado: "respondido", completado_por: "cliente", fecha_completado: new Date().toISOString() }
      : {};

    const { data, error } = await supabase
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

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
