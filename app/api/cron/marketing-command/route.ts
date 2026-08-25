import { NextRequest, NextResponse } from "next/server";

import { persistDailyMarketingPriorities } from "@/lib/marketing/command-center";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function localDate(offsetDays = 0) {
  const local = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  local.setDate(local.getDate() + offsetDays);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const db = createUntypedAdminClient();
    const overview = await persistDailyMarketingPriorities("30d");
    const luli = overview.contentOperations.luli;
    const createdTasks: string[] = [];

    if (luli.id && luli.automationEnabled && luli.openTasks < 3) {
      const capacity = Math.max(0, Math.min(3 - luli.openTasks, 3));
      const candidates = overview.priorities
        .filter((priority) => !priority.taskId && ["content", "creative", "team"].includes(priority.source))
        .slice(0, capacity);
      for (const priority of candidates) {
        const dueAt = `${localDate(1)}T18:00:00-03:00`;
        const { data: existing } = await db.from("tareas").select("id").eq("titulo", priority.title).eq("responsable_id", luli.id).gte("fecha_limite", `${localDate(1)}T00:00:00-03:00`).lte("fecha_limite", `${localDate(1)}T23:59:59-03:00`).maybeSingle();
        if (existing?.id) continue;
        const { data: task, error } = await db.from("tareas").insert({ titulo: priority.title, responsable_id: luli.id, prioridad: priority.impact === "high" ? "alta" : "media", fecha_limite: dueAt, estado: "nueva", notas: `${priority.reason}\n\nAcción esperada: ${priority.action}\n\nCriterio: entregar una pieza revisable y vinculada al calendario o a una necesidad real de campaña.`, es_ia: true }).select("id").single();
        if (error || !task) continue;
        createdTasks.push(task.id);
        if (priority.id) await db.from("marketing_daily_priorities").update({ status: "accepted", assigned_to: luli.id, task_id: task.id, due_at: dueAt, updated_at: new Date().toISOString() }).eq("id", priority.id);
      }
    }

    const localNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
    let weeklyReportCreated = false;
    if (localNow.getDay() === 1) {
      const weekStart = localDate(0);
      const wins = [overview.actuals.qualifiedLeads ? `${overview.actuals.qualifiedLeads} leads calificados en el período.` : null, overview.actuals.wonLeads ? `${overview.actuals.wonLeads} ventas atribuibles.` : null, overview.dataHealth.score >= 80 ? `Salud de datos en ${overview.dataHealth.score}/100.` : null].filter(Boolean);
      const risks = overview.dataHealth.checks.filter((check) => check.status !== "healthy").map((check) => `${check.label}: ${check.detail}`);
      const learnings = overview.creativeSignals.slice(0, 3).map((creative) => `${creative.name}: CTR ${creative.ctr.toFixed(2)}%, ${creative.recommendation}`);
      const nextActions = overview.priorities.slice(0, 5).map((priority) => priority.action);
      const { error } = await db.from("marketing_weekly_reports").upsert({ week_start: weekStart, summary: `Marketing cerró con USD ${overview.actuals.spend.toFixed(0)} invertidos, ${overview.actuals.leads} leads CRM y una salud de datos de ${overview.dataHealth.score}/100.`, wins, risks, learnings, next_actions: nextActions, metrics: overview.actuals }, { onConflict: "week_start" });
      weeklyReportCreated = !error;
    }

    return NextResponse.json({ ok: true, priorities: overview.priorities.length, luliTasksCreated: createdTasks.length, weeklyReportCreated, generatedAt: overview.generatedAt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo ejecutar Marketing Command." }, { status: 500 });
  }
}
