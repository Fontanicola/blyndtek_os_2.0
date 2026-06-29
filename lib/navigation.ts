import { createElement } from "react";
import {
  CalendarioIcon,
  ClientesIcon,
  CotizadorIcon,
  DashboardIcon,
  FinanzasIcon,
  InboundIcon,
  OutboundIcon,
  ProyectosIcon,
  TareasIcon
} from "@/components/icons";
import type { NavItem } from "@/types/navigation";

export const navigationItems: NavItem[] = [
  {
    label: "Outbound",
    href: "/outbound",
    icon: createElement(OutboundIcon),
    roles: ["admin"],
    section: "comercial"
  },
  {
    label: "Inbound",
    href: "/inbound",
    icon: createElement(InboundIcon),
    roles: ["admin"],
    section: "comercial"
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: createElement(ClientesIcon),
    roles: ["admin"],
    section: "comercial"
  },
  {
    label: "Cotizador",
    href: "/cotizador",
    icon: createElement(CotizadorIcon),
    roles: ["admin"],
    section: "comercial"
  },
  {
    label: "Proyectos",
    href: "/proyectos",
    icon: createElement(ProyectosIcon),
    roles: ["admin", "miembro"],
    section: "entrega"
  },
  {
    label: "Tareas",
    href: "/tareas",
    icon: createElement(TareasIcon),
    roles: ["admin", "miembro"],
    section: "entrega"
  },
  {
    label: "Calendario",
    href: "/calendario",
    icon: createElement(CalendarioIcon),
    roles: ["admin", "miembro"],
    section: "entrega"
  },
  {
    label: "Finanzas",
    href: "/finanzas",
    icon: createElement(FinanzasIcon),
    roles: ["admin"],
    section: "control"
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: createElement(DashboardIcon),
    roles: ["admin"],
    section: "control"
  }
];

export const navigationSections = [
  { key: "comercial", label: "Comercial" },
  { key: "entrega", label: "Entrega" },
  { key: "control", label: "Control" }
] as const;

export function getPageLabel(pathname: string) {
  return navigationItems.find((item) => item.href === pathname)?.label ?? "Blyndtek OS";
}
