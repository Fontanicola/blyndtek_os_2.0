import type { ReactNode } from "react";
import type { NavegacionSeccionKey } from "@/types/navegacion";

export type NavItem = {
  label: string;
  href?: string;
  icon: ReactNode;
  roles: ("admin" | "miembro" | "comercial" | "marketing")[];
  section: "top-level" | "comercial" | "entrega" | "control";
  children?: NavItem[];
  iconClassName?: string;
  exact?: boolean;
  focusKey?: NavegacionSeccionKey;
};
