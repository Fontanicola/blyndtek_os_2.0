import { getMetaConfig } from "@/lib/meta/config";
import {
  getMetaEntity,
  getMetaGrantedPermissions,
  updateMetaEntity,
} from "@/lib/meta/client";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export type MetaExecutionMode = "simulate" | "live";
const tableByEntity = {
  campaign: "meta_campaigns",
  adset: "meta_ad_sets",
  ad: "meta_ads",
} as const;
const executableActions = new Set([
  "pause_entity",
  "resume_entity",
  "rename_entity",
  "adjust_budget",
]);

function publicState(value: Record<string, unknown>) {
  return {
    id: value.id ?? null,
    name: value.name ?? null,
    status: value.status ?? null,
    effectiveStatus: value.effective_status ?? null,
    dailyBudget: value.daily_budget ?? null,
    lifetimeBudget: value.lifetime_budget ?? null,
    accountId: value.account_id ?? null,
    campaignId: value.campaign_id ?? null,
    adSetId: value.adset_id ?? null,
  };
}

async function logExecution(input: {
  actionId: string;
  mode: MetaExecutionMode;
  outcome: "validated" | "blocked" | "success" | "error";
  entityType: string | null;
  entityId: string | null;
  requestPayload?: Record<string, unknown>;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metaRequestId?: string | null;
  errorMessage?: string | null;
  userId: string;
}) {
  await createUntypedAdminClient()
    .from("meta_action_executions")
    .insert({
      action_id: input.actionId,
      mode: input.mode,
      outcome: input.outcome,
      entity_type: input.entityType,
      entity_id: input.entityId,
      request_payload: input.requestPayload || {},
      before_state: input.beforeState || null,
      after_state: input.afterState || null,
      meta_request_id: input.metaRequestId || null,
      error_message: input.errorMessage || null,
      initiated_by: input.userId,
    });
}

type MetaMutation = {
  api: Record<string, string | number>;
  expected: { field: string; value: string | number };
  public: Record<string, unknown>;
};

function mutationFor(
  action: Record<string, unknown>,
  remote: Record<string, unknown>,
  policy: Record<string, unknown>,
): MetaMutation {
  const actionType = String(action.action_type || "");
  const payload =
    action.proposed_payload && typeof action.proposed_payload === "object"
      ? (action.proposed_payload as Record<string, unknown>)
      : {};
  const config = getMetaConfig();
  if (actionType === "pause_entity") {
    if (!policy.allow_pause)
      throw new Error("La política de la cuenta bloquea pausas.");
    if (remote.status === "PAUSED")
      throw new Error("La entidad ya está pausada.");
    return {
      api: { status: "PAUSED" },
      expected: { field: "status", value: "PAUSED" },
      public: { status: "PAUSED" },
    };
  }
  if (actionType === "resume_entity") {
    if (!policy.allow_resume)
      throw new Error("La política de la cuenta bloquea reactivaciones.");
    if (remote.status === "ACTIVE")
      throw new Error("La entidad ya está activa.");
    return {
      api: { status: "ACTIVE" },
      expected: { field: "status", value: "ACTIVE" },
      public: { status: "ACTIVE" },
    };
  }
  if (actionType === "rename_entity") {
    const name =
      typeof payload.name === "string" ? payload.name.trim().slice(0, 180) : "";
    if (name.length < 3) throw new Error("El nombre propuesto no es válido.");
    if (remote.name === name)
      throw new Error("La entidad ya tiene ese nombre.");
    return {
      api: { name },
      expected: { field: "name", value: name },
      public: { name },
    };
  }
  if (actionType === "adjust_budget") {
    if (!policy.allow_budget_changes)
      throw new Error(
        "La política de la cuenta bloquea cambios de presupuesto.",
      );
    if (action.entity_type === "ad")
      throw new Error("Un anuncio no tiene presupuesto propio.");
    const requestedUsd = Number(payload.dailyBudgetUsd);
    if (!Number.isFinite(requestedUsd) || requestedUsd <= 0)
      throw new Error("El presupuesto propuesto no es válido.");
    const maxUsd = Number(policy.max_daily_budget_usd || 0);
    if (maxUsd > 0 && requestedUsd > maxUsd)
      throw new Error(`El presupuesto supera el máximo de USD ${maxUsd}.`);
    const currencyToUsd = config.configured ? config.accountCurrencyToUsd : 1;
    const currentMinor = Number(remote.daily_budget || 0);
    const currentUsd =
      currentMinor > 0 ? (currentMinor / 100) * currencyToUsd : 0;
    const maxIncreasePct = Number(policy.max_budget_increase_pct || 0);
    if (
      currentUsd > 0 &&
      requestedUsd > currentUsd * (1 + maxIncreasePct / 100)
    )
      throw new Error(`El aumento supera el límite de ${maxIncreasePct}%.`);
    const dailyBudget = Math.round((requestedUsd / currencyToUsd) * 100);
    if (dailyBudget < 100)
      throw new Error("El presupuesto queda por debajo del mínimo técnico.");
    if (currentMinor === dailyBudget)
      throw new Error("La entidad ya tiene ese presupuesto.");
    return {
      api: { daily_budget: dailyBudget },
      expected: { field: "daily_budget", value: String(dailyBudget) },
      public: { dailyBudgetUsd: requestedUsd, dailyBudgetMinor: dailyBudget },
    };
  }
  throw new Error("Esta acción no está en la allowlist ejecutable.");
}

