import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildGoogleCalendarAuthUrl } from "@/lib/google-calendar";
import { logServerError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const usuario = await getCurrentUser();

    if (!usuario) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.redirect(buildGoogleCalendarAuthUrl(usuario.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    logServerError("google.oauth.start", error);
    const reason = message.startsWith("Missing environment variable:") ? "config" : "oauth";
    return NextResponse.redirect(new URL(`/calendario?google=error&reason=${reason}`, request.url));
  }
}
