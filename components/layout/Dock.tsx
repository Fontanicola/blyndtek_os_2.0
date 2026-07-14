"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { navigationItems } from "@/lib/navigation";
import type { Usuario } from "@/types/auth";

type DockProps = {
  usuario: Usuario | null;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Dock({ usuario }: DockProps) {
  const pathname = usePathname() ?? "/";
  const visibleItems = useMemo(
    () => (usuario ? navigationItems.filter((item) => item.roles.includes(usuario.rol)) : []),
    [usuario]
  );

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      <div className="pointer-events-auto max-w-[calc(100vw-1rem)] overflow-x-auto">
        <nav className="flex items-end gap-1 rounded-[24px] border border-white/10 bg-carbon px-3 py-2 shadow-modal backdrop-blur-sm">
          {visibleItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex h-11 w-11 flex-none items-center justify-center rounded-[16px] outline-none transition-transform duration-fast ease-fast hover:scale-110 focus:scale-110"
                aria-label={item.label}
                title={item.label}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-fast ease-fast",
                    active ? "text-white" : "text-white/50"
                  )}
                >
                  {item.icon}
                </span>

                <span
                  className={cn(
                    "pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-component bg-carbon-soft px-2 py-1 text-xs text-white shadow-modal transition-all duration-fast ease-fast",
                    "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus:opacity-100 group-focus:translate-y-0"
                  )}
                >
                  {item.label}
                </span>

                {active ? <span className="absolute bottom-0 h-1 w-1 rounded-full bg-signal" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
