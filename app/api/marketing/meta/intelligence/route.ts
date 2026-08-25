import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateMetaRecommendations } from "@/lib/meta/intelligence";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin" && user.rol !== "marketing") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    return NextResponse.json({ data: await generateMetaRecommendations() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo analizar Meta Ads." }, { status: 500 });
  }
}
