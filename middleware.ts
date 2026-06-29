import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildSupabaseRestUrl, normalizeSupabaseUrl } from "@/lib/supabase/config";
import type { Rol } from "@/types/auth";
import type { Database } from "@/types/supabase";

const memberAllowedPrefixes = ["/proyectos", "/tareas", "/calendario"] as const;

function canRoleAccess(rol: Rol, pathname: string): boolean {
  if (rol === "admin") {
    return true;
  }

  return memberAllowedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getDefaultRouteForRole(rol: Rol): string {
  return rol === "admin" ? "/dashboard" : "/proyectos";
}

function getSupabaseEnv() {
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

async function fetchUserRole(url: string, serviceRoleKey: string, userId: string): Promise<Rol | null> {
  const response = await fetch(
    buildSupabaseRestUrl(url, `/usuarios?select=rol&id=eq.${encodeURIComponent(userId)}&limit=1`),
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as Array<{ rol?: string }>;
  const rol = payload[0]?.rol;

  return rol === "admin" || rol === "miembro" ? rol : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
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

    const rol = await fetchUserRole(url, getSupabaseServiceRoleKey(), session.user.id);

    if (!rol) {
      const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
      return copySupabaseResponse(supabaseResponse, redirectResponse);
    }

    if (!canRoleAccess(rol, pathname)) {
      const fallbackPath = getDefaultRouteForRole(rol);
      const redirectResponse = NextResponse.redirect(new URL(fallbackPath, request.url));
      return copySupabaseResponse(supabaseResponse, redirectResponse);
    }

    return supabaseResponse;
  } catch {
    if (pathname === "/login") {
      return NextResponse.next();
    }

    if (isProtectedAppPath(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"]
};
