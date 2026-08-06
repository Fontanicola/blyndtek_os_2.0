# Blyndtek Management API

Contrato obligatorio para todo sistema que Blyndtek desarrolle y opere desde Blyndtek OS.

## 0. Principio de aislamiento

Blyndtek OS nunca accede directamente a la base de datos, Storage, runtime ni infraestructura de un sistema cliente. Cada sistema es soberano y expone este contrato HTTP autenticado; el OS consume únicamente sus respuestas.

Esto limita el radio de impacto: comprometer el OS no entrega credenciales ni acceso directo a las bases de todos los clientes. El sistema cliente conserva la autoridad sobre sesión, RLS, datos de negocio y modo mantenimiento.

docs/SECURITY.md fue solicitado como fuente de entrada, pero no existe en el checkout actual. Este playbook no lo reemplaza ni inventa sus reglas.

## 1. Contrato general

- Base URL: URL pública del sistema cliente.
- Prefijo obligatorio: /api/blyndtek.
- Requests y respuestas: application/json.
- Autenticación: Authorization: Bearer <token>.
- El token es propio de cada instalación y se lee en runtime desde BLYNDTEK_MANAGEMENT_TOKEN.
- No se hardcodea, no se registra en logs y no se persiste en la base.
- Todo endpoint responde 401 si falta el header o el token no coincide.
- Todo endpoint aplica rate limiting por IP y, cuando sea posible, por token.
- La rotación cambia el secreto en el entorno seguro sin modificar el código.
- Las respuestas de status y metrics no incluyen negocio, PII, IDs internos, nombres de clientes, emails ni registros.

Estados: 200 éxito, 400 body inválido, 401 token inválido, 405 método no soportado, 429 rate limit y 500 error interno sin stack al caller.

## 2. Endpoints

### GET /api/blyndtek/status

    {
      "estado": "operativo",
      "version": "1.4.0",
      "db_ok": true,
      "uptime": 86400,
      "timestamp": "2026-08-06T15:00:00.000Z"
    }

estado es operativo, mantenimiento o degradado. uptime son segundos desde el inicio del proceso o cold start. timestamp es sólo observabilidad. No se devuelven datos de negocio.

### GET /api/blyndtek/metrics

    {
      "usuarios_activos_30d": 12,
      "ultimo_login": "2026-08-06T14:52:00.000Z",
      "operaciones_mes": 1840
    }

Son métricas agregadas y anónimas. Está prohibido devolver usuarios, empresas, operaciones individuales, montos, documentos o PII.

### POST /api/blyndtek/maintenance

    {
      "activo": true,
      "mensaje": "Estamos realizando una actualización breve."
    }

mensaje es opcional y tiene un límite de 280 caracteres. La respuesta devuelve activo, mensaje y updated_at. La operación sólo cambia el flag local y nunca elimina datos ni bloquea administradores.

### GET /api/blyndtek/maintenance

    {
      "activo": false,
      "mensaje": null,
      "updated_at": "2026-08-06T15:00:00.000Z"
    }

### POST /api/blyndtek/announce

    {
      "mensaje": "Nueva funcionalidad disponible.",
      "activo": true,
      "expira_at": "2026-08-20T23:59:59.000Z"
    }

Registra un anuncio que el sistema cliente muestra como banner. El OS no escribe la base cliente.

## 3. Modo mantenimiento del cliente

El sistema cliente persiste un flag único con activo, mensaje y updated_at. El layout server-side lo consulta antes de renderizar rutas privadas. Si está activo, usuarios no administradores reciben una pantalla de mantenimiento con la marca del cliente, el mensaje y ningún dato de negocio. Login, logout y administradores quedan exceptuados para poder desactivar el modo.

