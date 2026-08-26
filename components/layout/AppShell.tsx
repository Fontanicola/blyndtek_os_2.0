"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, Subheader, Topbar } from "@/components/layout";
import type { Usuario } from "@/types/auth";

type AppShellProps = {
  children: ReactNode;
  usuario: Usuario | null;
};

export function AppShell({ children, usuario }: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar
        usuario={usuario}
        collapsed={!sidebarExpanded}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      />
      <Sidebar usuario={usuario} mobile isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <Subheader usuario={usuario} />

      <div className="relative z-0 flex min-w-0 flex-1 flex-col pt-0 pr-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-card border border-line-soft/80 bg-white shadow-[-10px_0_24px_rgba(11,14,20,0.05),0_10px_28px_rgba(11,14,20,0.045)]">
          <Topbar
            onMenuToggle={() => setIsOpen((previous) => !previous)}
            currentPath={pathname}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
