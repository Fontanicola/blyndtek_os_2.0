import { getMetaConfig } from "@/lib/meta/config";
import { getMetaEntity, getMetaGrantedPermissions, updateMetaEntity } from "@/lib/meta/client";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export type MetaExecutionMode = "simulate" | "live";

const tableByEntity = { campaign: "meta_campaigns", adset: "meta_ad_sets", ad: "meta_ads" } as const;

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
    adSetId: value.adset_id ?? null
  };
}

async function logExecution(input: {
  actionId: string; mode: MetaExecutionMode; outcome: "validated" | "blocked" | "success" | "error";
  entityType: string | null; entityId: string | null; requestPayload?: Record<string, unknown>;
  beforeState?: Record<string, unknown> | null; afterState?: Record<string, unknown> | null;
  metaRequestId?: string | null; errorMessage?: string | null; userId: string;
}) {
  await createUntypedAdminClient().from("meta_action_executions").insert({
    action_id: input.actionId, mode: input.mode, outcome: input.outcome, entity_type: input.entityType, entity_id: input.entityId,
    request_payload: input.requestPayload || {}, before_state: input.beforeState || null, after_state: input.afterState || null,
    meta_request_id: input.metaRequestId || null, error_message: input.errorMessage || null, initiated_by: input.userId
  });
}

