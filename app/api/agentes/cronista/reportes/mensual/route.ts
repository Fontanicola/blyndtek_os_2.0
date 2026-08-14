import { NextRequest } from "next/server";
import { handleCronistaReporte } from "@/lib/agentes/cronista-reporte-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return handleCronistaReporte(request, "mensual");
}
