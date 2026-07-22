import { createElement } from "react";
import {
  BotIcon,
  BarChartIcon,
  BrainIcon,
  BriefcaseIcon,
  CalendarioIcon,
  ClientesIcon,
  DashboardIcon,
  ArchivosIcon,
  FileTextIcon,
  FinanzasIcon,
  LayersIcon,
  MegaphoneIcon,
  OutboundIcon,
  SaasIcon,
  NotasIcon,
  WalletIcon,
  WikiIcon,
  ProyectosIcon,
  TareasIcon,
  ZapIcon
} from "@/components/ui/icons";
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
    label: "AI Hub",
    icon: createElement(DashboardIcon),
    iconClassName: "text-[#7C3AED]",
    roles: ["admin"],
    section: "top-level",
    children: [
      {
        label: "Centro IA",
        href: "/ai-hub",
        icon: createElement(DashboardIcon),
        roles: ["admin"],
        section: "top-level",
        exact: true
      },
      {
        label: "Agentes",
        href: "/ai-hub/agentes",
        icon: createElement(BrainIcon),
        roles: ["admin"],
        section: "top-level"
      },
      {
        label: "Workflows",
        href: "/ai-hub/automatizaciones",
        icon: createElement(ZapIcon),
        roles: ["admin"],
        section: "top-level"
      }
    ]
  },
  {
    label: "Leads",
    href: "/leads",
    icon: createElement(BotIcon),
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
    label: "Marketing",
    href: "/marketing",
    icon: createElement(BarChartIcon),
    roles: ["admin"],
    section: "comercial"
  },
  {
    label: "Contenido",
    href: "/contenido",
    icon: createElement(FileTextIcon),
    roles: ["admin"],
    section: "comercial"
  },
  {
    label: "Módulos",
    href: "/modulos-catalogo",
    icon: createElement(BriefcaseIcon),
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
  },
];

export const navigationSections = [
  { key: "comercial", label: "Comercial", icon: createElement(MegaphoneIcon) },
  { key: "entrega", label: "Entrega", icon: createElement(LayersIcon) },
  { key: "control", label: "Control", icon: createElement(WalletIcon) }
] as const;

export function getPageLabel(pathname: string) {
  if (pathname === "/perfil") {
    return "Perfil";
  }

  function findLabel(items: NavItem[]): string | null {
    for (const item of items) {
      if (item.href === pathname) {
        return item.label;
      }

      if (item.children) {
        const childLabel = findLabel(item.children);
        if (childLabel) {
          return childLabel;
        }
      }
    }

    return null;
  }

  return findLabel(navigationItems) ?? "Blyndtek OS";
}
