import { NextResponse } from "next/server";
import { getTechOpsClient, ingestTechEvent, isTechOpsRequestAuthorized } from "@/lib/observability/tech-ops";
import type { TechEventInput } from "@/types/techOps";

export const runtime = "nodejs";

function isValidInput(value: unknown): value is TechEventInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  return typeof input.fuente === "string" && input.fuente.length > 0 && typeof input.tipo === "string" && input.tipo.length > 0 && typeof input.mensaje === "string" && input.mensaje.length > 0;
}

export async function POST(request: Request) {
  if (!isTechOpsRequestAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json().catch(() => null);
  const inputs = Array.isArray(payload) ? payload : [payload];
  if (inputs.length === 0 || inputs.length > 100 || inputs.some((item) => !isValidInput(item))) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const client = getTechOpsClient();
  const results = [];
  for (const item of inputs as TechEventInput[]) results.push(await ingestTechEvent(client, item));
  return NextResponse.json({ data: { recibidos: results.length, incidentes: results.filter((item) => item.incident).length } }, { status: 202 });
}
