import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getMarketingCommandCenter, persistDailyMarketingPriorities } from "@/lib/marketing/command-center";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import type { MarketingHubPeriod } from "@/types/marketingHub";

export const dynamic = "force-dynamic";

function periodFrom(value: string | null): MarketingHubPeriod {
  return value === "7d" || value === "90d" || value === "year" ? value : "30d";
}

function tomorrowAtSix() {
  const local = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  local.setDate(local.getDate() + 1);
  const date = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
  return `${date}T18:00:00-03:00`;
}

async function requireMarketingUser() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }), user: null };
  if (!['admin', 'marketing'].includes(user.rol)) return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }), user: null };
  return { error: null, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireMarketingUser();
    if (auth.error) return auth.error;
    const data = await getMarketingCommandCenter(periodFrom(request.nextUrl.searchParams.get("period")));
    return NextResponse.json({ data, permissions: { canEditGoals: auth.user!.rol === "admin", canCreateExperiments: true, canCreateTasks: true } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar el centro de marketing." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMarketingUser();
    if (auth.error) return auth.error;
    const body = await request.json() as { action?: string; priorityId?: string; period?: MarketingHubPeriod };
    if (body.action === "refresh") {
      const data = await persistDailyMarketingPriorities(body.period ?? "30d");
      return NextResponse.json({ data });
    }
    if (body.action !== "create_task" || !body.priorityId) return NextResponse.json({ error: "Acción inválida." }, { status: 400 });

    const db = createUntypedAdminClient();
    const { data: priority, error } = await db.from("marketing_daily_priorities").select("*").eq("id", body.priorityId).single();
    if (error || !priority) return NextResponse.json({ error: "La prioridad no existe." }, { status: 404 });
    if (priority.task_id) return NextResponse.json({ data: { taskId: priority.task_id } });

    let responsibleId = priority.assigned_to || auth.user!.id;
    if (priority.entity_type === "user" && priority.entity_id === "luli") {
      const { data: luli } = await db.from("usuarios").select("id").eq("rol", "marketing").ilike("nombre", "%Luli%").limit(1).maybeSingle();
      if (luli?.id) responsibleId = luli.id;
    }
    const { data: task, error: taskError } = await db.from("tareas").insert({
      titulo: priority.title,
      responsable_id: responsibleId,
      prioridad: priority.impact === "high" ? "alta" : priority.impact === "medium" ? "media" : "baja",
      fecha_limite: tomorrowAtSix(),
      estado: "nueva",
      notas: `${priority.reason}\n\nAcción recomendada: ${priority.recommended_action}`,
      es_ia: true,
    }).select("id").single();
    if (taskError || !task) throw new Error(taskError?.message || "No se pudo crear la tarea.");
    await db.from("marketing_daily_priorities").update({ status: "accepted", task_id: task.id, assigned_to: responsibleId, due_at: tomorrowAtSix(), updated_at: new Date().toISOString() }).eq("id", priority.id);
    return NextResponse.json({ data: { taskId: task.id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo ejecutar la acción." }, { status: 500 });
  }
}
