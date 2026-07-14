import { createElement } from "react";
import {
  CalendarioIcon,
  ClientesIcon,
  CotizadorIcon,
  DashboardIcon,
  ArchivosIcon,
  FinanzasIcon,
  SaasIcon,
  OutboundIcon,
  NotasIcon,
  WikiIcon,
  ProyectosIcon,
  TareasIcon
} from "@/components/icons";
import type { NavItem } from "@/types/navigation";

export const navigationItems: NavItem[] = [
  {
    label: "Mi panel",
    href: "/mi-panel",
    icon: createElement(DashboardIcon),
    roles: ["comercial"],
    section: "top-level"
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: createElement(DashboardIcon),
    roles: ["admin"],
    section: "top-level"
  },
  {
    label: "Leads",
    href: "/leads",
    icon: createElement(OutboundIcon),
    roles: ["admin", "comercial"],
    section: "comercial"
  },
  {
    label: "Cotizador",
    href: "/cotizador",
    icon: createElement(CotizadorIcon),
    roles: ["admin", "comercial"],
    section: "comercial"
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: createElement(ClientesIcon),
    roles: ["admin", "comercial"],
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
    roles: ["admin", "miembro", "comercial"],
    section: "entrega"
  },
  {
    label: "Calendario",
    href: "/calendario",
    icon: createElement(CalendarioIcon),
    roles: ["admin", "miembro", "comercial"],
    section: "entrega"
  },
  {
    label: "Notas",
    href: "/notas",
    icon: createElement(NotasIcon),
    roles: ["admin", "miembro", "comercial"],
    section: "entrega"
  },
  {
    label: "Wiki",
    href: "/wiki",
    icon: createElement(WikiIcon),
    roles: ["admin", "miembro", "comercial"],
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
    label: "Archivos",
    href: "/archivos",
    icon: createElement(ArchivosIcon),
    roles: ["admin", "comercial"],
    section: "control"
  },
  {
    label: "SaaS",
    href: "/saas",
    icon: createElement(SaasIcon),
    roles: ["admin"],
    section: "control"
  },
  {
    label: "Equipo comercial",
    href: "/equipo-comercial",
    icon: createElement(OutboundIcon),
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
  if (pathname === "/perfil") {
    return "Perfil";
  }

  return navigationItems.find((item) => item.href === pathname)?.label ?? "Blyndtek OS";
}