export async function executeControlledMetaAction(actionId: string, mode: MetaExecutionMode, userId: string, confirmation?: string) {
  const db = createUntypedAdminClient();
  const { data: action, error: actionError } = await db.from("meta_action_queue").select("*").eq("id", actionId).maybeSingle();
  if (actionError) throw actionError;
  if (!action) throw new Error("Acción inexistente.");
  if (action.status !== "approved") throw new Error("La acción debe estar aprobada antes de simular o ejecutar.");

  const config = getMetaConfig();
  if (!config.configured) throw new Error("La conexión de Meta no está configurada.");
  const { data: policy, error: policyError } = await db.from("meta_execution_policy").select("*").eq("ad_account_id", config.adAccountId).maybeSingle();
  if (policyError) throw policyError;
  if (!policy) throw new Error("Falta la política de ejecución para esta cuenta.");

  const entityType = String(action.entity_type || "") as keyof typeof tableByEntity;
  const entityId = String(action.entity_id || "");
  const requestPayload = action.proposed_payload && typeof action.proposed_payload === "object" ? action.proposed_payload as Record<string, unknown> : {};
  try {
    if (action.action_type !== "pause_entity") throw new Error("Esta acción requiere trabajo humano y no está en la allowlist ejecutable.");
    if (!policy.allow_pause) throw new Error("La política de la cuenta bloquea pausas.");
    if (!(entityType in tableByEntity) || !entityId) throw new Error("La acción no identifica una entidad ejecutable.");
    if (requestPayload.status !== "PAUSED") throw new Error("La única transición habilitada es PAUSED. Reactivar está bloqueado.");

    const { data: localEntity, error: localError } = await db.from(tableByEntity[entityType]).select("*").eq("id", entityId).maybeSingle();
    if (localError) throw localError;
    if (!localEntity || localEntity.ad_account_id !== config.adAccountId) throw new Error("La entidad no pertenece a la cuenta publicitaria configurada.");

    const remoteEntity = await getMetaEntity(entityType, entityId);
    const beforeState = publicState(remoteEntity);
    const remoteAccountId = String(remoteEntity.account_id || "");
    if (remoteAccountId && remoteAccountId !== config.adAccountId.replace("act_", "")) throw new Error("Meta devolvió una entidad de otra cuenta publicitaria.");
    if (remoteEntity.status === "PAUSED") {
      if (mode === "live" && action.execution_requested_at) {
        const now = new Date().toISOString();
        const { error: reconcileError } = await db.from("meta_action_queue").update({ status: "executed", executed_at: now, executed_by: userId, before_state: beforeState, after_state: beforeState, error_message: null, updated_at: now }).eq("id", action.id).eq("status", "approved");
        if (reconcileError) throw reconcileError;
        await logExecution({ actionId, mode, outcome: "success", entityType, entityId, requestPayload: { status: "PAUSED", reconciled: true }, beforeState, afterState: beforeState, userId });
        return { success: true, reconciled: true, beforeState, afterState: beforeState };
      }
      throw new Error("La entidad ya está pausada; no se realizará una operación redundante.");
    }

    if (mode === "simulate") {
      const simulation = { valid: true, mutation: { entityId, entityType, status: "PAUSED" }, beforeState, writeAttempted: false };
      await db.from("meta_action_queue").update({ simulated_at: new Date().toISOString(), simulation_result: simulation, before_state: beforeState, updated_at: new Date().toISOString() }).eq("id", action.id);
      await logExecution({ actionId, mode, outcome: "validated", entityType, entityId, requestPayload: { status: "PAUSED" }, beforeState, userId });
      return simulation;
    }

    if (!policy.execution_enabled) throw new Error("El kill switch de la cuenta está desactivado.");
    if (policy.dry_run_only) throw new Error("La política está limitada a simulación.");
    if (!config.writeEnabled) throw new Error("El kill switch de Vercel está desactivado.");
    if (!action.simulated_at) throw new Error("La acción debe simularse correctamente antes de ejecutarse.");
    const grantedPermissions = await getMetaGrantedPermissions();
    if (!grantedPermissions.includes("ads_management")) throw new Error("El token activo no tiene ads_management.");
    const expectedConfirmation = `EJECUTAR ${String(action.id).slice(0, 8)}`;
    if (confirmation !== expectedConfirmation) throw new Error(`Confirmación inválida. Se requiere: ${expectedConfirmation}`);

    const cooldownStart = new Date(Date.now() - Number(policy.cooldown_minutes || 0) * 60_000).toISOString();
    const { count } = await db.from("meta_action_executions").select("id", { count: "exact", head: true }).eq("entity_id", entityId).eq("outcome", "success").gte("created_at", cooldownStart);
    if ((count || 0) > 0) throw new Error("La entidad está dentro del período de enfriamiento.");

    const requestTime = new Date().toISOString();
    const { error: requestError } = await db.from("meta_action_queue").update({ execution_requested_at: requestTime, updated_at: requestTime }).eq("id", action.id).eq("status", "approved");
    if (requestError) throw requestError;
    const { requestId } = await updateMetaEntity(entityId, { status: "PAUSED" });
    let afterState: Record<string, unknown>;
    let verified = true;
    try {
      const afterRemote = await getMetaEntity(entityType, entityId);
      afterState = publicState(afterRemote);
      verified = afterRemote.status === "PAUSED";
    } catch {
      afterState = { id: entityId, status: "PAUSED", verification: "pending", apiAccepted: true };
      verified = false;
    }
    const now = new Date().toISOString();
    const { error: finalizeError } = await db.from("meta_action_queue").update({ status: "executed", executed_at: now, executed_by: userId, meta_request_id: requestId, before_state: beforeState, after_state: afterState, error_message: verified ? null : "Meta aceptó la pausa; la verificación posterior quedó pendiente.", updated_at: now }).eq("id", action.id).eq("status", "approved");
    if (finalizeError) throw finalizeError;
    await logExecution({ actionId, mode, outcome: "success", entityType, entityId, requestPayload: { status: "PAUSED" }, beforeState, afterState, metaRequestId: requestId, userId });
    return { success: true, verified, beforeState, afterState, metaRequestId: requestId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la acción.";
    await logExecution({ actionId, mode, outcome: mode === "simulate" ? "blocked" : "error", entityType: action.entity_type, entityId: action.entity_id, requestPayload, errorMessage: message, userId });
    if (mode === "live") await db.from("meta_action_queue").update({ error_message: message, updated_at: new Date().toISOString() }).eq("id", action.id);
    throw error;
  }
}
