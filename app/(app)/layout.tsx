import type { ReactNode } from "react";
import { AppShell } from "@/components/layout";
import { getCurrentUser } from "@/lib/auth";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const usuario = await getCurrentUser();

  return <AppShell usuario={usuario}>{children}</AppShell>;
}
