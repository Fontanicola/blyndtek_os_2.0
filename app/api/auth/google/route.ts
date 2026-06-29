import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildGoogleCalendarAuthUrl } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const usuario = await getCurrentUser();

    if (!usuario) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.redirect(buildGoogleCalendarAuthUrl(usuario.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
