import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { canRoleAccess, getDefaultRouteForRole } from "@/lib/auth";
import type { Rol } from "@/types/auth";
import type { Database } from "@/types/supabase";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return serviceRoleKey;
}

function isEarlyReturnPublicPath(pathname: string) {
  if (pathname.startsWith("/roadmap/")) {
    return true;
  }

  if (pathname.startsWith("/_next/")) {
    return true;
  }

  if (pathname === "/favicon.ico") {
    return true;
  }

  if (pathname.startsWith("/api/auth/")) {
    return true;
  }

  return /\.[^/]+$/.test(pathname);
}

function isProtectedAppPath(pathname: string) {
  return [
    "/",
    "/outbound",
    "/inbound",
    "/clientes",
    "/cotizador",
    "/proyectos",
    "/tareas",
    "/calendario",
    "/finanzas",
    "/dashboard"
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function copySupabaseResponse(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  source.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-type") {
      return;
    }

    target.headers.set(key, value);
  });

  return target;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isEarlyReturnPublicPath(pathname)) {
    return NextResponse.next();
  }

  const { url, anonKey } = getSupabaseEnv();
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value
        }));
      },
      setAll(cookiesToSet, headers) {
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers
          }
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      }
    }
  });

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (pathname === "/login") {
    if (!session) {
      return supabaseResponse;
    }

    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    return copySupabaseResponse(supabaseResponse, redirectResponse);
  }

  if (!isProtectedAppPath(pathname)) {
    return supabaseResponse;
  }

  if (!session) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    return copySupabaseResponse(supabaseResponse, redirectResponse);
  }

  const supabaseAdmin = createClient<Database>(url, getSupabaseServiceRoleKey());
  const { data: usuarioData } = await supabaseAdmin
    .from("usuarios")
    .select("rol")
    .eq("id", session.user.id)
    .single();

  const rol = usuarioData?.rol ?? null;

  if (!rol) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    return copySupabaseResponse(supabaseResponse, redirectResponse);
  }

  const normalizedRole: Rol = rol === "admin" || rol === "miembro" ? rol : "miembro";

  if (!canRoleAccess(normalizedRole, pathname)) {
    const fallbackPath = getDefaultRouteForRole(normalizedRole);
    const redirectResponse = NextResponse.redirect(new URL(fallbackPath, request.url));
    return copySupabaseResponse(supabaseResponse, redirectResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"]
};
