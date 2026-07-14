import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type PasskeyPayload = {
  passkey_id?: string;
  nombre_dispositivo?: string;
};

function parsePasskeyPayload(body: unknown): PasskeyPayload {
  if (!body || typeof body !== "object") {
    return {};
  }

  return body as PasskeyPayload;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("passkeys")
      .select("id, usuario_id, passkey_id, nombre_dispositivo, created_at")
      .eq("usuario_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const payload = parsePasskeyPayload(await request.json().catch(() => null));
    const passkeyId = payload.passkey_id?.trim() ?? "";
    const nombreDispositivo = payload.nombre_dispositivo?.trim() ?? "";

    if (!passkeyId || !nombreDispositivo) {
      return NextResponse.json(
        { error: "passkey_id y nombre_dispositivo son obligatorios." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("passkeys")
      .select("id")
      .eq("usuario_id", currentUser.id)
      .eq("passkey_id", passkeyId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    if (existing?.id) {
      const { data, error } = await supabase
        .from("passkeys")
        .update({ nombre_dispositivo: nombreDispositivo })
        .eq("id", existing.id)
        .select("id, usuario_id, passkey_id, nombre_dispositivo, created_at")
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message ?? "No se pudo actualizar la passkey." },
          { status: 400 }
        );
      }

      return NextResponse.json({ data });
    }

    const { data, error } = await supabase
      .from("passkeys")
      .insert({
        usuario_id: currentUser.id,
        passkey_id: passkeyId,
        nombre_dispositivo: nombreDispositivo
      })
      .select("id, usuario_id, passkey_id, nombre_dispositivo, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo guardar la passkey." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const payload = parsePasskeyPayload(await request.json().catch(() => null));
    const passkeyId = payload.passkey_id?.trim() ?? "";

    if (!passkeyId) {
      return NextResponse.json({ error: "passkey_id es obligatorio." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("passkeys")
      .delete()
      .eq("usuario_id", currentUser.id)
      .eq("passkey_id", passkeyId)
      .select("id, usuario_id, passkey_id, nombre_dispositivo, created_at")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "No se pudo eliminar la passkey." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
