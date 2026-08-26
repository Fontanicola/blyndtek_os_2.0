"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { navigationItems, navigationSections } from "@/lib/navigation";
import type { NavItem } from "@/types/navigation";
import type { NavegacionSeccionKey } from "@/types/navegacion";
import type { Usuario } from "@/types/auth";

type SubheaderProps = { usuario: Usuario | null };

function isActivePath(pathname: string, href?: string, exact = false) {
  if (!href) return false;
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function filterItems(items: NavItem[], role: Usuario["rol"] | null): NavItem[] {
  if (!role) return [];
  return items
    .filter((item) => item.roles.includes(role))
    .map((item) => ({ ...item, children: item.children ? filterItems(item.children, role) : undefined }))
    .filter((item) => Boolean(item.href) || Boolean(item.children?.length));
}

function activeContext(pathname: string, items: NavItem[], hidden: NavegacionSeccionKey[], focusActive: boolean) {
  const topLevel = items.find((item) => item.section === "top-level" && item.children?.length && (isActivePath(pathname, item.href, item.exact) || item.children.some((child) => child.children?.some((nested) => isActivePath(pathname, nested.href, nested.exact)) || isActivePath(pathname, child.href, child.exact))));
  if (topLevel) return { label: topLevel.label, icon: topLevel.icon, items: topLevel.children ?? [] };

  const section = navigationSections.find((candidate) => {
    if (focusActive && hidden.includes(candidate.key)) return false;
    return items.some((item) => item.section === candidate.key && isActivePath(pathname, item.href, item.exact));
  });
  if (!section) return null;
  return { label: section.label, icon: section.icon, items: items.filter((item) => item.section === section.key) };
}

function SubheaderItem({ item, pathname, depth = 0 }: { item: NavItem; pathname: string; depth?: number }) {
  const hasChildren = Boolean(item.children?.length);
  const active = isActivePath(pathname, item.href, item.exact) || item.children?.some((child) => isActivePath(pathname, child.href, child.exact) || child.children?.some((nested) => isActivePath(pathname, nested.href, nested.exact)));

  return (
    <div className={cn("space-y-1", depth > 0 && "ml-3")}> 
      {item.href ? (
        <Link href={item.href} className={cn("flex items-center gap-3 rounded-component px-3 py-2 text-sm font-label transition-colors duration-fast ease-fast", active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
          <span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">{item.icon}</span><span>{item.label}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-3 py-2 text-sm font-label text-white/55"><span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">{item.icon}</span><span>{item.label}</span></div>
      )}
      {hasChildren ? <div className="space-y-1 border-l border-white/15 pl-2">{item.children?.map((child) => <SubheaderItem key={child.href ?? child.label} item={child} pathname={pathname} depth={depth + 1} />)}</div> : null}
    </div>
  );
}

export function Subheader({ usuario }: SubheaderProps) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(true);
  const items = useMemo(() => filterItems(navigationItems, usuario?.rol ?? null), [usuario?.rol]);
  const context = activeContext(pathname, items, [], false);

  useEffect(() => {
    const stored = window.localStorage.getItem("blyndtek-subheader-open");
    if (stored !== null) setOpen(stored === "true");
  }, []);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      window.localStorage.setItem("blyndtek-subheader-open", String(next));
      return next;
    });
  }

  if (!context) return null;

  return (
    <aside className={cn("relative hidden h-screen shrink-0 overflow-visible bg-signal text-white shadow-[6px_0_18px_rgba(15,23,42,0.08)] transition-[width,opacity] duration-normal ease-normal md:block", open ? "w-60" : "w-0")} aria-label={`Subnavegación de ${context.label}`}>
      <div className={cn("h-full w-60 overflow-y-auto px-3 py-6 transition-transform duration-normal ease-normal", open ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0 pointer-events-none")}>
        <div className="mb-5 flex items-center gap-3 border-b border-white/15 px-3 pb-4"><span className="[&_svg]:h-5 [&_svg]:w-5">{context.icon}</span><span className="text-base font-label text-white">{context.label}</span></div>
        <nav className="space-y-1">{context.items.map((item) => <SubheaderItem key={item.href ?? item.label} item={item} pathname={pathname} />)}</nav>
      </div>
      <button type="button" onClick={toggle} aria-label={open ? "Cerrar subnavegación" : "Abrir subnavegación"} title={open ? "Cerrar subnavegación" : "Abrir subnavegación"} className={cn("absolute top-24 z-40 flex h-14 w-7 items-center justify-center rounded-r-component bg-signal text-white shadow-md transition-[right,left] duration-normal ease-normal hover:bg-signal-hover", open ? "-right-7" : "left-0")}>{open ? <ArrowLeftIcon size={16} /> : <ArrowRightIcon size={16} />}</button>
    </aside>
  );
}