Migración mínima de referencia:

    create table if not exists public.blyndtek_management_state (
      id boolean primary key default true check (id = true),
      maintenance_active boolean not null default false,
      maintenance_message text,
      updated_at timestamptz not null default now()
    );

    create table if not exists public.blyndtek_management_announcements (
      id uuid primary key default gen_random_uuid(),
      message text not null check (char_length(message) between 1 and 280),
      active boolean not null default true,
      expires_at timestamptz,
      created_at timestamptz not null default now()
    );

    create table if not exists public.blyndtek_management_activity (
      id uuid primary key default gen_random_uuid(),
      user_id uuid,
      kind text not null check (kind in ('login', 'operation')),
      occurred_at timestamptz not null default now()
    );

Las tablas llevan RLS y no tienen policies públicas de escritura. El token no reemplaza las policies del producto.

## 4. Reporte de errores saliente

El cliente puede reportar errores server-side a un endpoint del OS, por ejemplo POST https://os.blyndtek.com/api/management/errors, con un token separado si es posible.

Payload permitido:

    {
      "sistema_id": "identificador-no-sensible",
      "mensaje": "Error al generar el reporte.",
      "stack": "Error: ...",
      "ruta": "/api/reportes",
      "timestamp": "2026-08-06T15:00:00.000Z"
    }

Truncar y redaccionar antes de enviar; remover query strings, IDs sensibles y headers. Usar timeout corto, reintentos limitados y fail-open: si el OS no responde, no se cae la operación original.

JAMÁS enviar PII, nombres, emails, teléfonos, mensajes, montos, documentos, tokens, cookies, Authorization, claves, connection strings, SQL completo, payloads de negocio ni secretos. El stack debe redaccionarse porque puede contener valores sensibles.

Referencia:

    export async function reportManagementError(input: {
      mensaje: string;
      stack?: string;
      ruta: string;
    }) {
      const endpoint = process.env.BLYNDTEK_OS_ERROR_URL;
      const token = process.env.BLYNDTEK_OS_ERROR_TOKEN;
      if (!endpoint || !token) return;
      const payload = {
        sistema_id: process.env.BLYNDTEK_SYSTEM_ID ?? "unknown",
        mensaje: redact(input.mensaje).slice(0, 500),
        stack: redact(input.stack ?? "").slice(0, 4000),
        ruta: redactPath(input.ruta),
        timestamp: new Date().toISOString()
      };
      try {
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(3000)
        });
      } catch {
        // El reporte nunca rompe la operación original.
      }
    }

redact y redactPath deben eliminar emails, teléfonos, UUIDs de negocio, tokens, query strings, cookies y valores conocidos del dominio.

## 5. Implementación de referencia Next.js + Supabase

### lib/management/auth.ts

    import { timingSafeEqual } from "node:crypto";
    import type { NextRequest } from "next/server";

    export function hasManagementToken(request: NextRequest) {
      const configured = process.env.BLYNDTEK_MANAGEMENT_TOKEN;
      const authorization = request.headers.get("authorization");
      if (!configured || !authorization?.startsWith("Bearer ")) return false;
      const received = authorization.slice("Bearer ".length);
      const expected = Buffer.from(configured);
      const actual = Buffer.from(received);
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    }

    export function getClientIp(request: NextRequest) {
      return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? request.headers.get("x-real-ip") ?? "unknown";
    }

### lib/management/rateLimit.ts

    type Bucket = { startedAt: number; count: number };
    const buckets = new Map<string, Bucket>();
    const WINDOW_MS = 60_000;
    const MAX_REQUESTS = 60;

    export function checkManagementRateLimit(key: string) {
      const now = Date.now();
      const current = buckets.get(key);
      if (!current || now - current.startedAt >= WINDOW_MS) {
        buckets.set(key, { startedAt: now, count: 1 });
        return { allowed: true, retryAfter: 0 };
      }
      current.count += 1;
      if (current.count > MAX_REQUESTS) {
        return {
          allowed: false,
          retryAfter: Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000)
        };
      }
      return { allowed: true, retryAfter: 0 };
    }

