import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getMarketingIntelligenceOverview, refreshMarketingIntelligence } from "@/lib/marketing/intelligence";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorizedUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  if (!['admin', 'marketing'].includes(user.rol)) return { user: null, response: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  return { user, response: null };
}

export async function GET() {
  try {
    const auth = await authorizedUser(); if (auth.response) return auth.response;
    return NextResponse.json({ data: await getMarketingIntelligenceOverview() });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No se pudo cargar la inteligencia de marketing.";
    const missingMigration = message.includes("lead_marketing_profiles") || message.includes("marketing_intelligence_runs");
    return NextResponse.json({ error: missingMigration ? "La migración de Inteligencia de Marketing todavía no fue aplicada." : message }, { status: missingMigration ? 503 : 500 });
  }
}

export async function POST() {
  try {
    const auth = await authorizedUser(); if (auth.response || !auth.user) return auth.response;
    const result = await refreshMarketingIntelligence(auth.user.id, "manual");
    return NextResponse.json({ data: result });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "No se pudo recalcular la inteligencia de marketing." }, { status: 500 });
  }
}
