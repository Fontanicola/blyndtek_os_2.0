import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!['admin', 'marketing'].includes(user.rol)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    if (!String(body.title || "").trim() || !String(body.hypothesis || "").trim()) return NextResponse.json({ error: "Título e hipótesis son obligatorios." }, { status: 400 });
    const db = createUntypedAdminClient();
    const { data, error } = await db.from("marketing_experiments").insert({
      title: String(body.title).trim(), hypothesis: String(body.hypothesis).trim(),
      category: body.category || "creative", primary_metric: body.primaryMetric || "qualified_leads",
      target_value: body.targetValue == null || body.targetValue === "" ? null : Number(body.targetValue),
      budget_usd: Math.max(0, Number(body.budgetUsd) || 0), status: body.status || "planned",
      start_date: body.startDate || null, end_date: body.endDate || null, campaign_id: body.campaignId || null,
      owner_id: body.ownerId || user.id, variables: body.variables || {}, created_by: user.id,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el experimento." }, { status: 500 });
  }
}
