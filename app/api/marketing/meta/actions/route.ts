import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const riskBySeverity = { info: "low", warning: "medium", critical: "high" } as const;

function inferActionType(ruleKey: string) {
  if (ruleKey.includes("creative")) return ruleKey.includes("fatigue") ? "refresh_creative" : "launch_creative_test";
  if (ruleKey.includes("attribution") || ruleKey.includes("connection")) return "fix_tracking";
  if (ruleKey.includes("cpl") || ruleKey.includes("cpql") || ruleKey.includes("roas")) return "review_targeting";
  return "review_recommendation";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin" && user.rol !== "marketing") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const body = await request.json() as { recommendationId?: unknown; notes?: unknown };
    if (typeof body.recommendationId !== "string") return NextResponse.json({ error: "Falta la recomendación." }, { status: 400 });

    const db = createUntypedAdminClient();
    const { data: recommendation, error: recommendationError } = await db.from("meta_recommendations").select("*").eq("id", body.recommendationId).maybeSingle();
    if (recommendationError) throw recommendationError;
    if (!recommendation) return NextResponse.json({ error: "Recomendación inexistente." }, { status: 404 });

    const { data: existing } = await db.from("meta_action_queue").select("*").eq("recommendation_id", recommendation.id).in("status", ["draft", "pending_approval", "approved"]).maybeSingle();
    if (existing) return NextResponse.json({ data: existing, existing: true });

    const { data, error } = await db.from("meta_action_queue").insert({
      recommendation_id: recommendation.id,
      action_type: inferActionType(recommendation.rule_key),
      entity_type: recommendation.entity_type,
      entity_id: recommendation.entity_id,
      title: recommendation.title,
      rationale: recommendation.rationale,
      proposed_action: recommendation.recommended_action,
      proposed_payload: { ruleKey: recommendation.rule_key, evidence: recommendation.evidence || {} },
      risk_level: riskBySeverity[recommendation.severity as keyof typeof riskBySeverity] || "medium",
      status: "pending_approval",
      requested_by: user.id,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear la acción." }, { status: 500 });
  }
}
