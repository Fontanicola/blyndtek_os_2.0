import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMetaOverview, parseMetaPeriod } from "@/lib/meta/overview";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin" && user.rol !== "marketing") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

    const data = await getMetaOverview(parseMetaPeriod(request.nextUrl.searchParams.get("period")));
    return NextResponse.json({ data, permissions: { canSync: user.rol === "admin", canAnalyze: true, canManageRecommendations: true, canEditGuardrails: user.rol === "admin", canManageConnection: user.rol === "admin", canWriteMeta: false } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cargar Meta Ads." }, { status: 500 });
  }
}
