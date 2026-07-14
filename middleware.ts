import { NextResponse, type NextRequest } from "next/server";

type Rol = "admin" | "miembro" | "comercial";

const roleAllowedPrefixes: Record<Rol, readonly string[]> = {
  admin: ["/"],
  miembro: ["/proyectos", "/tareas", "/calendario"],
  comercial: [
    "/mi-panel",
    "/leads",
    "/outbound",
    "/clientes",
    "/cotizador",
    "/tareas",
    "/calendario",
    "/notas",
    "/wiki",
    "/archivos",
    "/perfil"
  ]
};

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

function canRoleAccess(rol: Rol, pathname: string): boolean {
  if (rol === "admin") {
    return true;
  }

  return (roleAllowedPrefixes[rol] ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getDefaultRouteForRole(rol: Rol): string {
  if (rol === "admin") {
    return "/dashboard";
  }

  if (rol === "comercial") {
    return "/mi-panel";
  }

  return "/proyectos";
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!anonKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    url: normalizeSupabaseUrl(url),
    anonKey,
    serviceRoleKey
  };
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
    "/leads",
    "/outbound",
    "/clientes",
    "/cotizador",
    "/mi-panel",
    "/proyectos",
    "/tareas",
    "/calendario",
    "/notas",
    "/wiki",
    "/finanzas",
    "/dashboard",
    "/archivos",
    "/saas",
    "/perfil",
    "/equipo-comercial"
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildSupabaseRestUrl(url: string, path: string) {
  const normalizedBaseUrl = url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}/rest/v1${normalizedPath}`;
}

function extractAccessTokenFromCookies(request: NextRequest) {
  const { url } = getSupabaseEnv();
  const projectRef = new URL(url).hostname.split(".")[0];
  const baseName = `sb-${projectRef}-auth-token`;
  const cookies = request.cookies.getAll();

  const decodeCookieValue = (rawValue: string) => {
    if (rawValue.startsWith("base64-")) {
      const base64Part = rawValue.slice("base64-".length);
      try {
        return atob(base64Part);
      } catch {
        return rawValue;
      }
    }

    return rawValue;
  };

  const parseCookieValue = (rawValue: string) => {
    const decodedValue = decodeCookieValue(rawValue);

    try {
      const parsed = JSON.parse(decodedValue) as
        | { access_token?: string }
        | Array<{ access_token?: string }>
        | string;

      if (typeof parsed === "string") {
        return parsed;
      }

      if (Array.isArray(parsed)) {
        return parsed[0]?.access_token ?? null;
      }

      return parsed.access_token ?? null;
    } catch {
      return decodedValue || null;
    }
  };

  const exactCookie = cookies.find((cookie) => cookie.name === baseName);
  if (exactCookie) {
    const token = parseCookieValue(exactCookie.value);
    if (token) {
      return token;
    }
  }

  const chunkCookies = cookies
    .filter((cookie) => cookie.name.startsWith(`${baseName}.`))
    .sort((first, second) => {
      const firstIndex = Number(first.name.split(".").pop() ?? 0);
      const secondIndex = Number(second.name.split(".").pop() ?? 0);
      return firstIndex - secondIndex;
    });

  if (chunkCookies.length > 0) {
    const combinedValue = chunkCookies.map((cookie) => cookie.value).join("");
    const token = parseCookieValue(combinedValue);
    if (token) {
      return token;
    }
  }

  return null;
}

function getSupabaseAuthCookieNames(request: NextRequest) {
  const { url } = getSupabaseEnv();
  const projectRef = new URL(url).hostname.split(".")[0];
  const baseName = `sb-${projectRef}-auth-token`;

  return request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith(baseName))
    .map((cookie) => cookie.name);
}

function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest) {
  for (const cookieName of getSupabaseAuthCookieNames(request)) {
    response.cookies.delete(cookieName);
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearSupabaseAuthCookies(response, request);

  return response;
}

function nextResponseWithAuthCookieCleanup(request: NextRequest) {
  const response = NextResponse.next();
  clearSupabaseAuthCookies(response, request);

  return response;
}

async function fetchAuthUser(url: string, anonKey: string, accessToken: string) {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { id?: string } | null;
  return payload?.id ? payload : null;
}

async function getRolUsuario(url: string, serviceKey: string, userId: string): Promise<Rol | null> {
  const response = await fetch(
    buildSupabaseRestUrl(url, `/usuarios?select=rol&id=eq.${encodeURIComponent(userId)}&limit=1`),
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Array<{ rol?: string }>;
  const rol = data?.[0]?.rol;

  return rol === "admin" || rol === "miembro" || rol === "comercial" ? rol : null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    if (isEarlyReturnPublicPath(pathname)) {
      return NextResponse.next();
    }

    if (pathname !== "/login" && !isProtectedAppPath(pathname)) {
      return NextResponse.next();
    }

    const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
    const accessToken = extractAccessTokenFromCookies(request);

    if (pathname === "/login" && !accessToken) {
      return NextResponse.next();
    }

    if (!accessToken) {
      if (pathname === "/login") {
        return NextResponse.next();
      }

      return redirectToLogin(request);
    }

    const authUser = await fetchAuthUser(url, anonKey, accessToken);

    if (!authUser?.id) {
      if (pathname === "/login") {
        return nextResponseWithAuthCookieCleanup(request);
      }

      return redirectToLogin(request);
    }

    const rol = await getRolUsuario(url, serviceRoleKey, authUser.id);

    if (!rol) {
      if (pathname === "/login") {
        return nextResponseWithAuthCookieCleanup(request);
      }

      return redirectToLogin(request);
    }

    if (pathname === "/login") {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(rol), request.url));
    }

    if (!canRoleAccess(rol, pathname)) {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(rol), request.url));
    }

    return NextResponse.next();
  } catch {
    if (pathname === "/login") {
      return nextResponseWithAuthCookieCleanup(request);
    }

    if (isProtectedAppPath(pathname)) {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"]
};
