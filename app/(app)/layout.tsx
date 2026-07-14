import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout";
import { getCurrentUser } from "@/lib/auth";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  return <AppShell usuario={usuario}>{children}</AppShell>;
}
