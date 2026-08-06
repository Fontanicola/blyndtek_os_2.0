# Blyndtek OS — Convenciones de código

Documento canónico para escribir código indistinguible del existente. Sigue docs/STACK.md, docs/METHODOLOGY.md, la especificación funcional, la base real y el sistema visual.

## 1. Nomenclatura

- Base de datos: snake_case en tablas, columnas, constraints y valores persistidos.
- Componentes React: PascalCase, un componente por archivo.
- Funciones y variables TypeScript: camelCase.
- Tipos e interfaces: PascalCase.
- Rutas URL: kebab-case para segmentos estáticos; segmentos dinámicos usan [id] o [token].
- Named exports como convención; se evita export default en componentes, helpers y tipos.
- TypeScript estricto: sin any y sin casts innecesarios.

## 2. Estructura

| Carpeta | Responsabilidad |
| --- | --- |
| app/ | Páginas, layouts y Route Handlers del App Router. app/(app) agrupa pantallas autenticadas; app/api concentra la API. |
| components/ | Componentes React por dominio y componentes compartidos. components/ui contiene el design system. |
| lib/ | Lógica reutilizable, clientes Supabase, auth, hooks, cálculos, charts, parsers y helpers de dominio. |
| types/ | Tipos de dominio y contrato tipado de Supabase. |
| supabase/migrations/ | Cambios SQL secuenciales e idempotentes. supabase/functions/ contiene funciones desplegables. |
| public/ | Assets estáticos, logos y fuentes para Satori. |
| docs/ | Fuentes canónicas funcionales, técnicas, visuales, de seguridad y progreso. |

El código nuevo sigue la carpeta del dominio existente y reutiliza el helper o componente más cercano.

## 3. API Routes

