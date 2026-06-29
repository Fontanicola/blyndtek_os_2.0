import type { ReactNode } from "react";

export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  roles: ("admin" | "miembro")[];
  section: "comercial" | "entrega" | "control";
};
