"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, Topbar } from "@/components/layout";
import type { Usuario } from "@/types/auth";

type AppShellProps = {
  children: ReactNode;
  usuario: Usuario | null;
};

export function AppShell({ children, usuario }: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar usuario={usuario} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((current) => !current)} />
      <Sidebar usuario={usuario} mobile isOpen={isOpen} onClose={() => setIsOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col pt-2 pr-0 md:pt-4 md:pr-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-card bg-white shadow-soft">
          <Topbar
            usuario={usuario}
            onMenuToggle={() => setIsOpen((previous) => !previous)}
            currentPath={pathname}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
