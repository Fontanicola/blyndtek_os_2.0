"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { getNavigationTrail, type NavigationTrailItem } from "@/lib/navigation";

const financeTabs: Record<string, string> = {
  resumen: "Resumen",
  cobros: "Ingresos",
  egresos: "Egresos",
  presupuesto: "Presupuesto",
  suscripciones: "Suscripciones",
  comisiones: "Comisiones",
  tesoreria: "Tesorería",
  "runway-lab": "Runway Lab",
  tarjetas: "Tarjetas",
  asesor: "Asesor"
};

const clientTabs: Record<string, string> = {
  contrato: "Contrato",
  proyectos: "Proyectos",
  cobros: "Ingresos",
  financiero: "Finanzas",
  suscripcion: "Suscripción",
  soporte: "Soporte",
  historial: "Historial"
};

type EntityResponse = {
  data?: {
    empresa?: string;
    nombre?: string;
  };
};

export function Breadcrumb() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const currentSearchParams = useMemo(() => searchParams ?? new URLSearchParams(), [searchParams]);
  const [entityLabels, setEntityLabels] = useState<Record<string, string>>({});
  const trail = useMemo(() => getNavigationTrail(pathname), [pathname]);

  const contextIds = useMemo(
    () => ({
      cliente: currentSearchParams.get("cliente_id"),
      proyecto: currentSearchParams.get("project_id"),
      lead: currentSearchParams.get("lead_id")
    }),
    [currentSearchParams]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEntityLabels() {
      const requests = Object.entries(contextIds).filter(([, id]) => Boolean(id));
      if (requests.length === 0) {
        setEntityLabels({});
        return;
      }

      const responses = await Promise.all(
        requests.map(async ([kind, id]) => {
          try {
            const endpoint = kind === "cliente" ? "clientes" : kind === "proyecto" ? "proyectos" : "leads";
            const response = await fetch(`/api/${endpoint}/${id}`);
            if (!response.ok) {
              return [kind, id ?? ""] as const;
            }

            const payload = (await response.json()) as EntityResponse;
            return [kind, payload.data?.empresa ?? payload.data?.nombre ?? id ?? ""] as const;
          } catch {
            return [kind, id ?? ""] as const;
          }
        })
      );

      if (!cancelled) {
        setEntityLabels(Object.fromEntries(responses));
      }
    }

    void loadEntityLabels();
    return () => {
      cancelled = true;
    };
  }, [contextIds]);

  const contextTrail = useMemo<NavigationTrailItem[]>(() => {
    const next = [...trail];
    const clientName = entityLabels.cliente;
    const projectName = entityLabels.proyecto;
    const leadName = entityLabels.lead;

    if (pathname === "/clientes" && clientName) {
      next.push({ label: clientName, href: `/clientes?cliente_id=${contextIds.cliente}` });
      const clientTab = currentSearchParams.get("tab");
      const clientTabLabel = clientTab ? clientTabs[clientTab] : undefined;
      if (clientTabLabel) {
        next.push({ label: clientTabLabel });
      }
    }

    if (pathname === "/proyectos" && projectName) {
      next.push({ label: projectName, href: `/proyectos?project_id=${contextIds.proyecto}` });
      if (currentSearchParams.get("view") === "features") {
        next.push({ label: "Features" });
      }
    }

    if (pathname === "/leads" && leadName) {
      next.push({ label: leadName });
    }

    if (pathname === "/finanzas") {
      const tab = currentSearchParams.get("tab");
      const tabLabel = tab ? financeTabs[tab] : undefined;
      if (tabLabel && tab !== "resumen") {
        next.push({ label: tabLabel });
      }
    }

    return next;
  }, [contextIds.cliente, contextIds.proyecto, entityLabels.cliente, entityLabels.lead, entityLabels.proyecto, currentSearchParams, pathname, trail]);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {contextTrail.map((item, index) => {
          const isCurrent = index === contextTrail.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <ChevronRightIcon className="h-4 w-4 shrink-0 text-graphite" aria-hidden="true" /> : null}
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="truncate text-signal underline decoration-signal/40 underline-offset-2 transition-colors duration-fast ease-fast hover:text-signal-hover hover:decoration-signal"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn("truncate", isCurrent ? "font-label text-carbon" : "text-graphite")} aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
