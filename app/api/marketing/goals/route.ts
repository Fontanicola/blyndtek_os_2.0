import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin") return NextResponse.json({ error: "Sólo un administrador puede cambiar objetivos." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const periodMonth = String(body.periodMonth || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-01$/.test(periodMonth)) return NextResponse.json({ error: "Mes inválido." }, { status: 400 });
    const number = (key: string, nullable = false) => body[key] == null || body[key] === "" ? (nullable ? null : 0) : Math.max(0, Number(body[key]) || 0);
    const payload = {
      period_month: periodMonth,
      budget_usd: number("budgetUsd"),
      leads_target: number("leadsTarget"),
      qualified_leads_target: number("qualifiedLeadsTarget"),
      won_leads_target: number("wonLeadsTarget"),
      revenue_target_usd: number("revenueTargetUsd"),
      target_cpl: number("targetCpl", true),
      target_cpql: number("targetCpql", true),
      target_cac: number("targetCac", true),
      target_cash_roas: number("targetCashRoas", true),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
    const db = createUntypedAdminClient();
    const { data, error } = await db.from("marketing_goals").upsert({ ...payload, created_by: user.id }, { onConflict: "period_month" }).select("id").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron guardar los objetivos." }, { status: 500 });
  }
}
