import {
  createClient as createClient_supabase,
  type SupabaseClient
} from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AuthSession, Rol, Usuario } from "@/types/auth";
import type { Database } from "@/types/supabase";

const memberAllowedPrefixes = ["/proyectos", "/tareas", "/calendario"] as const;

async function fetchUsuarioById(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, rol, google_calendar_token, activo, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export function canRoleAccess(rol: Rol, pathname: string): boolean {
  if (rol === "admin") {
    return true;
  }

  return memberAllowedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function getDefaultRouteForRole(rol: Rol): string {
  return rol === "admin" ? "/dashboard" : "/proyectos";
}

export async function getSession(): Promise<AuthSession | null> {
  const supabase = createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const usuario = await fetchUsuarioById(supabase, session.user.id);

  if (!usuario) {
    return null;
  }

  return {
    user: usuario,
    accessToken: session.access_token
  };
}

export async function getCurrentUser(): Promise<Usuario | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return null;
    }

    const supabaseAdmin = createClient_supabase<Database>(
      normalizeSupabaseUrl(supabaseUrl),
      serviceRoleKey
    );
    const { data, error } = await supabaseAdmin
      .from("usuarios")
      .select("id, nombre, email, rol, google_calendar_token, activo, created_at")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function hasRole(rol: Rol): Promise<boolean> {
  const usuario = await getCurrentUser();

  if (!usuario) {
    return false;
  }

  return usuario.rol === rol;
}

export async function canAccess(pathname: string): Promise<boolean> {
  const usuario = await getCurrentUser();

  if (!usuario) {
    return false;
  }

  return canRoleAccess(usuario.rol, pathname);
}
