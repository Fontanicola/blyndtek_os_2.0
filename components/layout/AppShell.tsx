"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, Topbar } from "@/components/layout";
import { QuickTaskButton } from "@/components/layout/QuickTaskButton";
import type { TaskProjectOption, TaskUserOption } from "@/lib/task-support";
import type { Usuario } from "@/types/auth";

type AppShellProps = {
  children: ReactNode;
  usuario: Usuario | null;
  taskProjects: TaskProjectOption[];
  taskUsers: TaskUserOption[];
};

export function AppShell({ children, usuario, taskProjects, taskUsers }: AppShellProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar usuario={usuario} />
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

      <QuickTaskButton usuario={usuario} proyectos={taskProjects} usuarios={taskUsers} />
    </div>
  );
}
