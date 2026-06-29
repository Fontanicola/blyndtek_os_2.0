import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptGoogleToken, exchangeGoogleCode } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/calendario?google=error", request.url));
    }

    const usuario = await getCurrentUser();

    if (!usuario) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (state && state !== usuario.id) {
      return NextResponse.redirect(new URL("/calendario?google=state_error", request.url));
    }

    const token = await exchangeGoogleCode(code);
    const encryptedToken = encryptGoogleToken(token);
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("usuarios")
      .update({ google_calendar_token: encryptedToken })
      .eq("id", usuario.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.redirect(new URL("/calendario?google=connected", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
