import type { ReactNode } from "react";

export type NavItem = {
  label: string;
  href?: string;
  icon: ReactNode;
  roles: ("admin" | "miembro" | "comercial")[];
  section: "top-level" | "comercial" | "entrega" | "control";
  children?: NavItem[];
};