El bucket en memoria es por instancia serverless. En producción multi-instancia se reemplaza por Redis/Upstash o el rate limiter corporativo sin cambiar el contrato.

### lib/management/guard.ts

    import { NextRequest, NextResponse } from "next/server";
    import { getClientIp, hasManagementToken } from "./auth";
    import { checkManagementRateLimit } from "./rateLimit";

    export function managementGuard(request: NextRequest) {
      if (!hasManagementToken(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const result = checkManagementRateLimit(getClientIp(request));
      if (!result.allowed) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
        );
      }
      return null;
    }

### app/api/blyndtek/status/route.ts

    import { NextRequest, NextResponse } from "next/server";
    import { createAdminClient } from "@/lib/supabase/admin";
    import { managementGuard } from "@/lib/management/guard";

    const processStartedAt = Date.now();

    export async function GET(request: NextRequest) {
      const denied = managementGuard(request);
      if (denied) return denied;
      let dbOk = false;
      try {
        const { error } = await createAdminClient()
          .from("blyndtek_management_state")
          .select("id")
          .eq("id", true)
          .maybeSingle();
        dbOk = !error;
      } catch {
        dbOk = false;
      }
      return NextResponse.json({
        estado: dbOk ? "operativo" : "degradado",
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
        db_ok: dbOk,
        uptime: Math.floor((Date.now() - processStartedAt) / 1000),
        timestamp: new Date().toISOString()
      });
    }

### app/api/blyndtek/metrics/route.ts

    import { NextRequest, NextResponse } from "next/server";
    import { createAdminClient } from "@/lib/supabase/admin";
    import { managementGuard } from "@/lib/management/guard";

    export async function GET(request: NextRequest) {
      const denied = managementGuard(request);
      if (denied) return denied;
      const supabase = createAdminClient();
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const [{ data: active }, { data: lastLogin }, { count }] = await Promise.all([
        supabase.from("blyndtek_management_activity")
          .select("user_id").eq("kind", "login").gte("occurred_at", since),
        supabase.from("blyndtek_management_activity")
          .select("occurred_at").eq("kind", "login")
          .order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("blyndtek_management_activity")
          .select("id", { count: "exact", head: true })
          .eq("kind", "operation").gte("occurred_at", monthStart.toISOString())
      ]);
      return NextResponse.json({
        usuarios_activos_30d: new Set((active ?? []).map((row) => row.user_id).filter(Boolean)).size,
        ultimo_login: lastLogin?.occurred_at ?? null,
        operaciones_mes: count ?? 0
      });
    }

El endpoint de metrics sólo cuenta filas y timestamps agregados; no selecciona nombres, emails o registros de negocio.

### app/api/blyndtek/maintenance/route.ts

    import { NextRequest, NextResponse } from "next/server";
    import { createAdminClient } from "@/lib/supabase/admin";
    import { managementGuard } from "@/lib/management/guard";

    export async function GET(request: NextRequest) {
      const denied = managementGuard(request);
      if (denied) return denied;
      const { data, error } = await createAdminClient()
        .from("blyndtek_management_state")
        .select("maintenance_active, maintenance_message, updated_at")
        .eq("id", true)
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        activo: data.maintenance_active,
        mensaje: data.maintenance_message,
        updated_at: data.updated_at
      });
    }

    export async function POST(request: NextRequest) {
      const denied = managementGuard(request);
      if (denied) return denied;
      const body = (await request.json()) as { activo?: boolean; mensaje?: string | null };
      if (typeof body.activo !== "boolean") {
        return NextResponse.json({ error: "activo debe ser booleano" }, { status: 400 });
      }
      const mensaje = body.mensaje?.trim() || null;
      if (mensaje && mensaje.length > 280) {
        return NextResponse.json({ error: "mensaje demasiado largo" }, { status: 400 });
      }
      const { data, error } = await createAdminClient()
        .from("blyndtek_management_state")
        .upsert({
          id: true,
          maintenance_active: body.activo,
          maintenance_message: mensaje,
          updated_at: new Date().toISOString()
        })
        .select("maintenance_active, maintenance_message, updated_at")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        activo: data.maintenance_active,
        mensaje: data.maintenance_message,
        updated_at: data.updated_at
      });
    }

