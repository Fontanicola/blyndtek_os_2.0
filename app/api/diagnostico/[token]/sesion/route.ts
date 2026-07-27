import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resumirMetricas, normalizarMetrica } from "@/lib/diagnostico/cuantitativo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PreguntaDiagnostico } from "@/types/diagnostico";
import type { DiagnosticoArea, DiagnosticoMetrica, DiagnosticoSesion } from "@/types/diagnosticoCuantitativo";

export const dynamic = "force-dynamic";

type RouteContext = { params: { token: string } };

async function getAccess(token: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  if (currentUser.rol !== "admin" && currentUser.rol !== "comercial") {
    return { response: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  // Estas tablas se agregan en 020 y todavía no forman parte del tipo generado histórico.
  const db = createAdminClient() as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };
  const { data: diagnostico, error } = await db
    .from("diagnosticos")
    .select("id, lead_id, respuestas, lead:leads(vendedor_id)")
    .eq("token_publico", token)
    .maybeSingle();

  if (error) return { response: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!diagnostico) return { response: NextResponse.json({ error: "Diagnóstico no encontrado." }, { status: 404 }) };

  const vendedorId = Array.isArray(diagnostico.lead) ? diagnostico.lead[0]?.vendedor_id : diagnostico.lead?.vendedor_id;
  if (currentUser.rol === "comercial" && vendedorId !== currentUser.id) {
    return { response: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }

  return { db, diagnostico };
}

function normalizeArea(input: Record<string, unknown>, diagnosticoId: string) {
  return {
    ...(typeof input.id === "string" && !input.id.startsWith("temp-") ? { id: input.id } : {}),
    diagnostico_id: diagnosticoId,
    nombre: String(input.nombre ?? "").trim(),
    responsable: String(input.responsable ?? "").trim() || null,
    volumen_mensual: Number(input.volumen_mensual ?? 0) || 0,
    unidad_volumen: String(input.unidad_volumen ?? "").trim() || null,
    herramientas: Array.isArray(input.herramientas)
      ? input.herramientas.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [],
    proceso_actual: String(input.proceso_actual ?? "").trim() || null,
    dependencia_critica: Boolean(input.dependencia_critica),
    nivel_friccion: Math.min(5, Math.max(1, Math.round(Number(input.nivel_friccion ?? 3) || 3))),
    updated_at: new Date().toISOString()
  };
}

function normalizeMetric(input: Record<string, unknown>, diagnosticoId: string) {
  const normalized = normalizarMetrica({ ...input, diagnostico_id: diagnosticoId });
  return {
    ...(typeof input.id === "string" && !input.id.startsWith("temp-") ? { id: input.id } : {}),
    ...normalized,
    diagnostico_id: diagnosticoId,
    area_id: typeof input.area_id === "string" && !input.area_id.startsWith("temp-") ? input.area_id : null,
    tipo: input.tipo ?? "otro",
    concepto: String(input.concepto ?? "").trim(),
    confianza: ["alta", "media", "baja"].includes(String(input.confianza)) ? input.confianza : "media",
    notas: String(input.notas ?? "").trim() || null,
    updated_at: new Date().toISOString()
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const access = await getAccess(params.token.trim());
    if (access.response) return access.response;
    const { db, diagnostico } = access;

    const [{ data: sesion, error: sesionError }, { data: areas, error: areasError }, { data: metricas, error: metricasError }, { data: preguntas, error: preguntasError }] = await Promise.all([
      db.from("diagnostico_sesiones").select("*").eq("diagnostico_id", diagnostico.id).maybeSingle(),
      db.from("diagnostico_areas").select("*").eq("diagnostico_id", diagnostico.id).order("created_at", { ascending: true }),
      db.from("diagnostico_metricas").select("*").eq("diagnostico_id", diagnostico.id).order("created_at", { ascending: true }),
      db.from("preguntas_diagnostico").select("*").eq("activa", true).eq("momento", "sesion").order("categoria", { ascending: true }).order("orden", { ascending: true })
    ]);

    const error = sesionError ?? areasError ?? metricasError ?? preguntasError;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: {
        sesion: sesion as DiagnosticoSesion | null,
        areas: (areas ?? []) as DiagnosticoArea[],
        metricas: (metricas ?? []) as DiagnosticoMetrica[],
        resumen: resumirMetricas((metricas ?? []) as Array<Record<string, unknown>>),
        preguntas: (preguntas ?? []) as PreguntaDiagnostico[],
        respuestas: (diagnostico.respuestas ?? {}) as Record<string, string>
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar la sesión." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const access = await getAccess(params.token.trim());
    if (access.response) return access.response;
    const { db, diagnostico } = access;
    const body = (await request.json()) as {
      sesion?: Record<string, unknown>;
      areas?: Array<Record<string, unknown>>;
      metricas?: Array<Record<string, unknown>>;
      respuestas?: Record<string, unknown>;
    };

    if (body.respuestas) {
      const respuestas = Object.fromEntries(
        Object.entries(body.respuestas)
          .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
          .filter(([key]) => Boolean(key))
      );
      const { error } = await db
        .from("diagnosticos")
        .update({ respuestas: { ...(diagnostico.respuestas ?? {}), ...respuestas } })
        .eq("id", diagnostico.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.sesion) {
      const sesionPayload = {
        ...(typeof body.sesion.id === "string" && !body.sesion.id.startsWith("temp-") ? { id: body.sesion.id } : {}),
        diagnostico_id: diagnostico.id,
        fecha: String(body.sesion.fecha ?? "").trim() || new Date().toISOString().slice(0, 10),
        duracion_minutos: Number(body.sesion.duracion_minutos ?? 0) || null,
        decisor_nombre: String(body.sesion.decisor_nombre ?? "").trim() || null,
        decisor_cargo: String(body.sesion.decisor_cargo ?? "").trim() || null,
        notas: String(body.sesion.notas ?? "").trim() || null,
        estado: body.sesion.estado === "completa" ? "completa" : "en_curso",
        updated_at: new Date().toISOString()
      };
      const { error } = await db.from("diagnostico_sesiones").upsert(sesionPayload, { onConflict: "diagnostico_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (body.areas) {
      const areas = body.areas.map((area) => normalizeArea(area, diagnostico.id)).filter((area) => area.nombre);
      if (areas.length > 0) {
        const { error } = await db.from("diagnostico_areas").upsert(areas, { onConflict: "diagnostico_id,nombre" });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (body.metricas) {
      const metricas = body.metricas.map((metric) => normalizeMetric(metric, diagnostico.id)).filter((metric) => metric.concepto);
      if (metricas.length > 0) {
        const { error } = await db.from("diagnostico_metricas").upsert(metricas);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const [{ data: sesion }, { data: areas }, { data: metricas }, { data: preguntas }] = await Promise.all([
      db.from("diagnostico_sesiones").select("*").eq("diagnostico_id", diagnostico.id).maybeSingle(),
      db.from("diagnostico_areas").select("*").eq("diagnostico_id", diagnostico.id).order("created_at", { ascending: true }),
      db.from("diagnostico_metricas").select("*").eq("diagnostico_id", diagnostico.id).order("created_at", { ascending: true }),
      db.from("preguntas_diagnostico").select("*").eq("activa", true).eq("momento", "sesion").order("categoria", { ascending: true }).order("orden", { ascending: true })
    ]);

    return NextResponse.json({
      data: {
        sesion,
        areas,
        metricas,
        resumen: resumirMetricas((metricas ?? []) as Array<Record<string, unknown>>),
        preguntas: (preguntas ?? []) as PreguntaDiagnostico[],
        respuestas: {
          ...(diagnostico.respuestas ?? {}),
          ...(body.respuestas ?? {})
        } as Record<string, string>
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la sesión." }, { status: 500 });
  }
}
