import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/types/supabase";

function getAnonEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url: normalizeSupabaseUrl(url), anonKey };
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      password_actual?: string;
      password_nueva?: string;
    };

    const passwordActual = body.password_actual?.trim() ?? "";
    const passwordNueva = body.password_nueva?.trim() ?? "";

    if (!passwordActual || !passwordNueva) {
      return NextResponse.json({ error: "Completa ambas contraseñas." }, { status: 400 });
    }

    if (passwordNueva.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const { url, anonKey } = getAnonEnv();
    const supabase = createSupabaseClient<Database>(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: passwordActual
    });

    if (signInError) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta o la sesión necesita reautenticación." },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordNueva
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "No se pudo cambiar la contraseña." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