### app/api/blyndtek/announce/route.ts

    import { NextRequest, NextResponse } from "next/server";
    import { createAdminClient } from "@/lib/supabase/admin";
    import { managementGuard } from "@/lib/management/guard";

    export async function POST(request: NextRequest) {
      const denied = managementGuard(request);
      if (denied) return denied;
      const body = (await request.json()) as {
        mensaje?: string;
        activo?: boolean;
        expira_at?: string | null;
      };
      const mensaje = body.mensaje?.trim() ?? "";
      if (!mensaje || mensaje.length > 280) {
        return NextResponse.json({ error: "mensaje inválido" }, { status: 400 });
      }
      const { data, error } = await createAdminClient()
        .from("blyndtek_management_announcements")
        .insert({
          message: mensaje,
          active: body.activo ?? true,
          expires_at: body.expira_at ?? null
        })
        .select("id, message, active, expires_at")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        id: data.id,
        mensaje: data.message,
        activo: data.active,
        expira_at: data.expires_at
      }, { status: 201 });
    }

Todo proyecto que copie esta referencia debe incluir los imports completos del guard y createAdminClient, validar fecha de expiración con un parser de fecha/hora permitido, y agregar manejo explícito de JSON inválido. El token nunca aparece en respuestas.

## 6. Checklist de integración

### Proyecto nuevo

1. Crear tablas de management y policies RLS en una migración del cliente.
2. Copiar auth.ts, rateLimit.ts, guard.ts y los Route Handlers.
3. Configurar BLYNDTEK_MANAGEMENT_TOKEN como secreto de runtime.
4. Configurar NEXT_PUBLIC_APP_VERSION y un identificador no sensible.
5. Registrar login y operación agregada sin guardar payloads de negocio.
6. Integrar el flag en layout server y crear la pantalla de mantenimiento con marca del cliente.
7. Integrar el banner y la expiración de anuncios.
8. Agregar reportManagementError con redacción, timeout y token separado.
9. Probar status, metrics, GET/POST maintenance, announce, 401, 429 y body inválido.
10. Verificar que ningún endpoint devuelva PII o negocio.
11. Ejecutar lint, build y requests reales; documentar URL, versión y fecha de verificación.

### Proyecto existente

1. Auditar auth, RLS, layout, middleware/proxy, usuarios y anuncios.
2. No conectar OS a la base cliente; agregar sólo el contrato HTTP.
3. Crear tablas estándar o adaptar una tabla local con la misma semántica.
4. Auditar que metrics sea agregado y no filtre PII.
5. Integrar mantenimiento con excepción admin.
6. Reemplazar endpoints ad-hoc por el prefijo canónico sin romper compatibilidad.
7. Configurar y probar rotación de token.
8. Añadir rate limit distribuido si hay múltiples instancias.
9. Añadir reporte redaccionado y confirmar que una caída del OS no rompe al cliente.
10. Ejecutar lint, build, requests reales y revisión de seguridad.
11. Registrar endpoints, métricas permitidas, rate limit y verificación.

## 7. Criterios de aceptación

- Sin token, los endpoints responden 401.
- Status refleja conectividad mínima de base sin negocio ni PII.
- Metrics devuelve sólo los tres agregados definidos.
- Maintenance persiste, muestra pantalla, conserva acceso admin y permite desactivar.
- Announce aparece como banner y expira.
- Rate limit devuelve 429 sin romper el sistema cliente.
- Error reporting no incluye PII, credenciales, tokens ni negocio.
- Blyndtek OS opera exclusivamente por HTTP autenticado.
- Se actualizan PROGRESS, DECISIONS y la documentación del cliente.
