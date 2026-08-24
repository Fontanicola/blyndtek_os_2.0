import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMetaConfig } from "@/lib/meta/config";
import { getMetaGrantedPermissions } from "@/lib/meta/client";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const config = getMetaConfig();
    if (!config.configured) return NextResponse.json({ error: "Meta no está configurado." }, { status: 409 });
    const body = await request.json() as { executionEnabled?: unknown; dryRunOnly?: unknown; allowPause?: unknown; cooldownMinutes?: unknown };
    if (body.executionEnabled === true && body.dryRunOnly === false) {
      const grantedPermissions = await getMetaGrantedPermissions();
      if (!grantedPermissions.includes("ads_management")) return NextResponse.json({ error: "El token no tiene ads_management." }, { status: 409 });
    }
    const update = {
      execution_enabled: body.executionEnabled === true,
      dry_run_only: body.dryRunOnly !== false,
      allow_pause: body.allowPause !== false,
      allow_resume: false,
      allow_budget_changes: false,
      cooldown_minutes: Math.min(1440, Math.max(0, Number(body.cooldownMinutes) || 30)),
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await createUntypedAdminClient().from("meta_execution_policy").update(update).eq("ad_account_id", config.adAccountId).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la política." }, { status: 500 });
  }
}
