import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMetaGuardrails, saveMetaGuardrails } from "@/lib/meta/intelligence";
import type { MetaGuardrails } from "@/types/meta";

export const dynamic = "force-dynamic";

function validNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function parseGuardrails(body: Record<string, unknown>): MetaGuardrails | null {
  const targetCpl = validNumber(body.targetCpl, 1, 100000);
  const targetCpql = validNumber(body.targetCpql, 1, 100000);
  const targetCashRoas = validNumber(body.targetCashRoas, 0.01, 1000);
  const minLinkCtr = validNumber(body.minLinkCtr, 0.01, 100);
  const maxFrequency = validNumber(body.maxFrequency, 0.1, 100);
  const maxAttributionGapPct = validNumber(body.maxAttributionGapPct, 0, 100);
  const minSpendForAlert = validNumber(body.minSpendForAlert, 0, 1000000);
  const staleSyncHours = validNumber(body.staleSyncHours, 1, 168);
  if ([targetCpl, targetCpql, targetCashRoas, minLinkCtr, maxFrequency, maxAttributionGapPct, minSpendForAlert, staleSyncHours].some((value) => value === null)) return null;
  return { targetCpl: targetCpl!, targetCpql: targetCpql!, targetCashRoas: targetCashRoas!, minLinkCtr: minLinkCtr!, maxFrequency: maxFrequency!, maxAttributionGapPct: maxAttributionGapPct!, minSpendForAlert: minSpendForAlert!, staleSyncHours: Math.round(staleSyncHours!) };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  if (user.rol !== "admin" && user.rol !== "marketing") return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  return NextResponse.json({ data: await getMetaGuardrails(), permissions: { canEdit: user.rol === "admin" } });
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (user.rol !== "admin") return NextResponse.json({ error: "Solo un administrador puede cambiar los objetivos." }, { status: 403 });
    const input = parseGuardrails(await request.json() as Record<string, unknown>);
    if (!input) return NextResponse.json({ error: "Los objetivos contienen valores inválidos." }, { status: 400 });
    return NextResponse.json({ data: await saveMetaGuardrails(input, user.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron guardar los objetivos." }, { status: 500 });
  }
}