Las Route Handlers validan, autorizan, consultan y devuelven un shape estable en servidor. El patrón real de app/api/cajas/route.ts es:

    import { NextRequest, NextResponse } from "next/server";
    import { getAdminUser } from "@/lib/require-admin";
    import { createAdminClient } from "@/lib/supabase/admin";

    export async function GET(request: NextRequest) {
      try {
        const admin = await getAdminUser();
        if (!admin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const supabase = createAdminClient();
        const { data, error } = await supabase
          .from("cajas")
          .select("*")
          .order("orden", { ascending: true });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

Reglas: autorización antes de consultar/mutar, service role sólo server-side, validación de body/enums/IDs/fechas/montos, éxito como data, errores como error con status útil y no exposición de secretos/JSON interno. En cascadas multi-tabla sin transacción REST se registran IDs y se hace rollback en orden inverso.

## 4. Hooks cliente

Los hooks browser consumen API routes con fetch. No consultan tablas Supabase directamente para módulos operativos admin. El ejemplo real es lib/hooks/useCajaMovimientos.ts:

    "use client";
    import { useCallback, useEffect, useState } from "react";

    export function useCajaMovimientos(cajaId: string | null, initialMonth?: string) {
      const [data, setData] = useState<CajaMovimientosPayload | null>(null);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      const fetchMovimientos = useCallback(async () => {
        if (!cajaId) return null;
        setLoading(true);
        setError(null);
        try {
          const response = await fetch("/api/cajas/" + cajaId + "/movimientos?...");
          const payload = (await response.json()) as ApiResponse<CajaMovimientosPayload>;
          if (!response.ok || !payload.data) {
            throw new Error(payload.error ?? "No se pudieron cargar los movimientos.");
          }
          setData(payload.data);
          return payload.data;
        } catch (fetchError) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los movimientos.");
          throw fetchError;
        } finally {
          setLoading(false);
        }
      }, [cajaId]);

      useEffect(() => {
        void fetchMovimientos().catch(() => undefined);
      }, [fetchMovimientos]);

      return { data, loading, error, fetchMovimientos };
    }

El hook real también expone mesAnterior, mesSiguiente, setRango y setTipo. Las selecciones conservan strings YYYY-MM.

## 5. Acceso a datos

lib/supabase/admin.ts exporta createAdminClient(), requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, desactiva persistencia de sesión y crea un cliente tipado. Se usa en Route Handlers y procesos internos después de autorizar.

lib/supabase/server.ts exporta el cliente SSR para sesión/cookies en Server Components y helpers compatibles. lib/auth.ts resuelve sesión y perfil, con acceso privilegiado limitado a la lectura interna necesaria.

lib/supabase/client.ts exporta createClient() con anon key para operaciones browser permitidas. Los hooks prefieren fetch("/api/...") para centralizar autorización, shape, compatibilidad de esquema y service role.

Nunca se importa createAdminClient en un archivo "use client" ni se envía SUPABASE_SERVICE_ROLE_KEY al cliente.

## 6. Migraciones

Las migraciones son secuenciales, idempotentes y reflejan el esquema real. supabase/migrations/019_preguntas_diagnostico_momento.sql muestra el patrón:

    alter table public.preguntas_diagnostico
      add column if not exists momento text;

    alter table public.preguntas_diagnostico
      alter column momento set default 'formulario';

    update public.preguntas_diagnostico
    set momento = 'formulario'
    where momento is null;

    alter table public.preguntas_diagnostico
      alter column momento set not null;

    do $$
    begin
      if not exists (
        select 1 from pg_constraint
        where conname = 'preguntas_diagnostico_momento_check'
      ) then
        alter table public.preguntas_diagnostico
          add constraint preguntas_diagnostico_momento_check
          check (momento in ('formulario', 'sesion'));
      end if;
    end
    $$;

Antes de crear una migración se verifica docs/DATABASE.md y el esquema real. Se preservan datos, se hace backfill antes de not null, se agregan FKs/checks/índices/policies RLS y se documenta la verificación posterior. No se modifican constraints destructivamente sin revisar policies dependientes.

## 7. Fechas, números y respuestas

- DATE se maneja como string YYYY-MM-DD de punta a punta. No usar new Date(string) ni toISOString() para persistencia.
- Usar lib/utils/fechas.ts para fechas sin hora.
- Montos, porcentajes, cuotas, saldos y precios se calculan en código; Claude no decide matemática financiera.
- La salida JSON de Claude se valida y normaliza antes de persistir; nunca se muestra JSON crudo.

## 8. React, carga y errores

- Un archivo por componente y named export.
- Reutilizar EmptyState, SavingIndicator, Modal, Card, Button, DataTable, Toolbar y RowActions antes de crear variantes locales.
- Declarar "use client" sólo cuando hay estado, efectos, eventos o APIs browser.
- Iconos sólo desde lucide-react y la centralización existente; no SVG dibujado a mano.
- Estados de carga, error y vacío explícitos; usar skeleton cuando la pantalla tiene estructura conocida.
- HTTP: 400 para input inválido, 401/403 para auth/permisos, 404 para inexistente y 500 para error inesperado.
- En cliente comprobar response.ok, leer error, limpiar loading en finally y evitar botones bloqueados después del error.
- Autosave con debounce, SavingIndicator y refresco tras persistir correctamente.
- Mutaciones reintentables idempotentes o deduplicadas por ID.

## 9. UI y cierre

Las pantallas nuevas siguen breadcrumb, tabs, toolbar, listado/tabla, empty state, skeleton equivalente y acciones. Se aplican docs/DESIGN_SYSTEM.md: fondo blanco, borde slate, rounded-md, acción #263a6d, densidad operativa, links subrayados, estados castellanos y sin mayúsculas.

Antes de cerrar: ejecutar npm run lint y npm run build; usar npx tsc --noEmit cuando corresponda; verificar el caso funcional real; revisar git diff --check; actualizar docs/PROGRESS.md y, si corresponde, DATABASE, DESIGN_SYSTEM o DECISIONS.

docs/SECURITY.md fue solicitado como entrada, pero no existe en el checkout actual. Debe crearse antes de tratarlo como fuente canónica de seguridad.
