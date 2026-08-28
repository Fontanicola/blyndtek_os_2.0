import { NextRequest, NextResponse } from "next/server";
import { MAPA_CAMPAIGN_KEY, MAPA_CTA_DESTINATION } from "@/lib/marketing/mapa-fugas";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: { token: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const token = params.token.trim().slice(0, 80);
  if (!token) return NextResponse.redirect(MAPA_CTA_DESTINATION);
  const db = createUntypedAdminClient();
  const { data: result } = await db.from("marketing_touchpoints")
    .select("lead_id,metadata").eq("source_key", `instagram:mapa-result:${token}`).maybeSingle();

  if (result) {
    const metadata = result.metadata as Record<string, unknown>;
    const calculated = metadata.result && typeof metadata.result === "object" ? metadata.result as Record<string, unknown> : {};
    await db.from("marketing_touchpoints").upsert({
      source_key: `instagram:mapa-cta:${token}`,
      lead_id: result.lead_id,
      channel: "instagram",
      event_name: "diagnostic_cta_clicked",
      campaign_id: MAPA_CAMPAIGN_KEY,
      session_id: token,
      occurred_at: new Date().toISOString(),
      metadata: { resource: "mapa_fugas_interactivo", severity: calculated.severidad || null }
    }, { onConflict: "source_key" });
  }

  return NextResponse.redirect(MAPA_CTA_DESTINATION);
}
