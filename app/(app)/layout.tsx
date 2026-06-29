import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { getCurrentUser } from "@/lib/auth";
import { getTaskSupportData } from "@/lib/task-support";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const [usuario, supportData] = await Promise.all([getCurrentUser(), getTaskSupportData()]);

  return (
    <AppShell
      usuario={usuario}
      taskProjects={supportData.proyectos}
      taskUsers={supportData.usuarios}
    >
      {children}
    </AppShell>
  );
}
