import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const riskBySeverity = {
  info: "low",
  warning: "medium",
  critical: "high",
} as const;

function inferActionType(ruleKey: string) {
  if (ruleKey.includes("creative"))
    return ruleKey.includes("fatigue")
      ? "refresh_creative"
      : "launch_creative_test";
  if (ruleKey.includes("attribution") || ruleKey.includes("connection"))
    return "fix_tracking";
  if (
    ruleKey.includes("cpl") ||
    ruleKey.includes("cpql") ||
    ruleKey.includes("roas")
  )
    return "review_targeting";
  return "review_recommendation";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin" && user.rol !== "marketing")
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const body = (await request.json()) as {
      recommendationId?: unknown;
      notes?: unknown;
      entityType?: unknown;
      entityId?: unknown;
      title?: unknown;
      operation?: unknown;
      name?: unknown;
      dailyBudgetUsd?: unknown;
    };

    const db = createUntypedAdminClient();
    if (typeof body.recommendationId !== "string") {
      if (
        (body.entityType !== "campaign" &&
          body.entityType !== "adset" &&
          body.entityType !== "ad") ||
        typeof body.entityId !== "string"
      )
        return NextResponse.json(
          { error: "Falta una recomendación o entidad válida." },
          { status: 400 },
        );
      const table =
        body.entityType === "campaign"
          ? "meta_campaigns"
          : body.entityType === "adset"
            ? "meta_ad_sets"
            : "meta_ads";
      const { data: entity, error: entityError } = await db
        .from(table)
        .select("id,name,ad_account_id,status,effective_status")
        .eq("id", body.entityId)
        .maybeSingle();
      if (entityError) throw entityError;
      if (!entity)
        return NextResponse.json(
          { error: "La entidad no existe en el cache sincronizado." },
          { status: 404 },
        );
      const operation =
        typeof body.operation === "string" ? body.operation : "pause";
      let actionType = "pause_entity";
      let proposedPayload: Record<string, unknown> = { status: "PAUSED" };
      let proposedAction = `Cambiar el estado de ${entity.name} a PAUSED.`;
      let defaultTitle = `Pausar ${entity.name}`;
      let riskLevel = body.entityType === "campaign" ? "high" : "medium";
      if (operation === "resume") {
        actionType = "resume_entity";
        proposedPayload = { status: "ACTIVE" };
        proposedAction = `Cambiar el estado de ${entity.name} a ACTIVE.`;
        defaultTitle = `Reactivar ${entity.name}`;
        riskLevel = "high";
      } else if (operation === "rename") {
        const name =
          typeof body.name === "string" ? body.name.trim().slice(0, 180) : "";
        if (name.length < 3)
          return NextResponse.json(
            { error: "El nuevo nombre debe tener al menos 3 caracteres." },
            { status: 400 },
          );
        actionType = "rename_entity";
        proposedPayload = { name };
        proposedAction = `Renombrar ${entity.name} como “${name}”.`;
        defaultTitle = `Renombrar ${entity.name}`;
        riskLevel = "low";
      } else if (operation === "budget") {
        const dailyBudgetUsd = Number(body.dailyBudgetUsd);
        if (!Number.isFinite(dailyBudgetUsd) || dailyBudgetUsd <= 0)
          return NextResponse.json(
            { error: "Ingresá un presupuesto diario válido." },
            { status: 400 },
          );
        if (body.entityType === "ad")
          return NextResponse.json(
            {
              error:
                "Los anuncios no tienen presupuesto propio; ajustá campaña o conjunto.",
            },
            { status: 400 },
          );
        actionType = "adjust_budget";
        proposedPayload = { dailyBudgetUsd: Number(dailyBudgetUsd.toFixed(2)) };
        proposedAction = `Establecer el presupuesto diario de ${entity.name} en USD ${dailyBudgetUsd.toFixed(2)}.`;
        defaultTitle = `Ajustar presupuesto de ${entity.name}`;
        riskLevel = "high";
      } else if (operation !== "pause")
        return NextResponse.json(
          { error: "Operación no soportada." },
          { status: 400 },
        );
      const { data, error } = await db
        .from("meta_action_queue")
        .insert({
          action_type: actionType,
          entity_type: body.entityType,
          entity_id: entity.id,
          title:
            typeof body.title === "string"
              ? body.title.slice(0, 180)
              : defaultTitle,
          rationale:
            "Propuesta manual creada desde el Centro de Control. Requiere aprobación, simulación y confirmación antes de ejecutarse.",
          proposed_action: proposedAction,
          proposed_payload: proposedPayload,
          risk_level: riskLevel,
          status: "pending_approval",
          requested_by: user.id,
          notes:
            typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json({ data }, { status: 201 });
    }

    const { data: recommendation, error: recommendationError } = await db
      .from("meta_recommendations")
      .select("*")
      .eq("id", body.recommendationId)
      .maybeSingle();
    if (recommendationError) throw recommendationError;
    if (!recommendation)
      return NextResponse.json(
        { error: "Recomendación inexistente." },
        { status: 404 },
      );

    const { data: existing } = await db
      .from("meta_action_queue")
      .select("*")
      .eq("recommendation_id", recommendation.id)
      .in("status", ["draft", "pending_approval", "approved"])
      .maybeSingle();
    if (existing) return NextResponse.json({ data: existing, existing: true });

    const { data, error } = await db
      .from("meta_action_queue")
      .insert({
        recommendation_id: recommendation.id,
        action_type: inferActionType(recommendation.rule_key),
        entity_type: recommendation.entity_type,
        entity_id: recommendation.entity_id,
        title: recommendation.title,
        rationale: recommendation.rationale,
        proposed_action: recommendation.recommended_action,
        proposed_payload: {
          ruleKey: recommendation.rule_key,
          evidence: recommendation.evidence || {},
        },
        risk_level:
          riskBySeverity[
            recommendation.severity as keyof typeof riskBySeverity
          ] || "medium",
        status: "pending_approval",
        requested_by: user.id,
        notes:
          typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la acción.",
      },
      { status: 500 },
    );
  }
}
