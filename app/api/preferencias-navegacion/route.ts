import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvailableFocusSections } from "@/lib/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { navegacionSecciones, type NavegacionSeccionKey, type PreferenciaNavegacion } from "@/types/navegacion";

const sectionKeys = Object.keys(navegacionSecciones) as NavegacionSeccionKey[];

async function getOrCreatePreference(userId: string) {
  const supabase = createAdminClient();
  const existing = await supabase.from("preferencias_navegacion").select("*").eq("usuario_id", userId).maybeSingle();
  if (existing.error) return { data: null, error: existing.error };
  if (existing.data) return { data: existing.data as PreferenciaNavegacion, error: null };
  const created = await supabase.from("preferencias_navegacion").insert({ usuario_id: userId, secciones_ocultas: [], modo_foco_activo: false }).select("*").single();
  return { data: created.data as PreferenciaNavegacion | null, error: created.error };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const result = await getOrCreatePreference(user.id);
  if (result.error || !result.data) return NextResponse.json({ error: result.error?.message ?? "No se pudo cargar la preferencia." }, { status: 500 });
  return NextResponse.json({ data: result.data, secciones_disponibles: getAvailableFocusSections(user.rol) });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const body = await request.json().catch(() => null) as { secciones_ocultas?: unknown; modo_foco_activo?: unknown } | null;
  if (!body || Object.keys(body).some((key) => key !== "secciones_ocultas" && key !== "modo_foco_activo") || (!body.secciones_ocultas && body.modo_foco_activo === undefined)) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const available = getAvailableFocusSections(user.rol);
  const patch: { secciones_ocultas?: NavegacionSeccionKey[]; modo_foco_activo?: boolean; updated_at: string } = { updated_at: new Date().toISOString() };
  if (body.secciones_ocultas !== undefined) {
    if (!Array.isArray(body.secciones_ocultas) || body.secciones_ocultas.some((key) => typeof key !== "string" || !sectionKeys.includes(key as NavegacionSeccionKey) || !available.includes(key as NavegacionSeccionKey))) return NextResponse.json({ error: "Hay una sección inválida o sin acceso para este usuario." }, { status: 400 });
    patch.secciones_ocultas = [...new Set(body.secciones_ocultas)] as NavegacionSeccionKey[];
  }
  if (body.modo_foco_activo !== undefined) {
    if (typeof body.modo_foco_activo !== "boolean") return NextResponse.json({ error: "El modo foco debe ser booleano." }, { status: 400 });
    patch.modo_foco_activo = body.modo_foco_activo;
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("preferencias_navegacion").upsert({ usuario_id: user.id, ...patch }, { onConflict: "usuario_id" }).select("*").single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo guardar la preferencia." }, { status: 500 });
  return NextResponse.json({ data, secciones_disponibles: available });
}