export async function executeControlledMetaAction(
  actionId: string,
  mode: MetaExecutionMode,
  userId: string,
  confirmation?: string,
) {
  const db = createUntypedAdminClient();
  const { data: action, error: actionError } = await db
    .from("meta_action_queue")
    .select("*")
    .eq("id", actionId)
    .maybeSingle();
  if (actionError) throw actionError;
  if (!action) throw new Error("Acción inexistente.");
  if (action.status !== "approved")
    throw new Error(
      "La acción debe estar aprobada antes de simular o ejecutar.",
    );
  if (!executableActions.has(String(action.action_type)))
    throw new Error(
      "Esta acción requiere trabajo humano y no está en la allowlist ejecutable.",
    );

  const config = getMetaConfig();
  if (!config.configured)
    throw new Error("La conexión de Meta no está configurada.");
  const { data: policy, error: policyError } = await db
    .from("meta_execution_policy")
    .select("*")
    .eq("ad_account_id", config.adAccountId)
    .maybeSingle();
  if (policyError) throw policyError;
  if (!policy)
    throw new Error("Falta la política de ejecución para esta cuenta.");
  const entityType = String(
    action.entity_type || "",
  ) as keyof typeof tableByEntity;
  const entityId = String(action.entity_id || "");
  const proposedPayload =
    action.proposed_payload && typeof action.proposed_payload === "object"
      ? (action.proposed_payload as Record<string, unknown>)
      : {};
  try {
    if (!(entityType in tableByEntity) || !entityId)
      throw new Error("La acción no identifica una entidad ejecutable.");
    const { data: localEntity, error: localError } = await db
      .from(tableByEntity[entityType])
      .select("*")
      .eq("id", entityId)
      .maybeSingle();
    if (localError) throw localError;
    if (!localEntity || localEntity.ad_account_id !== config.adAccountId)
      throw new Error(
        "La entidad no pertenece a la cuenta publicitaria configurada.",
      );
    const remoteEntity = await getMetaEntity(entityType, entityId);
    const beforeState = publicState(remoteEntity);
    const remoteAccountId = String(remoteEntity.account_id || "");
    if (
      remoteAccountId &&
      remoteAccountId !== config.adAccountId.replace("act_", "")
    )
      throw new Error("Meta devolvió una entidad de otra cuenta publicitaria.");
    const mutation = mutationFor(action, remoteEntity, policy);
    if (mode === "simulate") {
      const simulation = {
        valid: true,
        actionType: action.action_type,
        mutation: { entityId, entityType, ...mutation.public },
        beforeState,
        policy: {
          maxBudgetIncreasePct: policy.max_budget_increase_pct,
          maxDailyBudgetUsd: policy.max_daily_budget_usd,
        },
        writeAttempted: false,
      };
      await db
        .from("meta_action_queue")
        .update({
          simulated_at: new Date().toISOString(),
          simulation_result: simulation,
          before_state: beforeState,
          updated_at: new Date().toISOString(),
        })
        .eq("id", action.id);
      await logExecution({
        actionId,
        mode,
        outcome: "validated",
        entityType,
        entityId,
        requestPayload: mutation.public,
        beforeState,
        userId,
      });
      return simulation;
    }
    if (!policy.execution_enabled)
      throw new Error("El kill switch de la cuenta está desactivado.");
    if (policy.dry_run_only)
      throw new Error("La política está limitada a simulación.");
    if (!config.writeEnabled)
      throw new Error("El kill switch de Vercel está desactivado.");
    if (!action.simulated_at)
      throw new Error(
        "La acción debe simularse correctamente antes de ejecutarse.",
      );
    const grantedPermissions = await getMetaGrantedPermissions();
    if (!grantedPermissions.includes("ads_management"))
      throw new Error("El token activo no tiene ads_management.");
    const expectedConfirmation = `EJECUTAR ${String(action.id).slice(0, 8)}`;
    if (confirmation !== expectedConfirmation)
      throw new Error(
        `Confirmación inválida. Se requiere: ${expectedConfirmation}`,
      );
    const cooldownStart = new Date(
      Date.now() - Number(policy.cooldown_minutes || 0) * 60_000,
    ).toISOString();
    const { count } = await db
      .from("meta_action_executions")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", entityId)
      .eq("outcome", "success")
      .gte("created_at", cooldownStart);
    if ((count || 0) > 0)
      throw new Error("La entidad está dentro del período de enfriamiento.");
    const requestTime = new Date().toISOString();
    const { error: requestError } = await db
      .from("meta_action_queue")
      .update({ execution_requested_at: requestTime, updated_at: requestTime })
      .eq("id", action.id)
      .eq("status", "approved");
    if (requestError) throw requestError;
    const { requestId } = await updateMetaEntity(entityId, mutation.api);
    let afterState: Record<string, unknown>;
    let verified = true;
    try {
      const afterRemote = await getMetaEntity(entityType, entityId);
      afterState = publicState(afterRemote);
      verified =
        String(afterRemote[mutation.expected.field]) ===
        String(mutation.expected.value);
    } catch {
      afterState = {
        id: entityId,
        ...mutation.public,
        verification: "pending",
        apiAccepted: true,
      };
      verified = false;
    }
    const now = new Date().toISOString();
    const { error: finalizeError } = await db
      .from("meta_action_queue")
      .update({
        status: "executed",
        executed_at: now,
        executed_by: userId,
        meta_request_id: requestId,
        before_state: beforeState,
        after_state: afterState,
        error_message: verified
          ? null
          : "Meta aceptó el cambio; la verificación posterior quedó pendiente.",
        updated_at: now,
      })
      .eq("id", action.id)
      .eq("status", "approved");
    if (finalizeError) throw finalizeError;
    await logExecution({
      actionId,
      mode,
      outcome: "success",
      entityType,
      entityId,
      requestPayload: mutation.public,
      beforeState,
      afterState,
      metaRequestId: requestId,
      userId,
    });
    return {
      success: true,
      verified,
      beforeState,
      afterState,
      metaRequestId: requestId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la acción.";
    await logExecution({
      actionId,
      mode,
      outcome: mode === "simulate" ? "blocked" : "error",
      entityType: action.entity_type,
      entityId: action.entity_id,
      requestPayload: proposedPayload,
      errorMessage: message,
      userId,
    });
    if (mode === "live")
      await db
        .from("meta_action_queue")
        .update({
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", action.id);
    throw error;
  }
}
